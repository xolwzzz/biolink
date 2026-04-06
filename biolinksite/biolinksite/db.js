const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');

let db;

function getDb() {
  return db;
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.save = () => {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

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
    theme_color TEXT DEFAULT '#ffffff',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  db.save();

  db.getRow = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  };

  db.getAll = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  db.runSave = (sql, params = []) => {
    db.run(sql, params);
    db.save();
  };

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
