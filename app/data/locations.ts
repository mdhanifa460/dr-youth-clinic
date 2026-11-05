export type LocationType = {
  name: string;
  address: string;
  phone: string;
  map: string;
  description: string;
  specialties: string[];
  hours: { day: string; hours: string }[];
};

export const locations: Record<string, LocationType> = {
  chennai: {
    name: "Chennai",
    address: "Anna Nagar, Chennai, Tamil Nadu 600040",
    phone: "",
    map: "https://www.google.com/maps?q=Anna+Nagar,Chennai&output=embed",
    description:
      "Our Chennai clinic in Anna Nagar is equipped with treatment rooms for skin, hair and laser care, and a team of doctors.",
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
  },
  bangalore: {
    name: "Bangalore",
    address: "Indiranagar, Bangalore, Karnataka 560038",
    phone: "",
    map: "https://www.google.com/maps?q=Indiranagar,Bangalore&output=embed",
    description:
      "Located in the heart of Bangalore's IT hub, our Indiranagar clinic offers skin, hair and laser treatments.",
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
  },
  coimbatore: {
    name: "Coimbatore",
    address: "RS Puram, Coimbatore, Tamil Nadu 641002",
    phone: "",
    map: "https://www.google.com/maps?q=RS+Puram,Coimbatore&output=embed",
    description:
      "Our Coimbatore center in RS Puram provides comprehensive skin care care to the city's growing population.",
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
  },
  kochi: {
    name: "Kochi",
    address: "MG Road, Kochi, Kerala 682016",
    phone: "",
    map: "https://www.google.com/maps?q=MG+Road,Kochi&output=embed",
    description:
      "Our Kochi clinic on MG Road provides skin care care in Kerala.",
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
  },
};
