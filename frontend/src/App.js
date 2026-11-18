// App.js
// Main component: keeps the logged-in user, products and transactions in state,
// listens for real-time Socket.IO events, and shows the PWA offline / install status.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { errorText } from './api';
import socket from './socket';
import AuthForm from './components/AuthForm';
import ProductForm from './components/ProductForm';
import ProductList from './components/ProductList';
import TransactionList from './components/TransactionList';
import AccountSettings from './components/AccountSettings';
import './App.css';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('products');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);   // PWA: network status
  const [installPrompt, setInstallPrompt] = useState(null); // PWA: install event

  const toastTimer = useRef(null);

  // Show a message for 3.5 seconds (type = 'success' | 'error' | 'info').
  // The previous timer is cleared first; otherwise an old timer could hide a newer
  // message early (bug found while testing real-time notifications).
  const notify = useCallback((text, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ---- Data loading (REST API -> MongoDB) ----
  const loadProducts = useCallback(async () => {
    try { setProducts((await api.get('/products')).data); }
    catch (err) { console.error(err); }
  }, []);

  const loadMine = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const [me, tx] = await Promise.all([api.get('/auth/me'), api.get('/transactions/mine')]);
      setUser(me.data);                                   // refreshes token balance
      localStorage.setItem('user', JSON.stringify(me.data));
      setTransactions(tx.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404) logout(); // expired JWT
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadProducts(); loadMine(); }, [loadProducts, loadMine]);

  // ---- Real-time updates (Socket.IO / WebSockets) ----
  useEffect(() => {
    const onStock = () => { loadProducts(); loadMine(); };
    const onAccepted = data => {
      if (user && data.beneficiaryId === user._id) notify(`Your token for ${data.productName} was accepted`, 'info');
      loadMine();
    };
    const onClaim = data => {
      if (user && data.memberId === user._id) notify(`New token claimed for ${data.productName}`, 'info');
    };
    socket.on('stock_update', onStock);
    socket.on('token_accepted', onAccepted);
    socket.on('new_claim', onClaim);
    return () => {   // remove listeners when the component re-renders or unmounts
      socket.off('stock_update', onStock);
      socket.off('token_accepted', onAccepted);
      socket.off('new_claim', onClaim);
    };
  }, [user, loadProducts, loadMine, notify]);

  // ---- PWA: online/offline detection and "Install app" button ----
  useEffect(() => {
    const goOnline = () => { setOnline(true); loadProducts(); loadMine(); };
    const goOffline = () => setOnline(false);
    const beforeInstall = e => { e.preventDefault(); setInstallPrompt(e); }; // keep event for later
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
    };
  }, [loadProducts, loadMine]);

  const installApp = async () => {
    installPrompt.prompt();                 // shows the browser's install dialog
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  // ---- Auth handlers ----
  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    loadMine();
  };

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTransactions([]);
    setTab('products');
  }

  // ---- Product handlers (members) ----
  const saveProduct = async data => {
    try {
      if (editing) await api.put(`/products/${editing._id}`, data);
      else await api.post('/products', data);
      notify(editing ? 'Product updated' : 'Product added');
      setEditing(null);
      return true;
    } catch (err) { notify(errorText(err), 'error'); return false; }
  };

  const deleteProduct = async p => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try { await api.delete(`/products/${p._id}`); notify('Product deleted'); }
    catch (err) { notify(errorText(err), 'error'); }
  };

  // ---- Token handlers ----
  const acquireToken = async p => {
    try {
      const res = await api.post(`/transactions/acquire/${p._id}`);
      notify(`Token acquired! Your claim code is ${res.data.transaction.code}`);
      loadMine();
    } catch (err) { notify(errorText(err), 'error'); }
  };

  const acceptToken = async (tx, code) => {
    try { await api.post(`/transactions/accept/${tx._id}`, { code }); notify('Token accepted'); loadMine(); }
    catch (err) { notify(errorText(err), 'error'); }
  };

  const cancelToken = async tx => {
    try { await api.post(`/transactions/cancel/${tx._id}`); notify('Claim cancelled, tokens refunded'); loadMine(); }
    catch (err) { notify(errorText(err), 'error'); }
  };

  // ---- Render ----
  if (!user) return <div className="container"><AuthForm onLogin={handleLogin} /></div>;

  const pending = transactions.filter(t => t.status === 'pending').length;

  return (
    <div className="container">
      {!online && <div className="offline-bar">You are offline - showing the last saved data.</div>}

      <header className="dashboard-header">
        <div>
          <h1>🌱 Nelson Community Harvest</h1>
          <p>Kia ora, <strong>{user.name}</strong> ({user.role})</p>
        </div>
        <div className="header-right">
          {user.role === 'beneficiary' && <div className="wallet">🪙 {user.tokens} tokens</div>}
          {installPrompt && <button className="secondary-btn" onClick={installApp}>Install app</button>}
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Donations</button>
        <button className={tab === 'tokens' ? 'active' : ''} onClick={() => setTab('tokens')}>
          {user.role === 'member' ? 'Tokens to accept' : 'My tokens'} {pending > 0 && <span className="count">{pending}</span>}
        </button>
        <button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>Account</button>
      </nav>

      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}

      {tab === 'products' && (
        <>
          {user.role === 'member' && online &&
            <ProductForm editing={editing} onSave={saveProduct} onCancel={() => setEditing(null)} />}
          <ProductList products={products} user={user} online={online}
            onAcquire={acquireToken} onEdit={p => { setEditing(p); window.scrollTo(0, 0); }} onDelete={deleteProduct} />
        </>
      )}
      {tab === 'tokens' &&
        <TransactionList transactions={transactions} user={user} online={online} onAccept={acceptToken} onCancel={cancelToken} />}
      {tab === 'account' &&
        <AccountSettings user={user} notify={notify}
          onUpdated={u => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }} onDeleted={logout} />}
    </div>
  );
}

export default App;
