// routes/products.js
// Requirement 2 (part a): members register their products and services.
// Requirement 5: data is stored in and retrieved from MongoDB through this REST API.
const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Tells every connected browser to reload the product list (Socket.IO)
function broadcastStock(req) {
  const io = req.app.get('socketio');
  if (io) io.emit('stock_update');
}

// GET /api/products?search=bread - public list, newest first, optional name search
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
  const products = await Product.find(filter)
    .populate('member', 'name')          // include the donor's name, not just the id
    .sort({ createdAt: -1 });
  res.json(products);
});

// GET /api/products/mine - products owned by the logged-in member
router.get('/mine', auth, requireRole('member'), async (req, res) => {
  res.json(await Product.find({ member: req.user.id }).sort({ createdAt: -1 }));
});

// POST /api/products - member registers a new product or service
router.post('/', auth, requireRole('member'), async (req, res) => {
  const { name, description, type, quantity, tokensRequired } = req.body;
  if (!name || quantity === undefined) return res.status(400).json({ error: 'Name and quantity are required' });
  if (quantity < 0 || (tokensRequired !== undefined && tokensRequired < 1)) {
    return res.status(400).json({ error: 'Quantity must be 0 or more and tokens at least 1' });
  }
  try {
    const product = await Product.create({ name, description, type, quantity, tokensRequired, member: req.user.id });
    broadcastStock(req);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/products/:id - owner edits a product
router.put('/:id', auth, requireRole('member'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, member: req.user.id });
    if (!product) return res.status(404).json({ error: 'Product not found or not yours' });

    // Only copy fields that are allowed to change
    ['name', 'description', 'type', 'quantity', 'tokensRequired'].forEach(field => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });
    await product.save();               // schema validation (min values) runs here
    broadcastStock(req);
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/products/:id - owner removes a product
router.delete('/:id', auth, requireRole('member'), async (req, res) => {
  try {
    const result = await Product.findOneAndDelete({ _id: req.params.id, member: req.user.id });
    if (!result) return res.status(404).json({ error: 'Product not found or not yours' });
    broadcastStock(req);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
