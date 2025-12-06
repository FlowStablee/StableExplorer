import mongoose from 'mongoose';
const StateSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  val: Number
});
export default mongoose.models.State || mongoose.model('State', StateSchema);