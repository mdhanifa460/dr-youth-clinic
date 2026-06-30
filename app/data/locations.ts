export type LocationType = {
  name: string;
  address: string;
  phone: string;
  map: string;
  description: string;
  specialties: string[];
  hours: { day: string; hours: string }[];
  rating: number;
  reviewCount: number;
  serviceCount: number;
  doctorCount: number;
};

export const locations: Record<string, LocationType> = {
  chennai: {
    name: "Chennai",
    address: "Anna Nagar, Chennai, Tamil Nadu 600040",
    phone: "+919876543210",
    map: "https://www.google.com/maps?q=Anna+Nagar,Chennai&output=embed",
    description:
      "Our flagship Chennai clinic in Anna Nagar is equipped with state-of-the-art dermatological equipment and staffed by experienced specialists.",
    specialties: [
      "Advanced Laser Treatments",
      "Hair Restoration",
      "Acne Management",
      "Anti-Aging Procedures",
      "Skin Lightening",
    ],
    hours: [
      { day: "Monday - Saturday", hours: "9:00 AM - 7:00 PM" },
      { day: "Sunday", hours: "Closed" },
    ],
    rating: 4.9,
    reviewCount: 412,
    serviceCount: 25,
    doctorCount: 6,
  },
  bangalore: {
    name: "Bangalore",
    address: "Indiranagar, Bangalore, Karnataka 560038",
    phone: "+919876543210",
    map: "https://www.google.com/maps?q=Indiranagar,Bangalore&output=embed",
    description:
      "Located in the heart of Bangalore's IT hub, our Indiranagar clinic offers cutting-edge dermatological treatments.",
    specialties: [
      "PRP Therapy",
      "Chemical Peels",
      "Dermal Fillers",
      "Laser Hair Removal",
      "Microdermabrasion",
    ],
    hours: [
      { day: "Monday - Saturday", hours: "10:00 AM - 6:00 PM" },
      { day: "Sunday", hours: "Closed" },
    ],
    rating: 4.8,
    reviewCount: 287,
    serviceCount: 20,
    doctorCount: 5,
  },
  coimbatore: {
    name: "Coimbatore",
    address: "RS Puram, Coimbatore, Tamil Nadu 641002",
    phone: "+919876543210",
    map: "https://www.google.com/maps?q=RS+Puram,Coimbatore&output=embed",
    description:
      "Our Coimbatore center in RS Puram provides comprehensive dermatological care to the city's growing population.",
    specialties: [
      "Psoriasis Treatment",
      "Eczema Management",
      "Vitiligo Treatment",
      "Mole Removal",
      "Wart Treatment",
    ],
    hours: [
      { day: "Monday - Saturday", hours: "9:30 AM - 6:30 PM" },
      { day: "Sunday", hours: "By Appointment" },
    ],
    rating: 4.9,
    reviewCount: 198,
    serviceCount: 18,
    doctorCount: 4,
  },
  kochi: {
    name: "Kochi",
    address: "MG Road, Kochi, Kerala 682016",
    phone: "+919876543210",
    map: "https://www.google.com/maps?q=MG+Road,Kochi&output=embed",
    description:
      "Our Kochi clinic on MG Road is a premier destination for dermatological care in Kerala, integrating international standards with local expertise.",
    specialties: [
      "Skin Rejuvenation",
      "Thread Lifting",
      "Botox Treatment",
      "Tattoo Removal",
      "Scar Treatment",
    ],
    hours: [
      { day: "Monday - Saturday", hours: "10:00 AM - 7:00 PM" },
      { day: "Sunday", hours: "Closed" },
    ],
    rating: 4.9,
    reviewCount: 231,
    serviceCount: 22,
    doctorCount: 4,
  },
};
