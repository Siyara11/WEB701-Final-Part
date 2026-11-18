// models/User.js
// Mongoose schema for both user types: charity members (donors) and beneficiaries.
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },        // stored as a bcrypt hash, never plain text
  role: { type: String, enum: ['member', 'beneficiary'], default: 'beneficiary' },
  tokens: { type: Number, default: 0, min: 0 }        // token wallet (beneficiaries start with 10)
}, { timestamps: true });                             // adds createdAt / updatedAt

// Remove the password hash whenever a user is converted to JSON (e.g. sent in a response)
userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; delete ret.__v; return ret; }
});

module.exports = mongoose.model('User', userSchema);
