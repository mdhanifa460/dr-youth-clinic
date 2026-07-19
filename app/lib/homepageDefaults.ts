import { CLOUDINARY_LOGO_URL } from './legacyImageUrls';
import { locations } from '@/app/data/locations';

export interface SectionDefault {
  label: string;
  order: number;
  visible: boolean;
  data: Record<string, any>;
}

export const HOMEPAGE_DEFAULTS: Record<string, SectionDefault> = {
  topbar: {
    label: 'Top Bar',
    order: 1,
    visible: true,
    data: {
      phone: '1800 890 9669',
      email: 'info@dryouthclinic.com',
      badge: 'Ranked Top Hair care Clinics in India',
      socialLinks: [
        { platform: 'facebook', url: '#' },
        { platform: 'instagram', url: '#' },
        { platform: 'youtube', url: '#' },
        { platform: 'twitter', url: '#' },
        { platform: 'whatsapp', url: '#' },
      ],
    },
  },
  header: {
    label: 'Header / Nav',
    order: 2,
    visible: true,
    data: {
      logoUrl: CLOUDINARY_LOGO_URL,
      navLinks: [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/services' },
        { label: 'About Us', href: '#expertise' },
        { label: 'Results', href: '#results' },
        { label: 'Blog', href: '#blog' },
        { label: 'Contact', href: '#contact' },
      ],
      ctaText: 'Consult Online',
      ctaHref: '/book',
      phone: '1800 890 9669',
    },
  },
  hero: {
    label: 'Hero Section',
    order: 3,
    visible: true,
    data: {
      badge: 'ADVANCED AESTHETIC CLINIC',
      headline: 'Advanced Skin &\nAesthetic Care',
      highlightText: 'You Can Trust',
      description: 'Personalised treatments, advanced technology & real results.',
      ctaPrimary: { text: 'Book Consultation', href: '/book' },
      ctaSecondary: { text: 'Our Services', href: '#services' },
      image: { url: '/images/hero-clinical.jpeg', publicId: '' },
      trustBadges: [
        { icon: '👨‍⚕️', text: 'Expert Doctors & Surgeons' },
        { icon: '🔬', text: 'Advanced Technology' },
        { icon: '💊', text: 'Personalised Care for Every Patient' },
      ],
    },
  },
  stats: {
    label: 'Stats Bar',
    order: 4,
    visible: true,
    data: {
      stats: [
        { value: '25K+', label: 'Happy Patients' },
        { value: '10K+', label: 'Successful Treatments' },
        { value: '22+', label: 'Years of Excellence' },
        { value: '4.7/5', label: 'Google Rating', showStars: true },
      ],
    },
  },
  // Numbers are always live-computed from real bookings (see getTrustTimelineStats
  // in app/(public)/page.tsx) — only the labels below are admin-editable, deliberately
  // never the counts themselves, so this section can never show fabricated numbers.
  trust_timeline: {
    label: 'Trust Timeline (Live Stats)',
    order: 4.5,
    visible: true,
    data: {
      headline: 'Real Activity, Real Trust',
      todayLabel: 'Consultations Today',
      weekLabel: 'Treatments This Week',
      monthLabel: 'Happy Patients This Month',
    },
  },
  consultation_form: {
    label: 'Consultation Form Bar',
    order: 5,
    visible: true,
    data: {
      headline: 'Start Your Transformation Today',
      subtext: 'Book your consultation and take the first step towards healthier skin & confident you.',
      services: [
        'Hair Transplant',
        'PRP Therapy',
        'GFC Therapy',
        'Laser Treatment',
        'Skin Care',
        'Acne Treatment',
        'Scar Treatment',
      ],
      cities: ['Chennai', 'Bangalore', 'Coimbatore', 'Kochi'],
      ctaText: 'Book Your Consultation',
    },
  },
  services: {
    label: 'Services Cards',
    order: 8,
    visible: true,
    data: {
      headline: 'Clinical-Level Beauty Services',
      subheadline:
        'Experience advanced care with proven results and personalised treatment for your unique skin.',
      cards: [
        {
          icon: '🩺',
          tag: 'Dermatology',
          title: 'Advanced Skin Care',
          description: 'Targeted solutions for acne, anti-aging, and complex dermatological conditions.',
          href: '/services',
          image: { url: '', publicId: '' },
        },
        {
          icon: '💇',
          tag: 'Trichology',
          title: 'Hair Restoration',
          description: 'PRP therapy and advanced treatments to restore hair density and scalp health.',
          href: '/services',
          image: { url: '', publicId: '' },
        },
        {
          icon: '⚡',
          tag: 'Precision',
          title: 'Laser Technology',
          description: 'Safe and effective laser solutions for hair removal and pigmentation correction.',
          href: '/services',
          image: { url: '', publicId: '' },
        },
      ],
      diagnosisPanel: {
        title: 'Need a personalized diagnosis?',
        description: 'Our experts will help you choose the right treatment.',
        ctaText: 'Book Now',
        ctaHref: '/book',
      },
    },
  },
  before_after: {
    label: 'Before / After Results',
    order: 7,
    visible: true,
    data: {
      headline: 'Real Results, Real Confidence',
      subheadline:
        'Visible improvements that our patients are thrilled about. See the difference.',
      // Not shown on the homepage section itself anymore (redundant with
      // StatsBar directly above it there) — still used as the stats row on
      // the standalone /results page, which doesn't have that redundancy.
      stats: [
        { value: '98%', label: 'Patient satisfaction' },
        { value: '10K+', label: 'Treatments done' },
        { value: '22+', label: 'Years of care' },
        { value: '4', label: 'Clinic locations' },
      ],
      pairs: [
        {
          title: 'Acne Therapy & Scar Solution',
          description: 'Treatments that smooth, clarify & restore natural skin texture.',
          before: { url: '', publicId: '' },
          after: { url: '', publicId: '' },
        },
        {
          title: 'Hairfall & Scalp Restoration',
          description: 'Targeted care for stronger, healthier hair & nourished roots.',
          before: { url: '', publicId: '' },
          after: { url: '', publicId: '' },
        },
      ],
    },
  },
  // Off by default — turn on once the founder's real name, photo, and quote
  // are filled in via Admin → Homepage → Founder / CEO Section.
  founder: {
    label: 'Founder / CEO Section',
    order: 8.5,
    visible: false,
    data: {
      eyebrow: 'Meet Our Founder',
      headline: 'The Vision Behind DR Youth Clinic',
      quote: '',
      name: '',
      title: 'Founder & CEO',
      photo: { url: '', publicId: '' },
      signature: { url: '', publicId: '' },
      credentials: [],
      stats: [],
      ctaText: 'Book a Consultation',
      ctaHref: '/book',
    },
  },
  doctors: {
    label: 'Doctors Section',
    order: 9,
    visible: true,
    data: {
      headline: 'Meet Our Expert Doctors',
      subheadline:
        'Experienced professionals dedicated to delivering natural, safe & long-lasting results.',
      viewAllText: 'Meet Our Team',
      viewAllHref: '/doctors',
      doctors: [
        {
          name: 'Dr. Anitha R',
          role: 'Dermatologist',
          experience: '12+ Years Exp.',
          photo: { url: '', publicId: '' },
          linkedIn: '#',
        },
        {
          name: 'Dr. Karthik S',
          role: 'Trichologist',
          experience: '10+ Years Exp.',
          photo: { url: '', publicId: '' },
          linkedIn: '#',
        },
        {
          name: 'Dr. Priya Menon',
          role: 'Aesthetic Physician',
          experience: '9+ Years Exp.',
          photo: { url: '', publicId: '' },
          linkedIn: '#',
        },
        {
          name: 'Dr. Naveen B',
          role: 'Hair Transplant Surgeon',
          experience: '11+ Years Exp.',
          photo: { url: '', publicId: '' },
          linkedIn: '#',
        },
      ],
    },
  },
  video_academy: {
    label: 'Skin & Hair Academy (Videos)',
    order: 9.1,
    visible: true,
    data: {
      headline: 'Skin & Hair Academy',
      subheadline: 'Learn directly from our specialists.',
    },
  },
  locations: {
    label: 'Locations',
    order: 10,
    visible: true,
    data: {
      headline: 'Our Locations',
      subheadline: 'We are available in multiple locations to serve you better.',
      cities: ['Chennai', 'Bengaluru', 'Coimbatore', 'Kochi'],
      viewAllText: 'View all clinics',
      featuredCity: {
        name: 'Chennai',
        address: locations.chennai.address,
        hours: locations.chennai.hours[0]?.day + ': ' + locations.chennai.hours[0]?.hours,
        phone: locations.chennai.phone,
        directionsHref: locations.chennai.map,
      },
    },
  },
  cta_strip: {
    label: '3-Column CTA Strip',
    order: 6,
    visible: true,
    data: {
      rewards: {
        title: 'DR Youth Rewards',
        subtitle: 'Because you deserve the best!',
        features: [
          'Earn Points on Every Visit',
          'Exclusive Member Discounts',
          'Birthday & Anniversary Offers',
          'Priority Appointments',
          'Referral Benefits',
        ],
        // No ctaHref by default — there's no dedicated rewards page yet, and a
        // dead '#' link is worse than no link. Set a real URL here once one exists.
        ctaText: 'Learn more about rewards',
        ctaHref: '',
      },
      booking: {
        title: 'Book Your Consultation',
        description: 'Consult our experts and get a personalised treatment plan.',
        ctaPrimary: { text: 'Book Online Appointment', href: '/book' },
        ctaSecondary: { text: 'Call Now: 1800 890 9669', href: 'tel:18008909669' },
        image: { url: '', publicId: '' },
      },
      whyUs: {
        title: 'Why Choose DR Youth Clinic?',
        reasons: [
          'Personalised Care Plans',
          'Evidence-Based Protocols',
          'FDA-Approved Technology',
          'Safe, Effective & Painless Treatments',
          'Trusted by Thousands of Patients',
        ],
      },
    },
  },
  testimonials: {
    label: 'Testimonials Slider',
    order: 11,
    visible: true,
    data: {
      headline: 'What Our Patients Say',
      subheadline: 'Real stories. Real results. Real confidence.',
      layout: 'slider',
      displayCount: 6,
      filterSource: '',
      filterLocation: '',
      filterService: '',
      showSourceBadges: true,
      showDate: false,
    },
  },
  faq: {
    label: 'FAQ Accordion',
    order: 12,
    visible: true,
    data: {
      headline: 'Frequently Asked Questions',
      viewAllText: 'View all FAQs',
      viewAllHref: '/faqs',
      faqs: [
        {
          question: 'What causes hair loss?',
          answer:
            'Hair loss can be caused by genetics, hormonal changes, nutritional deficiencies, stress, or medical conditions. Our specialists can diagnose the root cause and recommend targeted treatments.',
        },
        {
          question: 'Which hair restoration treatment is right for me?',
          answer:
            'The right treatment depends on the type and extent of hair loss. Options include PRP therapy, GFC therapy, hair transplant, and more. Book a consultation for a personalised recommendation.',
        },
        {
          question: 'How long does it take to see results?',
          answer:
            'Results vary by treatment. Most patients see visible improvements within 3-6 months. Our team will set realistic expectations during your consultation.',
        },
        {
          question: 'Are the results permanent?',
          answer:
            'Hair transplant results are permanent. Other treatments like PRP require maintenance sessions for long-lasting results.',
        },
        {
          question: 'Is the treatment painful?',
          answer:
            'Most treatments are minimally invasive with little to no pain. We use advanced techniques and local anesthesia where needed to ensure your comfort.',
        },
      ],
    },
  },
  blog: {
    label: 'Blog / Insights',
    order: 13,
    visible: true,
    data: {
      headline: 'Latest Insights',
      subheadline: 'Tips, trends & expert advice',
      posts: [
        {
          category: 'Hair Care',
          title: 'PRP Therapy: Benefits for Hair Growth',
          excerpt:
            'Discover how PRP therapy stimulates hair follicles and promotes natural hair growth.',
          image: { url: '', publicId: '' },
          href: '#',
          date: 'May 10, 2024',
          readTime: '5 min read',
        },
        {
          category: 'Skin Care',
          title: 'How to Get Glowing Skin Naturally',
          excerpt: 'Expert tips and clinical treatments to achieve that natural glow.',
          image: { url: '', publicId: '' },
          href: '#',
          date: 'May 06, 2024',
          readTime: '4 min read',
        },
        {
          category: 'Aesthetics',
          title: 'Laser Hair Removal: Everything You Need to Know',
          excerpt:
            'A complete guide to laser hair removal — how it works, what to expect, and results.',
          image: { url: '', publicId: '' },
          href: '#',
          date: 'May 03, 2024',
          readTime: '6 min read',
        },
      ],
    },
  },
  footer: {
    label: 'Footer',
    order: 14,
    visible: true,
    data: {
      tagline:
        'Advanced skin & aesthetic care with clinical expertise and personalised treatments.',
      quickLinksHeading: 'Quick Links',
      quickLinks: [
        { label: 'Home', href: '/' },
        { label: 'About Us', href: '/about' },
        // No bare /services route exists — services are always city-scoped
        // (/[city]/services). Same fallback Navbar.tsx already uses for this.
        { label: 'Procedures', href: '/#services' },
        { label: 'Results', href: '/results' },
        { label: 'Blog', href: '/blog' },
        { label: 'Contact Us', href: '/#contact' },
      ],
      proceduresHeading: 'Our Procedures',
      procedures: [
        { label: 'Hair Transplant', href: '/#services' },
        { label: 'PRP Therapy', href: '/#services' },
        { label: 'GFC Therapy', href: '/#services' },
        { label: 'Hair Loss Treatment', href: '/#services' },
        { label: 'Laser & Skin Treatments', href: '/#services' },
        { label: 'View All Procedures', href: '/#services' },
      ],
      patientCareHeading: 'Patient Care',
      patientCare: [
        { label: 'Book Appointment', href: '/book' },
        { label: 'FAQs', href: '/faqs' },
        { label: 'Before & After Care', href: '/results' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms & Conditions', href: '/terms' },
      ],
      contactHeading: 'Contact Us',
      contact: {
        address: locations.chennai.address,
        phone: locations.chennai.phone,
        email: 'info@dryouthclinic.com',
      },
      copyright: '© 2024 DR Youth Clinic. All Rights Reserved.',
      socialLinks: [
        { platform: 'facebook', url: '#' },
        { platform: 'instagram', url: '#' },
        { platform: 'youtube', url: '#' },
        { platform: 'whatsapp', url: '#' },
      ],
    },
  },
};

export const SECTION_KEYS = Object.keys(HOMEPAGE_DEFAULTS);
