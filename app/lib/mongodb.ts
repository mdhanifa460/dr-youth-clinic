import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'clinicDB';

// Global cache survives across serverless function invocations in the same process.
// Without this, every cold start creates a new TCP connection to MongoDB.
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const cached: Cache = (global as any).__mongoCache ?? { conn: null, promise: null };
(global as any).__mongoCache = cached;

// Vercel builds have repeatedly failed this session with
// MongoPoolClearedError/MongoNetworkTimeoutError during static generation —
// a burst of concurrent connectDB() calls across ~400 pages, each sharing
// one pool, occasionally hits a transient heartbeat blip against Atlas's
// free-tier (shared, throttled) infrastructure, which clears the whole
// pool and fails every in-flight query at that instant. Runtime requests
// want to fail fast (a slow query should 500, not hang); a build wants to
// tolerate a brief blip rather than lose the whole build over it. Next.js
// sets NEXT_PHASE=phase-production-build only during `next build`, so
// this distinction costs nothing at runtime.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB_NAME,
        bufferCommands: false,
        serverSelectionTimeoutMS: isBuildPhase ? 30000 : 10000, // Atlas free tier can take up to 8s to select server
        socketTimeoutMS: isBuildPhase ? 60000 : 45000,
        connectTimeoutMS: isBuildPhase ? 30000 : 10000,
        maxPoolSize: 10,
        minPoolSize: 2,              // keep 2 connections alive — avoids reconnect cost on warm server
        heartbeatFrequencyMS: isBuildPhase ? 30000 : 10000, // less frequent polling during build = fewer chances to hit a transient blip
      })
      .catch((err) => {
        cached.promise = null;       // reset so the next request retries
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
