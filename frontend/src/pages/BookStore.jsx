import { useState, useEffect } from 'react';
import BookCard from '../components/BookCard';
import BookModal from '../components/BookModal';
import { booksApi } from '../services/api';

export default function BookStore() {
  const [books, setBooks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchBooks() {
    try {
      const res = await booksApi.getAll();
      setBooks(res.data);
      setFiltered(res.data);
    } catch {
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBooks(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(books.filter(b => b.name.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)));
  }, [search, books]);

  function handlePurchased() {
    fetchBooks(); // refresh stock
  }

  if (loading) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="books-header">
        <div>
          <h1 className="page-title">Browse Books</h1>
          <p className="page-subtitle">{filtered.length} book{filtered.length !== 1 ? 's' : ''} available</p>
        </div>
        <input
          className="search-bar"
          placeholder="Search books..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No books found</h3>
          <p>Try adjusting your search</p>
        </div>
      ) : (
        <div className="books-grid">
          {filtered.map(book => (
            <BookCard key={book.id} book={book} onClick={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <BookModal
          book={selected}
          onClose={() => setSelected(null)}
          onPurchased={handlePurchased}
        />
      )}
    </div>
  );
}
