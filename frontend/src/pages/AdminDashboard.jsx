import { useState, useEffect } from 'react';
import { booksApi, ordersApi } from '../services/api';

const EMPTY_FORM = { name: '', price: '', stock: '', description: '' };

export default function AdminDashboard() {
  const [tab, setTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchData() {
    setLoading(true);
    try {
      const [bRes, oRes] = await Promise.all([booksApi.getAll(), ordersApi.getAll()]);
      setBooks(bRes.data);
      setOrders(oRes.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function flash(msg, isError = false) {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  }

  function startEdit(book) {
    setEditId(book.id);
    setForm({ name: book.name, price: book.price, stock: book.stock, description: book.description || '' });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (editId) {
        await booksApi.update(editId, data);
        flash('Book updated successfully');
      } else {
        await booksApi.create(data);
        flash('Book added successfully');
      }
      setEditId(null);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save book', true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await booksApi.delete(id);
      flash('Book deleted');
      fetchData();
    } catch {
      flash('Failed to delete book', true);
    }
  }

  if (loading) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <h1 className="page-title">Admin Dashboard</h1>
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'books' ? 'active' : ''}`} onClick={() => setTab('books')}>
          Books ({books.length})
        </button>
        <button className={`admin-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          Orders ({orders.length})
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {tab === 'books' && (
        <>
          <div className="panel">
            <h3>{editId ? 'Edit Book' : 'Add New Book'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Book Title</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Clean Code" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price ($)</label>
                  <input type="number" min="0" step="0.01" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="29.99" required />
                </div>
                <div className="form-group">
                  <label>Stock (qty)</label>
                  <input type="number" min="0" step="1" value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    placeholder="50" required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of this book..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Update Book' : 'Add Book'}
                </button>
                {editId && <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map(book => (
                  <tr key={book.id}>
                    <td><strong>{book.name}</strong></td>
                    <td>${Number(book.price).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${book.stock === 0 ? 'badge-red' : book.stock < 5 ? 'badge-yellow' : 'badge-green'}`}>
                        {book.stock}
                      </span>
                    </td>
                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {book.description || '—'}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(book)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(book.id, book.name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'orders' && (
        orders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <h3>No orders yet</h3>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <h4>Order #{order.id} — {order.user_email}</h4>
                  <div className="order-date">{new Date(order.created_at).toLocaleString()}</div>
                </div>
                <div className="order-total">${Number(order.total).toFixed(2)}</div>
              </div>
              <div className="order-items">
                {order.items.map(item => (
                  <div key={item.id} className="order-item">
                    <span>{item.book_name} × {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )
      )}
    </div>
  );
}
