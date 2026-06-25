const mongoose = require('mongoose');

const groupResultSchema = new mongoose.Schema({
  group: { type: String, required: true, unique: true },
  first: { type: String, required: true },
  second: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('GroupResult', groupResultSchema);
