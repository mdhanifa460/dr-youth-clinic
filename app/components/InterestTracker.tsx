"use client";

import { useEffect, useRef } from "react";
import { postInterestEvent, type InterestEventType } from "@/app/lib/personalization";

// Drop into a server-component page to fire one interest event on mount —
// same fire-and-forget, silent-no-op-when-off contract as postInterestEvent
// itself. Renders nothing. `category` is pre-resolved by the caller via
// resolveInterestCategory() (server-side, from the page's own data) since
// this component has no DB access of its own.
export default function InterestTracker({
  eventType,
  category,
  meta,
}: {
  eventType: InterestEventType;
  category: string | null | undefined;
  meta?: Record<string, unknown>;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !category) return;
    fired.current = true;
    postInterestEvent(eventType, category, meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, eventType]);

  return null;
}
