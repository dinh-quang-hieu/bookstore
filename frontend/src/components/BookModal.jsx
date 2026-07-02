import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../services/api';

export default function BookModal({ book, onClose, onPurchased }) {
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const stockClass = book.stock === 0 ? 'out' : book.stock < 5 ? 'low' : 'in';
  const stockText = book.stock === 0 ? 'Out of stock' : book.stock < 5 ? `Only ${book.stock} left!` : `${book.stock} in stock`;

  async function handleBuy() {
    setError('');
    setLoading(true);
    try {
      await ordersApi.place([{ bookId: book.id, quantity: qty }]);
      setSuccess(`Successfully purchased ${qty} copy${qty > 1 ? 'ies' : ''} of "${book.name}"!`);
      onPurchased();
    } catch (err) {
      setError(err.response?.data?.error || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>{book.name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-price">${Number(book.price).toFixed(2)}</div>
          <span className={`modal-stock ${stockClass}`}>{stockText}</span>

          {book.description && (
            <p className="modal-description">{book.description}</p>
          )}

          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          {!success && book.stock > 0 && (
            <>
              {user ? (
                <>
                  <div className="qty-row">
                    <span className="qty-label">Quantity:</span>
                    <input
                      type="number" className="qty-input" min={1} max={book.stock}
                      value={qty} onChange={e => setQty(Math.min(book.stock, Math.max(1, Number(e.target.value))))}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Total: <strong>${(book.price * qty).toFixed(2)}</strong>
                    </span>
                  </div>
                  <button className="btn btn-primary btn-full" onClick={handleBuy} disabled={loading}>
                    {loading ? 'Processing...' : `Buy Now — $${(book.price * qty).toFixed(2)}`}
                  </button>
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                  <a href="/login" style={{ color: 'var(--accent)' }}>Log in</a> to purchase this book
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
