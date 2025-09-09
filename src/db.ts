import 'dotenv/config';
import mongoose from 'mongoose';

export async function connectDB() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL is not set in .env');
  try {
    await mongoose.connect(url);
    console.log('Mongo connected');
  } catch (err: any) {
    console.error('Failed to connect Mongo:', err?.message || err);
    throw err;
  }
}
