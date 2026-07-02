const BOOK_EMOJIS = ['📘', '📗', '📙', '📕', '📒', '📓', '📔', '📖'];

function getEmoji(id) {
  return BOOK_EMOJIS[id % BOOK_EMOJIS.length];
}

export default function BookCard({ book, onClick }) {
  const stockClass = book.stock === 0 ? 'out' : book.stock < 5 ? 'low' : '';
  const stockText = book.stock === 0 ? 'Out of stock' : `${book.stock} in stock`;

  return (
    <div className="book-card" onClick={() => onClick(book)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(book)}>
      <div className="book-cover">
        <span>{getEmoji(book.id)}</span>
      </div>
      <div className="book-info">
        <div className="book-name">{book.name}</div>
        <div className="book-price">${Number(book.price).toFixed(2)}</div>
        <div className={`book-stock ${stockClass}`}>{stockText}</div>
        {book.description && (
          <div className="book-desc-short">{book.description}</div>
        )}
      </div>
    </div>
  );
}
