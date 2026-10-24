import mongoose from 'mongoose';

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectMongo(uri: string | null): Promise<void> {
  if (!uri) {
    return;
  }

  mongoose.connection.on('error', () => {
    console.error('MongoDB connection error. Check Atlas availability and backend configuration.');
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });

  try {
    await mongoose.connect(uri);
    console.info('MongoDB connected.');
  } catch {
    console.error('Could not connect to MongoDB. The API will remain available with MongoDB disconnected.');
  }
}
