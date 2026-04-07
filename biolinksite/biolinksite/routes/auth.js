const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    const db = getDb();
    const user = db.getRow('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error.' });
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.is_admin === 1;
      res.json({ success: true, isAdmin: user.is_admin === 1, username: user.username });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3-20 characters.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const db = getDb();
    const existing = db.getRow('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing) return res.status(409).json({ error: 'Username already taken.' });

    const hash = await bcrypt.hash(password, 12);
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username.trim(), hash]);
    db.save();

    const user = db.getRow('SELECT id FROM users WHERE username = ?', [username.trim()]);
    db.run('INSERT INTO profile (user_id) VALUES (?)', [user.id]);
    db.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

module.exports = router;
