// Pure parameter-resolution logic for a fired Custom Event, extracted out
// of CustomEventListener.tsx so it's testable without touching the DOM.
// `element` only needs to duck-type a `dataset`-bearing object — a real
// HTMLElement in the browser, or a plain `{ dataset: {...} }` in tests.
import type { CustomEventParamSource } from "./customEventOptions";

export interface CustomEventParamDef {
  name: string;
  source: CustomEventParamSource;
  value: string;
}

export interface DatasetLike {
  dataset?: Record<string, string | undefined>;
}

export function resolveCustomEventParams(
  parameters: CustomEventParamDef[] | undefined,
  element: DatasetLike | null
): Record<string, string> {
  const resolved: Record<string, string> = {};
  if (!parameters) return resolved;

  for (const param of parameters) {
    if (!param?.name) continue;
    if (param.source === "dataAttribute") {
      // value holds the data-* attribute name in camelCase (e.g. "offerId"
      // reads element.dataset.offerId, i.e. the data-offer-id attribute) —
      // never throws, missing attributes just resolve to ''.
      resolved[param.name] = element?.dataset?.[param.value] ?? "";
    } else {
      resolved[param.name] = param.value ?? "";
    }
  }
  return resolved;
}
