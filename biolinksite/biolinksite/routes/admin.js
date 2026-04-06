const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
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
    const allowed = ['.mp4', '.webm', '.ogg', '.mov'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Only video files are allowed.'));
  },
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

router.get('/profile', requireAuth, (req, res) => {
  const db = getDb();
  const profile = db.getRow('SELECT * FROM profile WHERE user_id = ?', [req.session.userId]);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  try { profile.links = JSON.parse(profile.links || '[]'); } catch { profile.links = []; }
  res.json({ profile, username: req.session.username });
});

router.post('/profile', requireAuth, (req, res) => {
  const { display_name, bio, font_family, links } = req.body;
  const allowed_fonts = [
    'Playfair Display','Cormorant Garamond','DM Serif Display','Bebas Neue',
    'Abril Fatface','Cinzel','Josefin Sans','Space Grotesk','Syne','Outfit',
    'Raleway','Caveat','Sacramento','Dancing Script','Pacifico'
  ];
  const safe_font = allowed_fonts.includes(font_family) ? font_family : 'Playfair Display';
  let linksStr;
  try { linksStr = JSON.stringify(Array.isArray(links) ? links : JSON.parse(links || '[]')); }
  catch { linksStr = '[]'; }

  const db = getDb();
  db.runSave(
    `UPDATE profile SET display_name=?, bio=?, font_family=?, links=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?`,
    [(display_name || '').slice(0,60), (bio || '').slice(0,300), safe_font, linksStr, req.session.userId]
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

module.exports = router;
