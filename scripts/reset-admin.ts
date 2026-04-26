import { pbkdf2Sync, randomBytes } from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import AdminSession from "../app/models/AdminSession";
import AdminUser from "../app/models/AdminUser";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@dryouth.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const PASSWORD_ITERATIONS = 210_000;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required in .env.local");
}

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD must be set and at least 12 characters long");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(
    password,
    salt,
    PASSWORD_ITERATIONS,
    64,
    "sha512"
  ).toString("hex");

  return {
    hash,
    salt,
    iterations: PASSWORD_ITERATIONS,
  };
}

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: "clinicDB" });

  const { hash, salt, iterations } = hashPassword(ADMIN_PASSWORD!);
  const email = ADMIN_EMAIL.toLowerCase().trim();

  await AdminUser.findOneAndUpdate(
    { email },
    {
      email,
      name: "Clinic Admin",
      role: "admin",
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: iterations,
      isActive: true,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  await AdminSession.updateMany(
    { revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );

  console.log(`Admin user reset: ${email}`);
  console.log("Existing admin sessions revoked.");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
