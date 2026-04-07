const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const router = express.Router();

// Video streaming
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
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': 'video/mp4' });
    file.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  }
});

router.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
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
    bg_color: profile.bg_color || '#0c0c0c',
    overlay_opacity: profile.overlay_opacity != null ? profile.overlay_opacity : 0.5,
    text_color: profile.text_color || '#ffffff',
    button_bg: profile.button_bg || 'rgba(255,255,255,0.07)',
    button_border: profile.button_border || 'rgba(255,255,255,0.1)',
    button_text_color: profile.button_text_color || '#ffffff',
    button_radius: profile.button_radius != null ? profile.button_radius : 10,
    show_avatar: profile.show_avatar === 1,
    avatar_emoji: profile.avatar_emoji || '✦',
    name_size: profile.name_size || 36,
    bio_size: profile.bio_size || 14,
  });
});

// Log a page view
router.post('/api/view/:username', (req, res) => {
  const db = getDb();
  const user = db.getRow('SELECT id FROM users WHERE username = ?', [req.params.username]);
  if (!user) return res.status(404).end();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = (req.headers['user-agent'] || '').slice(0, 200);
  const ref = (req.headers['referer'] || '').slice(0, 200);
  db.runSave('INSERT INTO page_views (user_id, ip, user_agent, referrer) VALUES (?, ?, ?, ?)', [user.id, ip, ua, ref]);
  res.json({ ok: true });
});

// Root → redirect to admin's page
router.get('/', (req, res) => {
  const db = getDb();
  const admin = db.getRow('SELECT username FROM users WHERE is_admin = 1 LIMIT 1');
  if (admin) return res.redirect('/' + admin.username);
  res.sendFile(path.join(__dirname, '..', 'public', 'profile.html'));
});

// Per-user page — must be last
const RESERVED = ['login', 'signup', 'admin', 'auth', 'uploads', 'api', 'dashboard'];
router.get('/:username', (req, res) => {
  if (RESERVED.includes(req.params.username)) return res.status(404).end();
  const db = getDb();
  const user = db.getRow('SELECT id FROM users WHERE username = ?', [req.params.username]);
  if (!user) return res.status(404).send('<h2 style="font-family:sans-serif;padding:40px">Page not found.</h2>');
  res.sendFile(path.join(__dirname, '..', 'public', 'profile.html'));
});

module.exports = router;
