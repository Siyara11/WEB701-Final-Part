// components/AccountSettings.js
// Users administer their own account: change name, change password or delete the account.
import React, { useState } from 'react';
import api, { errorText } from '../api';

function AccountSettings({ user, onUpdated, onDeleted, notify }) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSave = async e => {
    e.preventDefault();
    try {
      const res = await api.put('/auth/me', { name, currentPassword, newPassword: newPassword || undefined });
      onUpdated(res.data.user);
      setCurrentPassword(''); setNewPassword('');
      notify('Account updated');
    } catch (err) { notify(errorText(err), 'error'); }
  };

  const handleDelete = async () => {
    // window.confirm prevents an accidental click deleting the account
    if (!window.confirm('Delete your account permanently?')) return;
    try { await api.delete('/auth/me'); onDeleted(); }
    catch (err) { notify(errorText(err), 'error'); }
  };

  return (
    <div className="card account-card">
      <h3>My account</h3>
      <p>Email: <strong>{user.email}</strong> · Role: <strong>{user.role}</strong></p>
      <form onSubmit={handleSave} className="grid-form">
        <label>Name<input value={name} onChange={e => setName(e.target.value)} required /></label>
        <label>Current password<input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
        <label>New password<input type="password" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
        <div className="form-actions"><button className="primary-btn">Save</button></div>
      </form>
      <button className="danger-btn" onClick={handleDelete}>Delete my account</button>
    </div>
  );
}

export default AccountSettings;
