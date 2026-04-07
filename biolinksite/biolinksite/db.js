const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
let db;

function getDb() { return db; }

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.save = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    display_name TEXT DEFAULT 'Your Name',
    bio TEXT DEFAULT 'Welcome to my page',
    font_family TEXT DEFAULT 'Playfair Display',
    video_path TEXT,
    avatar_path TEXT,
    links TEXT DEFAULT '[]',
    enter_text TEXT DEFAULT 'click to enter',
    bg_color TEXT DEFAULT '#0c0c0c',
    overlay_opacity REAL DEFAULT 0.5,
    text_color TEXT DEFAULT '#ffffff',
    button_bg TEXT DEFAULT 'rgba(255,255,255,0.07)',
    button_border TEXT DEFAULT 'rgba(255,255,255,0.1)',
    button_text_color TEXT DEFAULT '#ffffff',
    button_radius INTEGER DEFAULT 10,
    show_avatar INTEGER DEFAULT 0,
    avatar_emoji TEXT DEFAULT 'E29CA6',
    name_size INTEGER DEFAULT 36,
    bio_size INTEGER DEFAULT 14,
    card_style TEXT DEFAULT 'none',
    content_position TEXT DEFAULT 'bottom',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip TEXT,
    user_agent TEXT,
    referrer TEXT
  );`);

  db.save();

  db.getRow = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; }
    stmt.free(); return null;
  };

  db.getAll = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free(); return rows;
  };

  db.runSave = (sql, params = []) => { db.run(sql, params); db.save(); };

  const migrations = [
    "ALTER TABLE profile ADD COLUMN video_muted INTEGER DEFAULT 0",
    "ALTER TABLE profile ADD COLUMN enter_text TEXT DEFAULT 'click to enter'",
    "ALTER TABLE profile ADD COLUMN bg_color TEXT DEFAULT '#0c0c0c'",
    "ALTER TABLE profile ADD COLUMN overlay_opacity REAL DEFAULT 0.5",
    "ALTER TABLE profile ADD COLUMN text_color TEXT DEFAULT '#ffffff'",
    "ALTER TABLE profile ADD COLUMN button_bg TEXT DEFAULT 'rgba(255,255,255,0.07)'",
    "ALTER TABLE profile ADD COLUMN button_border TEXT DEFAULT 'rgba(255,255,255,0.1)'",
    "ALTER TABLE profile ADD COLUMN button_text_color TEXT DEFAULT '#ffffff'",
    "ALTER TABLE profile ADD COLUMN button_radius INTEGER DEFAULT 10",
    "ALTER TABLE profile ADD COLUMN show_avatar INTEGER DEFAULT 0",
    "ALTER TABLE profile ADD COLUMN avatar_emoji TEXT DEFAULT '✦'",
    "ALTER TABLE profile ADD COLUMN name_size INTEGER DEFAULT 36",
    "ALTER TABLE profile ADD COLUMN bio_size INTEGER DEFAULT 14",
    "ALTER TABLE profile ADD COLUMN card_style TEXT DEFAULT 'none'",
    "ALTER TABLE profile ADD COLUMN content_position TEXT DEFAULT 'bottom'",
  ];
  for (const m of migrations) {
    try { db.run(m); db.save(); } catch(e) {}
  }

  const existing = db.getRow('SELECT id FROM users WHERE username = ?', ['9170']);
  if (!existing) {
    const hash = bcrypt.hashSync('lolripbozo1)', 12);
    db.run('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)', ['9170', hash, 1]);
    db.save();
    const user = db.getRow('SELECT id FROM users WHERE username = ?', ['9170']);
    db.run('INSERT INTO profile (user_id) VALUES (?)', [user.id]);
    db.save();
    console.log('Admin account created.');
  }

  console.log('Database ready.');
  return db;
}

module.exports = { getDb, initDb };
