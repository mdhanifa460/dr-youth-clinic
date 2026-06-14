import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { OrganizationSchema, FAQSchema } from "@/app/components/SchemaMarkup";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OrganizationSchema />
      <FAQSchema />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}