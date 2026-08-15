'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { pushDataLayerEvent } from '@/app/lib/trackConversion';
import { resolveCustomEventParams } from '@/app/lib/analytics/resolveCustomEventParams';
import type { CustomEventTriggerType, CustomEventParamSource } from '@/app/lib/analytics/customEventOptions';

interface ActiveCustomEvent {
  name: string;
  triggerType: CustomEventTriggerType;
  elementId: string;
  pagePath: string;
  parameters: { name: string; source: CustomEventParamSource; value: string }[];
  isKeyEvent: boolean;
}

function fireCustomEvent(evt: ActiveCustomEvent, element: { dataset?: Record<string, string | undefined> } | null) {
  const params: Record<string, unknown> = resolveCustomEventParams(evt.parameters, element);
  // See the Key Events admin page's own disclaimer — this flag lets a
  // GTM trigger react to it, but does NOT itself register a GA4 Key
  // Event (no website-side API exists for that).
  if (evt.isKeyEvent) params.is_key_event = true;
  pushDataLayerEvent(evt.name, params);
}

// Mounted once in app/layout.tsx. Admin-configured Custom Events (see
// app/models/CustomAnalyticsEvent.ts) fire through the exact same
// pushDataLayerEvent() primitive every predefined event already uses — no
// new dataLayer mechanism, just a generic way to trigger it without a
// code deploy.
//
// Performance is the whole design constraint here: one cached fetch (never
// re-fetched on client-side navigation), and if that list comes back
// empty, NOTHING further is attached — no listeners, no observers. This
// must hold to the same "no homepage regression" bar already applied to
// Lottie lazy-loading and sound lazy-init elsewhere in this codebase.
export default function CustomEventListener() {
  const pathname = usePathname();
  const [events, setEvents] = useState<ActiveCustomEvent[] | null>(null);
  const visibleFired = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/analytics/custom-events/active')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setEvents(d?.success && Array.isArray(d.data) ? d.data : []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Click delegation — ONE document-level listener total, covering both
  // button_click and cta_click, matched by EXACT element.id equality only
  // (never substring/CSS-selector matching — see the plan's risk notes on
  // why a looser match on a global listener is unsafe).
  useEffect(() => {
    if (!events || events.length === 0) return;
    const clickEvents = events.filter((e) => e.triggerType === 'button_click' || e.triggerType === 'cta_click');
    if (clickEvents.length === 0) return;

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const withId = target?.closest?.('[id]') as HTMLElement | null;
      if (!withId) return;
      const match = clickEvents.find((ev) => ev.elementId && ev.elementId === withId.id);
      if (match) fireCustomEvent(match, withId);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [events]);

  // Element visibility — ONE shared IntersectionObserver instance for
  // every element_visible event (not one per element), fires at most once
  // per event name.
  useEffect(() => {
    if (!events || events.length === 0) return;
    const visibleEvents = events.filter((e) => e.triggerType === 'element_visible' && e.elementId);
    if (visibleEvents.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const match = visibleEvents.find((ev) => ev.elementId === el.id);
          if (match && !visibleFired.current.has(match.name)) {
            visibleFired.current.add(match.name);
            fireCustomEvent(match, el);
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.5 }
    );

    function observeAll() {
      for (const ev of visibleEvents) {
        if (visibleFired.current.has(ev.name)) continue;
        const el = document.getElementById(ev.elementId);
        if (el) observer.observe(el);
      }
    }
    observeAll();
    // One short retry for elements that render after initial paint (e.g.
    // inside a modal) — Phase 1 keeps this simple rather than adding a
    // full MutationObserver watch for arbitrarily-delayed elements.
    const retry = setTimeout(observeAll, 1500);

    return () => {
      clearTimeout(retry);
      observer.disconnect();
    };
  }, [events]);

  // Page view — checked on initial load once the event list is ready, and
  // again on every subsequent client-side navigation.
  useEffect(() => {
    if (!events || events.length === 0) return;
    const pageViewEvents = events.filter((e) => e.triggerType === 'page_view');
    for (const ev of pageViewEvents) {
      const matches = !ev.pagePath || ev.pagePath === pathname;
      if (matches) fireCustomEvent(ev, null);
    }
  }, [events, pathname]);

  return null;
}
