import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required in .env.local");
}

// Atlas Vector Search index for the RAG knowledge base (app/models/KnowledgeChunk.ts).
// 3072 dims to match gemini-embedding-001's actual output — verified live
// against the real GEMINI_API_KEY (the plan originally assumed
// text-embedding-004's 768 dims, which isn't available on this account).
//
// This cluster's tier caps Atlas Search indexes (traditional + vector
// combined) at 3 total. blog_search_idx was dropped to free this slot — see
// scripts/create-search-indexes.ts.
const INDEX_NAME = "kb_vector_idx";
const COLLECTION = "knowledgechunks";

async function main() {
  await mongoose.connect(MONGODB_URI!, { dbName: "clinicDB" });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No active DB connection");

  const coll = db.collection(COLLECTION);
  const existing = await coll.listSearchIndexes().toArray().catch(() => []);
  if (existing.some((i: any) => i.name === INDEX_NAME)) {
    console.log(`Skip ${COLLECTION}.${INDEX_NAME} — already exists`);
    return;
  }

  await coll.createSearchIndex({
    name: INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        { type: "vector", path: "embedding", numDimensions: 3072, similarity: "cosine" },
        { type: "filter", path: "sourceType" },
        { type: "filter", path: "category" },
        { type: "filter", path: "location" },
      ],
    },
  });
  console.log(`Created ${COLLECTION}.${INDEX_NAME} (building — Atlas takes a minute to activate it)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
