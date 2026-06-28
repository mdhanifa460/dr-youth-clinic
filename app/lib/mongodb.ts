import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

// Global cache survives across serverless function invocations in the same process.
// Without this, every cold start creates a new TCP connection to MongoDB.
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const cached: Cache = (global as any).__mongoCache ?? { conn: null, promise: null };
(global as any).__mongoCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: 'clinicDB',
        bufferCommands: false,       // fail immediately if not connected — no silent queuing
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 0,              // don't hold idle connections in serverless
      })
      .catch((err) => {
        cached.promise = null;       // reset so the next request retries
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
