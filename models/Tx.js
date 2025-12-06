import mongoose from 'mongoose';

const TxSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  block: { type: Number, index: true },
  from: { type: String, required: true, index: true },
  to: { type: String, index: true },
  value: String,
  timestamp: Number,
  method: String,
  isNative: Boolean
});

// Composite Index for Speed
TxSchema.index({ from: 1, block: -1 });
TxSchema.index({ to: 1, block: -1 });

export default mongoose.models.Tx || mongoose.model('Tx', TxSchema);