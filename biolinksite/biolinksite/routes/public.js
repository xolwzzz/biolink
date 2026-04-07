const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const router = express.Router();

// Video streaming with range request support
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
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Static pages
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});
router.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'signup.html')));

// Per-user public API
router.get('/api/profile/:username', (req, res) => {
  const db = getDb();
  const user = db.getRow('SELECT id FROM users WHERE username = ?', [req.params.username]);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const profile = db.getRow('SELECT * FROM profile WHERE user_id = ?', [user.id]);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  try { profile.links = JSON.parse(profile.links || '[]'); } catch { profile.links = []; }
  res.json({
    display_name: profile.display_name,
    bio: profile.bio,
    font_family: profile.font_family,
    video_path: profile.video_path,
    links: profile.links,
    enter_text: profile.enter_text || 'click to enter',
  });
});

// Root — redirect to admin's username page
router.get('/', (req, res) => {
  const db = getDb();
  const admin = db.getRow('SELECT username FROM users WHERE is_admin = 1 LIMIT 1');
  if (admin) return res.redirect('/' + admin.username);
  res.sendFile(path.join(__dirname, '..', 'public', 'profile.html'));
});

// Per-user public page — must be last
router.get('/:username', (req, res) => {
  // Don't catch internal paths
  const reserved = ['login', 'signup', 'admin', 'auth', 'uploads', 'api'];
  if (reserved.includes(req.params.username)) return res.status(404).end();
  const db = getDb();
  const user = db.getRow('SELECT id FROM users WHERE username = ?', [req.params.username]);
  if (!user) return res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'), () => res.end());
  res.sendFile(path.join(__dirname, '..', 'public', 'profile.html'));
});

module.exports = router;
