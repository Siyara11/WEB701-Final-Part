// components/AuthForm.js
// Login and registration form (Requirement 1). One form switches between the two modes.
import React, { useState } from 'react';
import api, { errorText } from '../api';

function AuthForm({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'beneficiary' });
  const [message, setMessage] = useState('');

  // Generic change handler: updates the field whose "name" matches the input
  // Functional update (f => ...) always uses the latest state, so a value typed right after
  // the form is loaded cannot overwrite it with stale data (bug found during testing)
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        onLogin(res.data.token, res.data.user);   // App stores token + user
      } else {
        await api.post('/auth/register', form);
        setMessage('Registration successful - please log in.');
        setIsLogin(true);
        setForm({ ...form, password: '' });
      }
    } catch (err) {
      setMessage(errorText(err, 'Request failed'));
    }
  };

  return (
    <div className="auth-box">
      <h1>🌱 Nelson Community Harvest</h1>
      <h2>{isLogin ? 'Login to your account' : 'Create an account'}</h2>
      {message && <div className="notification">{message}</div>}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} required />
        )}
        <input name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password (min 6 characters)" minLength={6}
          value={form.password} onChange={handleChange} required />
        {!isLogin && (
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="beneficiary">Beneficiary (receives food / services)</option>
            <option value="member">Charity member (donates food / services)</option>
          </select>
        )}
        <button type="submit" className="primary-btn">{isLogin ? 'Login' : 'Register'}</button>
      </form>

      <p className="toggle-text">
        {isLogin ? "Don't have an account? " : 'Already registered? '}
        <span onClick={() => { setIsLogin(!isLogin); setMessage(''); }}>
          {isLogin ? 'Register here' : 'Login here'}
        </span>
      </p>
    </div>
  );
}

export default AuthForm;
