import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required in .env.local");
}

// Traditional Atlas Search indexes for app/lib/rag/SearchService.ts.
// Idempotent: skips any index whose name already exists on that collection.
//
// No `locationcontents` or `blogs` entry: this cluster's tier caps Atlas
// Search indexes at 3 total (shared with Vector Search). Location search was
// never built, and blog_search_idx was later dropped (see
// scripts/create-vector-index.ts) to free a slot for the RAG knowledge
// base's vector index — blog already has BlogPageClient.tsx's client-side
// filter as a fallback.
const INDEXES: { collection: string; name: string; definition: Record<string, unknown> }[] = [
  {
    collection: "services",
    name: "service_search_idx",
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          name: { type: "string" },
          narrative: { type: "string" },
          heroDescription: { type: "string" },
          keywords: { type: "string" },
          metaTitle: { type: "string" },
          metaDescription: { type: "string" },
          category: { type: "token" },
          status: { type: "token" },
          location: { type: "token" },
          targetLocations: { type: "token" },
        },
      },
    },
  },
  {
    collection: "doctors",
    name: "doctor_search_idx",
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          name: { type: "string" },
          title: { type: "string" },
          qualifications: { type: "string" },
          bio: { type: "string" },
          specializations: { type: "token" },
          languages: { type: "token" },
          locations: { type: "token" },
        },
      },
    },
  },
];

async function main() {
  await mongoose.connect(MONGODB_URI!, { dbName: "clinicDB" });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No active DB connection");

  for (const { collection, name, definition } of INDEXES) {
    const coll = db.collection(collection);
    const existing = await coll.listSearchIndexes().toArray().catch(() => []);
    if (existing.some((i: any) => i.name === name)) {
      console.log(`Skip ${collection}.${name} — already exists`);
      continue;
    }
    await coll.createSearchIndex({ name, definition });
    console.log(`Created ${collection}.${name} (building — Atlas takes a minute to activate it)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
