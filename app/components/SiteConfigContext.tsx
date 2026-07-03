"use client";

import { createContext, useContext } from "react";
import { type SiteConfig, SITE_CONFIG_DEFAULTS } from "@/app/lib/siteConfigTypes";

const SiteConfigContext = createContext<SiteConfig>(SITE_CONFIG_DEFAULTS);

export function SiteConfigProvider({
  initial,
  children,
}: {
  initial: SiteConfig;
  children: React.ReactNode;
}) {
  return (
    <SiteConfigContext.Provider value={initial}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext);
}
