type ContactSection = { type: string; data?: any };

// The hero's numbers are what the page's header, footer and sticky bar use, so
// the CTA and form sections follow them too. Otherwise changing the number in
// the hero leaves an old one behind on those sections' buttons. A section's own
// number still applies on pages whose hero has none.
export function withPageContactNumbers<T extends ContactSection>(sections: T[]): T[] {
  const hero = sections.find((s) => s.type === "hero")?.data ?? {};
  return sections.map((s) => {
    if (s.type !== "cta" && s.type !== "form") return s;
    return ({
      ...s,
      data: {
        ...s.data,
        phone: hero.phone || s.data?.phone,
        whatsapp: hero.whatsapp || s.data?.whatsapp,
      },
    } as T);
  });
}
