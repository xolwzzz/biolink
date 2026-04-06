const express = require('express');
const path = require('path');
const { getDb } = require('../db');
const router = express.Router();

router.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

router.get('/api/profile', (req, res) => {
  const db = getDb();
  const profile = db.getRow(`
    SELECT p.* FROM profile p
    JOIN users u ON u.id = p.user_id
    WHERE u.is_admin = 1 LIMIT 1
  `);
  if (!profile) return res.status(404).json({ error: 'No profile found.' });
  try { profile.links = JSON.parse(profile.links || '[]'); } catch { profile.links = []; }
  res.json({
    display_name: profile.display_name,
    bio: profile.bio,
    font_family: profile.font_family,
    video_path: profile.video_path,
    links: profile.links,
  });
});

router.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

router.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'signup.html')));

module.exports = router;
