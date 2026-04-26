import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "clinicDB",
    });

    console.log("MongoDB Connected ✅");
  } catch (err) {
    console.error("MongoDB Error ❌", err);
    throw err;
  }
}