// models/Transaction.js
// Records every token exchange between a beneficiary and a member.
//   pending   -> beneficiary has spent tokens and received a claim code
//   accepted  -> member has accepted the token when the item was collected
//   cancelled -> beneficiary cancelled; tokens and stock were returned
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },     // copy kept in case product is deleted later
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokens: { type: Number, required: true },
  code: { type: String, required: true },             // 6-character claim code shown at pickup
  status: { type: String, enum: ['pending', 'accepted', 'cancelled'], default: 'pending' },
  acceptedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
