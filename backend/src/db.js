const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'bookstore.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    );
  `);

  // Seed admin user if not exists
  const adminExists = db.prepare("SELECT id FROM users WHERE email = 'admin@bookstore.com'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, 'admin')").run('admin@bookstore.com', hash);
  }

  // Seed sample books if empty
  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get();
  if (bookCount.count === 0) {
    const insert = db.prepare('INSERT INTO books (name, price, stock, description) VALUES (?, ?, ?, ?)');
    const seedBooks = [
      ['Clean Code', 35.99, 50, 'A handbook of agile software craftsmanship by Robert C. Martin. Learn how to write code that is readable, maintainable, and elegant.'],
      ['The Pragmatic Programmer', 42.99, 30, 'From journeyman to master. A must-read for every serious developer covering best practices and career advice.'],
      ['Design Patterns', 49.99, 20, 'Elements of reusable object-oriented software. The classic Gang of Four book covering 23 design patterns.'],
      ['JavaScript: The Good Parts', 28.99, 45, 'Unearthing the excellence in JavaScript by Douglas Crockford. Focuses on the reliable and elegant subset of the language.'],
      ['You Don\'t Know JS', 39.99, 60, 'A deep dive series into the core mechanisms of the JavaScript language. Essential reading for serious JS developers.'],
    ];
    seedBooks.forEach(book => insert.run(...book));
  }
}

initDb();

module.exports = db;
