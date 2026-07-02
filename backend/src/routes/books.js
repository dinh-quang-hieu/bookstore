const express = require('express');
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public: list all books
router.get('/', (req, res) => {
  const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
  res.json(books);
});

// Public: get single book
router.get('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

// Admin: create book
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const { name, price, stock, description } = req.body;
  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: 'name, price, and stock are required' });
  }
  if (price < 0 || stock < 0) {
    return res.status(400).json({ error: 'price and stock must be non-negative' });
  }

  const result = db.prepare(
    'INSERT INTO books (name, price, stock, description) VALUES (?, ?, ?, ?)'
  ).run(name, Number(price), Number(stock), description || '');

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(book);
});

// Admin: update book
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, price, stock, description } = req.body;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  db.prepare(`
    UPDATE books SET
      name = ?, price = ?, stock = ?, description = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ?? book.name,
    price != null ? Number(price) : book.price,
    stock != null ? Number(stock) : book.stock,
    description ?? book.description,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id));
});

// Admin: delete book
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ message: 'Book deleted' });
});

module.exports = router;
