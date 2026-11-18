// routes/auth.js
// Requirement 1: members and beneficiaries can register, log in and administer their own accounts.
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();
const STARTING_TOKENS = 10; // tokens given to every new beneficiary

// Creates a signed JWT that carries the user's id and role (the "state" passed to the server)
function createToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
}

// POST /api/auth/register - create a new account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic server-side validation (never trust the browser alone)
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (role && !['member', 'beneficiary'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);           // hash with 10 salt rounds
    const user = await User.create({
      name, email, password: hashed, role,
      tokens: role === 'member' ? 0 : STARTING_TOKENS         // only beneficiaries get tokens
    });
    res.status(201).json({ message: 'Registered successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - check credentials and return a JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  // Same message for wrong email or password so attackers cannot discover valid emails
  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: createToken(user), user });
});

// GET /api/auth/me - return the logged-in user's profile (incl. token balance)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PUT /api/auth/me - update own name and/or password
router.put('/me', auth, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (name) user.name = name;

  if (newPassword) {
    // Must confirm the old password before a new one is accepted
    if (!(await bcrypt.compare(currentPassword || '', user.password))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    user.password = await bcrypt.hash(newPassword, 10);
  }

  await user.save();
  res.json({ message: 'Account updated', user });
});

// DELETE /api/auth/me - delete own account (a member's products are removed too)
router.delete('/me', auth, async (req, res) => {
  await Product.deleteMany({ member: req.user.id });
  await User.findByIdAndDelete(req.user.id);
  res.json({ message: 'Account deleted' });
});

module.exports = router;
