'use client';

// One request per branch URL per page load. The footer, navbar, top bar, sticky
// bar, chat widget and CTA buttons each ask for the same branch's phone or
// WhatsApp number, which used to send about 10 identical requests (each one a
// database read) on every page. They now share one in-flight or finished
// request. A failed request is dropped from the cache so the next caller retries.
const cache = new Map<string, Promise<any>>();

export function fetchBranchJson(url: string): Promise<any> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) cache.delete(url);
        return d;
      })
      .catch((err) => {
        cache.delete(url);
        throw err;
      });
    cache.set(url, p);
  }
  return p;
}
