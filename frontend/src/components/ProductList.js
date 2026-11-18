// components/ProductList.js
// Shows all available products with a live search box (interactive element).
// Beneficiaries can acquire a token for an item; members can edit/delete their own items.
import React, { useState } from 'react';

function ProductList({ products, user, online, onAcquire, onEdit, onDelete }) {
  const [search, setSearch] = useState('');

  // Filter in the browser as the user types - works offline with cached data too
  const visible = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="list-header">
        <h2 className="section-title">
          Available donations <span className={online ? 'live-badge' : 'offline-badge'}>
            ● {online ? 'Live updates' : 'Offline copy'}</span>
        </h2>
        <input className="search" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="product-grid">
        {visible.length === 0 && <p>No products found.</p>}
        {visible.map(p => {
          const isOwner = user.role === 'member' && (p.member?._id || p.member) === user._id;
          const soldOut = p.quantity === 0;
          return (
            <div key={p._id} className={`card product-card ${soldOut ? 'sold-out' : ''}`}>
              <span className="tag">{p.type}</span>
              <h3>{p.name}</h3>
              {p.description && <p className="desc">{p.description}</p>}
              <p className="stock">Available: <strong>{p.quantity}</strong> · Cost: <strong>{p.tokensRequired}</strong> token(s)</p>
              <p className="donor">Donated by {p.member?.name || 'a member'}</p>

              {user.role === 'beneficiary' && (
                <button className="primary-btn" disabled={soldOut || !online || user.tokens < p.tokensRequired}
                  onClick={() => onAcquire(p)}>
                  {soldOut ? 'Out of stock' : user.tokens < p.tokensRequired ? 'Not enough tokens' : 'Acquire token'}
                </button>
              )}
              {isOwner && (
                <div className="form-actions">
                  <button className="secondary-btn" onClick={() => onEdit(p)} disabled={!online}>Edit</button>
                  <button className="danger-btn" onClick={() => onDelete(p)} disabled={!online}>Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default ProductList;
