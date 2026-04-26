import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI in environment");
}

let cachedConnection: Promise<typeof mongoose> | undefined;

export async function connectDB() {
  if (!cachedConnection) {
    cachedConnection = mongoose.connect(uri);
  }

  await cachedConnection;
  return mongoose.connection;
}
