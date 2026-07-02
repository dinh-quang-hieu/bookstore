const express = require('express');
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Buyer: place an order
router.post('/', authMiddleware, (req, res) => {
  const { items } = req.body; // [{ bookId, quantity }]
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const placeOrder = db.transaction(() => {
    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(item.bookId);
      if (!book) throw Object.assign(new Error(`Book ${item.bookId} not found`), { status: 404 });
      if (book.stock < item.quantity) {
        throw Object.assign(new Error(`Not enough stock for "${book.name}" (available: ${book.stock})`), { status: 400 });
      }
      total += book.price * item.quantity;
      resolvedItems.push({ book, quantity: item.quantity });
    }

    const order = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(req.user.id, total);
    const insertItem = db.prepare('INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)');
    const updateStock = db.prepare('UPDATE books SET stock = stock - ? WHERE id = ?');

    for (const { book, quantity } of resolvedItems) {
      insertItem.run(order.lastInsertRowid, book.id, quantity, book.price);
      updateStock.run(quantity, book.id);
    }

    return db.prepare(`
      SELECT o.*, u.email as user_email FROM orders o
      JOIN users u ON u.id = o.user_id WHERE o.id = ?
    `).get(order.lastInsertRowid);
  });

  try {
    const order = placeOrder();
    res.status(201).json(order);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Buyer: get own orders; Admin: get all orders
router.get('/', authMiddleware, (req, res) => {
  let orders;
  if (req.user.role === 'admin') {
    orders = db.prepare(`
      SELECT o.*, u.email as user_email FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `).all();
  } else {
    orders = db.prepare(`
      SELECT o.*, u.email as user_email FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.user_id = ? ORDER BY o.created_at DESC
    `).all(req.user.id);
  }

  // Attach items to each order
  const getItems = db.prepare(`
    SELECT oi.*, b.name as book_name FROM order_items oi
    JOIN books b ON b.id = oi.book_id WHERE oi.order_id = ?
  `);
  const result = orders.map(o => ({ ...o, items: getItems.all(o.id) }));
  res.json(result);
});

module.exports = router;
