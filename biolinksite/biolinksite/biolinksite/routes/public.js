const express = require('express');
const path = require('path');
const db = require('../db');
const router = express.Router();

// Bio link public page (main page)
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Public profile data endpoint
router.get('/api/profile', (req, res) => {
  // Get the first admin user's profile (the site owner)
  const profile = db.prepare(`
    SELECT p.* FROM profile p
    JOIN users u ON u.id = p.user_id
    WHERE u.is_admin = 1
    LIMIT 1
  `).get();

  if (!profile) return res.status(404).json({ error: 'No profile found.' });

  try {
    profile.links = JSON.parse(profile.links || '[]');
  } catch { profile.links = []; }

  // Don't expose sensitive fields
  const safe = {
    display_name: profile.display_name,
    bio: profile.bio,
    font_family: profile.font_family,
    video_path: profile.video_path,
    avatar_path: profile.avatar_path,
    links: profile.links,
    theme_color: profile.theme_color,
  };

  res.json(safe);
});

router.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});

module.exports = router;
