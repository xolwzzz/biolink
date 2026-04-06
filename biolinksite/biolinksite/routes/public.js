const express = require('express');
const path = require('path');
const { getDb } = require('../db');
const router = express.Router();

router.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

router.get('/api/profile', (req, res) => {
  const db = getDb();
  const profile = db.getRow(`SELECT p.* FROM profile p JOIN users u ON u.id = p.user_id WHERE u.is_admin = 1 LIMIT 1`);
  if (!profile) return res.status(404).json({ error: 'No profile found.' });
  try { profile.links = JSON.parse(profile.links || '[]'); } catch { profile.links = []; }
  res.json({
    display_name: profile.display_name,
    bio: profile.bio,
    font_family: profile.font_family,
    video_path: profile.video_path,
    video_muted: profile.video_muted === 1,
    links: profile.links,
  });
});

router.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});
router.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'signup.html')));

module.exports = router;

// Video streaming with range request support — fixes slow start
const fs = require('fs');
const path = require('path');
router.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'public', 'uploads', path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).end();

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});
