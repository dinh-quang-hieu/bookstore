import { useState, useEffect } from 'react';
import { ordersApi } from '../services/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ordersApi.getAll()
      .then(res => setOrders(res.data))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <h1 className="page-title">My Orders</h1>
      <p className="page-subtitle">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>

      {error && <div className="error-msg">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>No orders yet</h3>
          <p>Head to the store to buy your first book!</p>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <div>
                <h4>Order #{order.id}</h4>
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
      )}
    </div>
  );
}
