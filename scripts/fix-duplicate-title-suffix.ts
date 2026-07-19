import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required in .env.local");
}

// Strips exactly one trailing " | DR Youth Clinic" (any spacing/case) from
// already-saved metaTitle values. Every public page's <title> now relies on
// the root layout's title template ("%s | DR Youth Clinic") to append the
// suffix automatically — stored values that already included it produced a
// visibly duplicated "X | DR Youth Clinic | DR Youth Clinic" title.
const SUFFIX_RE = /\s*\|\s*DR Youth Clinic\s*$/i;

function stripSuffix(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!SUFFIX_RE.test(value)) return null;
  const cleaned = value.replace(SUFFIX_RE, "").trim();
  return cleaned || null;
}

async function main() {
  await mongoose.connect(MONGODB_URI!, { dbName: "clinicDB" });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No active DB connection");

  const report = { services: 0, serviceLocationSeo: 0, blogs: 0, landingPages: 0 };

  // Service.metaTitle (top-level) + Service.locationSeo[].metaTitle (per-city)
  const services = await db.collection("services").find({}).toArray();
  for (const svc of services) {
    const update: Record<string, unknown> = {};
    const cleanedTop = stripSuffix(svc.metaTitle);
    if (cleanedTop) update.metaTitle = cleanedTop;

    let locationSeoChanged = false;
    const locationSeo = Array.isArray(svc.locationSeo) ? [...svc.locationSeo] : [];
    for (let i = 0; i < locationSeo.length; i++) {
      const cleaned = stripSuffix(locationSeo[i]?.metaTitle);
      if (cleaned) {
        locationSeo[i] = { ...locationSeo[i], metaTitle: cleaned };
        locationSeoChanged = true;
      }
    }
    if (locationSeoChanged) update.locationSeo = locationSeo;

    if (Object.keys(update).length > 0) {
      await db.collection("services").updateOne({ _id: svc._id }, { $set: update });
      if (cleanedTop) report.services++;
      if (locationSeoChanged) report.serviceLocationSeo++;
    }
  }

  // Blog.metaTitle
  const blogs = await db.collection("blogs").find({}).toArray();
  for (const post of blogs) {
    const cleaned = stripSuffix(post.metaTitle);
    if (cleaned) {
      await db.collection("blogs").updateOne({ _id: post._id }, { $set: { metaTitle: cleaned } });
      report.blogs++;
    }
  }

  // LandingPage.seo.title
  const landingPages = await db.collection("landingpages").find({}).toArray();
  for (const lp of landingPages) {
    const cleaned = stripSuffix(lp.seo?.title);
    if (cleaned) {
      await db.collection("landingpages").updateOne({ _id: lp._id }, { $set: { "seo.title": cleaned } });
      report.landingPages++;
    }
  }

  console.log("Migration complete:", report);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
