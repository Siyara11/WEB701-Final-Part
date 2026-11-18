// components/TransactionList.js
// Beneficiary view: their tokens with claim codes (and cancel option).
// Member view: tokens waiting to be accepted - the member types the code shown by the
// beneficiary and clicks Accept (Requirement 4: accept a token in a transaction).
import React, { useState } from 'react';

function TransactionList({ transactions, user, online, onAccept, onCancel }) {
  const [codes, setCodes] = useState({});   // code typed for each pending transaction

  if (transactions.length === 0) return <p className="card">No token transactions yet.</p>;

  return (
    <table className="tx-table">
      <thead>
        <tr>
          <th>Item</th>
          {user.role === 'member' && <th>Beneficiary</th>}
          <th>Tokens</th><th>Status</th><th>Date</th>
          <th>{user.role === 'member' ? 'Accept token' : 'Claim code'}</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map(tx => (
          <tr key={tx._id}>
            <td>{tx.productName}</td>
            {user.role === 'member' && <td>{tx.beneficiary?.name || '-'}</td>}
            <td>{tx.tokens}</td>
            <td><span className={`status ${tx.status}`}>{tx.status}</span></td>
            <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
            <td>
              {user.role === 'beneficiary' && (
                <>
                  <code className="claim-code">{tx.code}</code>
                  {tx.status === 'pending' && (
                    <button className="link-btn" disabled={!online} onClick={() => onCancel(tx)}>Cancel</button>
                  )}
                </>
              )}
              {user.role === 'member' && tx.status === 'pending' && (
                <form className="accept-form" onSubmit={e => { e.preventDefault(); onAccept(tx, codes[tx._id] || ''); }}>
                  <input placeholder="Code" maxLength={6} value={codes[tx._id] || ''}
                    onChange={e => setCodes({ ...codes, [tx._id]: e.target.value })} required />
                  <button className="action-btn" disabled={!online}>Accept</button>
                </form>
              )}
              {user.role === 'member' && tx.status !== 'pending' && '✔'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TransactionList;
