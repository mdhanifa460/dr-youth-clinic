'use client';

import { useEffect, useRef } from 'react';

// Shared by every page with a client-side category/tab filter (Offers,
// Blog, Results, FAQs, Doctors) — switching a filter re-renders the
// results grid in place with no navigation, so if the visitor has
// scrolled past the tabs already, the new results can render off-screen
// with nothing visibly changing. Scrolls the grid back into view
// whenever `dep` (the active tab/category) changes — skips the very
// first render so simply loading the page doesn't itself trigger a
// scroll. Same intent as the multi-step-flow scroll-to-top fix in
// skin-quiz/page.tsx and PlanMyJourneyClient.tsx, just for filters
// instead of steps.
export function useScrollOnChange<T>(dep: T) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [dep]);

  return ref;
}
