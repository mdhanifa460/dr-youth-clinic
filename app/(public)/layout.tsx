import { unstable_cache } from "next/cache";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import TopBar from "@/app/components/homepage/TopBar";
import MobileStickyBar from "@/app/components/MobileStickyBar";
import { OrganizationSchema, FAQSchema } from "@/app/components/SchemaMarkup";
import { connectDB } from "@/app/lib/mongodb";
import { HomepageSection } from "@/app/models/HomepageSection";
import { HOMEPAGE_DEFAULTS } from "@/app/lib/homepageDefaults";

// Single query for both topbar + footer — avoids two round-trips per page
const getLayoutSections = unstable_cache(
  async () => {
    try {
      await connectDB();
      const sections = await HomepageSection.find({
        sectionKey: { $in: ["topbar", "footer"] },
      } as any).lean() as any[];

      const byKey = Object.fromEntries(sections.map((s) => [s.sectionKey, s]));
      return {
        topbar: {
          data: byKey.topbar?.data ?? HOMEPAGE_DEFAULTS.topbar.data,
          visible: byKey.topbar?.visible ?? true,
        },
        footer: byKey.footer?.data ?? HOMEPAGE_DEFAULTS.footer.data,
      };
    } catch {
      return {
        topbar: { data: HOMEPAGE_DEFAULTS.topbar.data, visible: true },
        footer: HOMEPAGE_DEFAULTS.footer.data,
      };
    }
  },
  ["layout-sections-v2"],
  { revalidate: 300, tags: ["homepage-layout"] }
);

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { topbar, footer } = await getLayoutSections();

  const whatsappLink = topbar.data?.socialLinks?.find(
    (s: any) => s.platform === "whatsapp"
  )?.url;

  return (
    <>
      <OrganizationSchema />
      <FAQSchema />
      {topbar.visible && <TopBar data={topbar.data} />}
      <Navbar />
      <div className="pb-[72px] lg:pb-0">{children}</div>
      <Footer data={footer} />
      <MobileStickyBar phone={topbar.data?.phone} whatsappUrl={whatsappLink} />
    </>
  );
}
