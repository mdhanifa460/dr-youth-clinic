'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, MessageCircle, Calendar, Phone } from 'lucide-react';
import { useSiteConfig } from '@/app/components/SiteConfigContext';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  category: string;
  icon: string;
  items: FAQItem[];
}

interface HeroStats {
  questionsValue: string;
  patientsValue: string;
  ratingValue: string;
}

export default function FAQPageClient({
  categories,
  heroStats,
}: {
  categories: FAQCategory[];
  heroStats?: HeroStats;
}) {
  const { publicPhone, publicWhatsApp } = useSiteConfig();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const faqListRef = useRef<HTMLDivElement>(null);
  const waHref   = publicWhatsApp ? `https://wa.me/${publicWhatsApp.replace(/\D/g, '')}` : null;
  const telHref  = publicPhone    ? `tel:${publicPhone.replace(/\s+/g, '')}`              : null;

  function jumpToCategory(cat: string) {
    setActiveCategory(cat);
    setSearch('');
    setOpenIndex(null);
    setTimeout(() => {
      faqListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  const allItems = useMemo(
    () => categories.flatMap((c) => c.items.map((item) => ({ ...item, category: c.category, icon: c.icon }))),
    [categories]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const byCategory =
      activeCategory === 'All'
        ? allItems
        : allItems.filter((item) => item.category === activeCategory);
    if (!q) return byCategory;
    return byCategory.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [allItems, activeCategory, search]);

  const tabs = ['All', ...categories.map((c) => c.category)];

  const toggle = (id: string) => setOpenIndex((prev) => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#0B2560] via-[#1a3a7a] to-[#0B2560] text-white pt-16 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#F5A623] mb-4">
            Support Centre
          </span>
          <h1 className="text-3xl md:text-5xl font-headline font-extrabold leading-tight mb-4">
            Frequently Asked <span className="text-[#F5A623]">Questions</span>
          </h1>
          <p className="text-white/70 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Everything you need to know about our treatments, pricing, safety, and booking — answered by our doctors.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search questions — e.g. laser, PRP, cost, recovery..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveCategory('All'); }}
              className="w-full pl-11 pr-4 py-4 rounded-2xl text-gray-800 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
            />
          </div>

          {/* Stats strip — question count is derived from real data; patient count
              and rating are reused from the admin-editable homepage Stats Bar. */}
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { value: heroStats?.questionsValue || '200+', label: 'Questions answered' },
              { value: heroStats?.patientsValue || '25K+', label: 'Patients helped' },
              { value: heroStats?.ratingValue || '4.9★', label: 'Patient satisfaction' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-2xl py-3 px-2">
                <p className="text-xl font-extrabold text-[#F5A623]">{s.value}</p>
                <p className="text-[10px] text-white/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div ref={faqListRef} className="max-w-5xl mx-auto px-4 md:px-6 py-10 scroll-mt-4">
        {/* ── Category Tabs ── */}
        {!search && (
          <div className="flex flex-wrap gap-2 mb-8">
            {tabs.map((tab) => {
              const cat = categories.find((c) => c.category === tab);
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveCategory(tab); setOpenIndex(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    activeCategory === tab
                      ? 'bg-[#0B2560] text-white shadow-md shadow-[#0B2560]/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat && <span>{cat.icon}</span>}
                  {tab}
                  <span className={`text-[10px] font-bold ml-0.5 ${activeCategory === tab ? 'text-white/60' : 'text-gray-400'}`}>
                    {tab === 'All' ? allItems.length : categories.find((c) => c.category === tab)?.items.length ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Results count when searching ── */}
        {search && (
          <p className="text-sm text-gray-500 mb-6">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
            <button
              onClick={() => setSearch('')}
              className="ml-2 text-[#3B82C4] font-semibold hover:underline"
            >
              Clear
            </button>
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-lg font-bold text-gray-700 mb-2">No results found</p>
            <p className="text-sm text-gray-500 mb-6">
              Try a different search term or browse by category.
            </p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('All'); }}
              className="text-sm bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold"
            >
              Show all questions
            </button>
          </div>
        ) : search ? (
          /* Search results — flat list */
          <div className="space-y-3">
            {filtered.map((item, i) => {
              const id = `search-${i}`;
              const isOpen = openIndex === id;
              return (
                <div key={id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:border-[#0B2560]/20 hover:shadow-md transition-all">
                  <button
                    className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => toggle(id)}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="shrink-0 mt-0.5">{item.icon}</span>
                      <span className="font-semibold text-[#0B2560] text-sm leading-snug">{item.question}</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-gray-400 shrink-0 mt-0.5" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0">
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-gray-600 text-sm leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Category view */
          <div className="space-y-10">
            {(activeCategory === 'All' ? categories : categories.filter((c) => c.category === activeCategory)).map(
              (cat) => (
                <section key={cat.category}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="text-2xl">{cat.icon}</span>
                    <h2 className="text-lg font-bold text-[#0B2560]">{cat.category}</h2>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {cat.items.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {cat.items.map((item, i) => {
                      const id = `${cat.category}-${i}`;
                      const isOpen = openIndex === id;
                      return (
                        <div
                          key={id}
                          className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:border-[#0B2560]/25 hover:shadow-[0_8px_24px_rgba(11,37,96,0.07)] transition-all duration-200"
                        >
                          <button
                            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                            onClick={() => toggle(id)}
                          >
                            <span className="font-semibold text-[#0B2560] text-sm leading-snug flex-1 pr-2">
                              {item.question}
                            </span>
                            <span
                              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                isOpen ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5">
                              <div className="border-t border-gray-100 pt-4">
                                <p className="text-gray-600 text-sm leading-relaxed">{item.answer}</p>
                                <Link
                                  href="/book"
                                  className="mt-4 inline-flex items-center gap-1.5 text-[#3B82C4] text-xs font-semibold hover:text-[#0B2560] transition"
                                >
                                  Still have questions? Book a free consultation →
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )
            )}
          </div>
        )}

        {/* ── Still have questions CTA ── */}
        <div className="mt-16 rounded-3xl bg-gradient-to-br from-[#0B2560] to-[#1a3a7a] p-8 md:p-10 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold mb-3">
            Still have a question?
          </h2>
          <p className="text-white/70 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
            Our doctors and patient care team are happy to answer any question specific to your concern — completely free, no obligation.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/book"
              className="flex items-center gap-2 bg-[#F5A623] text-[#0B2560] font-bold px-6 py-3.5 rounded-xl hover:brightness-105 transition shadow-lg"
            >
              <Calendar size={16} />
              Book Free Consultation
            </Link>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 transition border border-white/20"
              >
                <MessageCircle size={16} />
                WhatsApp Us
              </a>
            )}
            {telHref && (
              <a
                href={telHref}
                className="flex items-center gap-2 bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 transition border border-white/20"
              >
                <Phone size={16} />
                Call Now
              </a>
            )}
          </div>
        </div>

        {/* ── Quick topic links ── */}
        <div className="mt-10 border border-gray-100 rounded-2xl p-6 bg-gray-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Browse by topic</p>
          <p className="text-[11px] text-gray-400 mb-4">Click a topic to jump straight to those questions</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => jumpToCategory(cat.category)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  activeCategory === cat.category
                    ? 'bg-[#0B2560] text-white border-[#0B2560]'
                    : 'text-[#0B2560] bg-white border-gray-200 hover:border-[#0B2560] hover:shadow-sm'
                }`}
              >
                <span>{cat.icon}</span> {cat.category}
                <span className={`text-[9px] font-bold ${activeCategory === cat.category ? 'text-white/60' : 'text-gray-400'}`}>
                  {cat.items.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
