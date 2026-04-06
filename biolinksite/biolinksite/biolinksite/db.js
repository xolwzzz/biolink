const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    display_name TEXT DEFAULT 'Your Name',
    bio TEXT DEFAULT 'Welcome to my page ✨',
    font_family TEXT DEFAULT 'Playfair Display',
    video_path TEXT,
    avatar_path TEXT,
    links TEXT DEFAULT '[]',
    theme_color TEXT DEFAULT '#ffffff',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed admin account if not exists
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('9170');
if (!existing) {
  const hash = bcrypt.hashSync('lolripbozo1)', 12);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)'
  ).run('9170', hash);
  
  db.prepare(
    'INSERT INTO profile (user_id) VALUES (?)'
  ).run(result.lastInsertRowid);
  
  console.log('Admin account created.');
}

module.exports = db;
