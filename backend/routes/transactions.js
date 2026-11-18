// routes/transactions.js
// Requirement 2 (part b): beneficiaries use the system to acquire tokens for an item.
// Requirement 4: members accept a token in a transaction (JWT protected).
// Socket.IO events keep every open browser up to date in real time.
const express = require('express');
const crypto = require('crypto');
const Product = require('../models/Product');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Random 6-character claim code, e.g. "A3F9C1"
const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// Emits a WebSocket event if Socket.IO is running (it is not during tests)
function emit(req, event, data) {
  const io = req.app.get('socketio');
  if (io) io.emit(event, data);
}

// POST /api/transactions/acquire/:productId - beneficiary spends tokens on an item
router.post('/acquire/:productId', auth, requireRole('beneficiary'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const cost = product.tokensRequired;

    // Step 1: reserve one unit. The condition {quantity >= 1} inside the update makes this
    // atomic, so two people cannot take the last item at the same time.
    const reserved = await Product.findOneAndUpdate(
      { _id: product._id, quantity: { $gte: 1 } }, { $inc: { quantity: -1 } }, { new: true });
    if (!reserved) return res.status(400).json({ error: 'Out of stock' });

    // Step 2: deduct tokens only if the beneficiary has enough (also atomic)
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, tokens: { $gte: cost } }, { $inc: { tokens: -cost } }, { new: true });
    if (!user) {
      await Product.updateOne({ _id: product._id }, { $inc: { quantity: 1 } }); // undo step 1
      return res.status(400).json({ error: 'Not enough tokens' });
    }

    // Step 3: record the pending transaction with a claim code
    const tx = await Transaction.create({
      product: product._id, productName: product.name, beneficiary: user._id,
      member: product.member, tokens: cost, code: makeCode()
    });

    emit(req, 'stock_update');
    emit(req, 'new_claim', { memberId: String(product.member), productName: product.name });
    res.status(201).json({ message: 'Token acquired', transaction: tx, tokens: user.tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/mine - a beneficiary sees their claims; a member sees claims on their items
router.get('/mine', auth, async (req, res) => {
  const filter = req.user.role === 'member' ? { member: req.user.id } : { beneficiary: req.user.id };
  const list = await Transaction.find(filter).populate('beneficiary', 'name').sort({ createdAt: -1 });
  res.json(list);
});

// POST /api/transactions/accept/:id - member accepts the beneficiary's token at pickup
router.post('/accept/:id', auth, requireRole('member'), async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, member: req.user.id });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'pending') return res.status(400).json({ error: `Transaction already ${tx.status}` });

    // The beneficiary shows their code; it must match to prove they own the token
    if ((req.body.code || '').toUpperCase() !== tx.code) {
      return res.status(400).json({ error: 'Claim code does not match' });
    }

    tx.status = 'accepted';
    tx.acceptedAt = new Date();
    await tx.save();

    // Tell the beneficiary's browser that the token has been accepted
    emit(req, 'token_accepted', { beneficiaryId: String(tx.beneficiary), productName: tx.productName });
    res.json({ message: 'Token accepted', transaction: tx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/cancel/:id - beneficiary cancels a pending claim and is refunded
router.post('/cancel/:id', auth, requireRole('beneficiary'), async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, beneficiary: req.user.id, status: 'pending' });
    if (!tx) return res.status(404).json({ error: 'Pending transaction not found' });

    tx.status = 'cancelled';
    await tx.save();
    await User.updateOne({ _id: req.user.id }, { $inc: { tokens: tx.tokens } });   // refund tokens
    await Product.updateOne({ _id: tx.product }, { $inc: { quantity: 1 } });        // return stock

    emit(req, 'stock_update');
    res.json({ message: 'Claim cancelled and tokens refunded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
