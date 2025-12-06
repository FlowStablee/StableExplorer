import mongoose from 'mongoose';


const MONGODB_URI = "mongodb+srv://<USER>:<PASS>@cluster0.mongodb.net/flowstable?retryWrites=true&w=majority";

if (!MONGODB_URI) throw new Error('Please define MONGODB_URI');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;