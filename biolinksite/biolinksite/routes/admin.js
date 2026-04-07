const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `bg_${req.session.userId}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) return cb(null, true);
    cb(new Error('Only video files are allowed.'));
  },
});

router.get('/dashboard', requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'))
);

router.get('/profile', requireAuth, (req, res) => {
  const db = getDb();
  const profile = db.getRow('SELECT * FROM profile WHERE user_id = ?', [req.session.userId]);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  try { profile.links = JSON.parse(profile.links || '[]'); } catch { profile.links = []; }
  res.json({ profile, username: req.session.username, isAdmin: req.session.isAdmin === true });
});

router.post('/profile', requireAuth, (req, res) => {
  const {
    display_name, bio, font_family, links, enter_text,
    bg_color, overlay_opacity, text_color,
    button_bg, button_border, button_text_color, button_radius,
    show_avatar, avatar_emoji, name_size, bio_size,
    card_style, content_position,
  } = req.body;

  const allowed_fonts = ['Playfair Display','Cormorant Garamond','DM Serif Display','Bebas Neue','Abril Fatface','Cinzel','Josefin Sans','Outfit','Raleway','Caveat','Sacramento','Dancing Script','Pacifico','Inter'];
  const safe_font = allowed_fonts.includes(font_family) ? font_family : 'Playfair Display';
  const allowed_card_styles = ['none','glass','solid','outline','blur'];
  const safe_card = allowed_card_styles.includes(card_style) ? card_style : 'none';
  const allowed_positions = ['top','center','bottom'];
  const safe_pos = allowed_positions.includes(content_position) ? content_position : 'bottom';

  let linksStr;
  try { linksStr = JSON.stringify(Array.isArray(links) ? links : JSON.parse(links || '[]')); } catch { linksStr = '[]'; }

  const db = getDb();
  db.runSave(
    `UPDATE profile SET
      display_name=?, bio=?, font_family=?, links=?, enter_text=?,
      bg_color=?, overlay_opacity=?, text_color=?,
      button_bg=?, button_border=?, button_text_color=?, button_radius=?,
      show_avatar=?, avatar_emoji=?, name_size=?, bio_size=?,
      card_style=?, content_position=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE user_id=?`,
    [
      (display_name || '').slice(0, 60),
      (bio || '').slice(0, 300),
      safe_font,
      linksStr,
      (enter_text || 'click to enter').slice(0, 60),
      (bg_color || '#0c0c0c').slice(0, 20),
      Math.min(1, Math.max(0, parseFloat(overlay_opacity) || 0.5)),
      (text_color || '#ffffff').slice(0, 20),
      (button_bg || 'rgba(255,255,255,0.07)').slice(0, 50),
      (button_border || 'rgba(255,255,255,0.1)').slice(0, 50),
      (button_text_color || '#ffffff').slice(0, 20),
      Math.min(50, Math.max(0, parseInt(button_radius) || 10)),
      show_avatar ? 1 : 0,
      (avatar_emoji || '✦').slice(0, 10),
      Math.min(72, Math.max(16, parseInt(name_size) || 36)),
      Math.min(24, Math.max(10, parseInt(bio_size) || 14)),
      safe_card,
      safe_pos,
      req.session.userId,
    ]
  );
  res.json({ success: true });
});

router.post('/upload-video', requireAuth, (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const db = getDb();
    const old = db.getRow('SELECT video_path FROM profile WHERE user_id = ?', [req.session.userId]);
    if (old && old.video_path) {
      const oldPath = path.join(__dirname, '..', 'public', old.video_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const videoPath = `/uploads/${req.file.filename}`;
    db.runSave('UPDATE profile SET video_path=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?', [videoPath, req.session.userId]);
    res.json({ success: true, video_path: videoPath });
  });
});

router.delete('/video', requireAuth, (req, res) => {
  const db = getDb();
  const profile = db.getRow('SELECT video_path FROM profile WHERE user_id = ?', [req.session.userId]);
  if (profile && profile.video_path) {
    const filePath = path.join(__dirname, '..', 'public', profile.video_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.runSave('UPDATE profile SET video_path=NULL WHERE user_id=?', [req.session.userId]);
  res.json({ success: true });
});

router.get('/', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'superadmin.html'))
);

router.get('/api/users', requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.getAll(`
    SELECT u.id, u.username, u.is_admin, u.created_at,
      p.display_name, p.bio, p.video_path,
      (SELECT COUNT(*) FROM page_views WHERE user_id = u.id) as view_count,
      (SELECT visited_at FROM page_views WHERE user_id = u.id ORDER BY visited_at DESC LIMIT 1) as last_visit
    FROM users u
    LEFT JOIN profile p ON p.user_id = u.id
    ORDER BY u.created_at DESC
  `);
  res.json(users);
});

router.get('/api/visits', requireAdmin, (req, res) => {
  const db = getDb();
  const visits = db.getAll(`
    SELECT pv.*, u.username
    FROM page_views pv
    JOIN users u ON u.id = pv.user_id
    ORDER BY pv.visited_at DESC
    LIMIT 200
  `);
  res.json(visits);
});

router.delete('/api/users/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const user = db.getRow('SELECT id, is_admin FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.is_admin) return res.status(403).json({ error: 'Cannot delete admin.' });
  const profile = db.getRow('SELECT video_path FROM profile WHERE user_id = ?', [user.id]);
  if (profile && profile.video_path) {
    const fp = path.join(__dirname, '..', 'public', profile.video_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  db.runSave('DELETE FROM profile WHERE user_id = ?', [user.id]);
  db.runSave('DELETE FROM page_views WHERE user_id = ?', [user.id]);
  db.runSave('DELETE FROM users WHERE id = ?', [user.id]);
  res.json({ success: true });
});

module.exports = router;
