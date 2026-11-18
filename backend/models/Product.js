// models/Product.js
// A product or service registered by a charity member, e.g. "Bread" or "Haircut voucher".
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  type: { type: String, enum: ['product', 'service'], default: 'product' },
  quantity: { type: Number, required: true, min: 0 },        // units still available
  tokensRequired: { type: Number, default: 1, min: 1 },      // cost of one unit in tokens
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // owner
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
