const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Multer setup for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `bg_${req.session.userId}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.ogg', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only video files are allowed.'));
  },
});

// GET /admin/dashboard - serve dashboard HTML
router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// GET /admin/profile - get current profile data
router.get('/profile', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  
  try {
    profile.links = JSON.parse(profile.links || '[]');
  } catch { profile.links = []; }
  
  res.json({ profile, username: req.session.username });
});

// POST /admin/profile - update profile text/settings
router.post('/profile', requireAuth, (req, res) => {
  const { display_name, bio, font_family, links, theme_color } = req.body;
  
  let linksStr;
  try {
    linksStr = JSON.stringify(Array.isArray(links) ? links : JSON.parse(links || '[]'));
  } catch { linksStr = '[]'; }

  const allowed_fonts = [
    'Playfair Display', 'Cormorant Garamond', 'DM Serif Display',
    'Bebas Neue', 'Abril Fatface', 'Cinzel', 'Josefin Sans',
    'Space Grotesk', 'Syne', 'Outfit', 'Raleway', 'Caveat',
    'Sacramento', 'Dancing Script', 'Pacifico'
  ];

  const safe_font = allowed_fonts.includes(font_family) ? font_family : 'Playfair Display';

  db.prepare(`
    UPDATE profile SET
      display_name = ?,
      bio = ?,
      font_family = ?,
      links = ?,
      theme_color = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(
    (display_name || '').slice(0, 60),
    (bio || '').slice(0, 300),
    safe_font,
    linksStr,
    (theme_color || '#ffffff').slice(0, 20),
    req.session.userId
  );

  res.json({ success: true });
});

// POST /admin/upload-video
router.post('/upload-video', requireAuth, (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Delete old video
    const old = db.prepare('SELECT video_path FROM profile WHERE user_id = ?').get(req.session.userId);
    if (old && old.video_path) {
      const oldPath = path.join(__dirname, '..', 'public', old.video_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const videoPath = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE profile SET video_path = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .run(videoPath, req.session.userId);

    res.json({ success: true, video_path: videoPath });
  });
});

// DELETE /admin/video
router.delete('/video', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT video_path FROM profile WHERE user_id = ?').get(req.session.userId);
  if (profile && profile.video_path) {
    const filePath = path.join(__dirname, '..', 'public', profile.video_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('UPDATE profile SET video_path = NULL WHERE user_id = ?').run(req.session.userId);
  res.json({ success: true });
});

module.exports = router;
