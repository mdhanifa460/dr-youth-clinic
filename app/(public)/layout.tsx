import { unstable_cache } from "next/cache";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import TopBar from "@/app/components/homepage/TopBar";
import { OrganizationSchema, FAQSchema } from "@/app/components/SchemaMarkup";
import { connectDB } from "@/app/lib/mongodb";
import { HomepageSection } from "@/app/models/HomepageSection";
import { HOMEPAGE_DEFAULTS } from "@/app/lib/homepageDefaults";

const getTopBarSection = unstable_cache(
  async () => {
    try {
      await connectDB();
      const section = await HomepageSection.findOne({ sectionKey: "topbar" }).lean() as any;
      return {
        data: section?.data ?? HOMEPAGE_DEFAULTS.topbar.data,
        visible: section?.visible ?? true,
      };
    } catch {
      return { data: HOMEPAGE_DEFAULTS.topbar.data, visible: true };
    }
  },
  ["topbar-section"],
  { revalidate: 300, tags: ["homepage-layout"] }
);

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, visible } = await getTopBarSection();

  return (
    <>
      <OrganizationSchema />
      <FAQSchema />
      {visible && <TopBar data={data} />}
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
