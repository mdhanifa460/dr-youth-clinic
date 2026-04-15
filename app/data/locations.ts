export type LocationType = {
  name: string;
  address: string;
  phone: string;
  map: string;
};

export const locations: Record<string, LocationType> = {
  chennai: {
    name: "Chennai",
    address: "Anna Nagar, Chennai, Tamil Nadu",
    phone: "+919876543210",
    map: "https://www.google.com/maps?q=Chennai&output=embed",
  },
  bangalore: {
    name: "Bangalore",
    address: "Indiranagar, Bangalore, Karnataka",
    phone: "+919876543210",
    map: "https://www.google.com/maps?q=Bangalore&output=embed",
  },
  coimbatore: {
    name: "Coimbatore",
    address: "RS Puram, Coimbatore, Tamil Nadu",
    phone: "+919876543210",
    map: "https://www.google.com/maps?q=Coimbatore&output=embed",
  },
  kochi: {
    name: "Kochi",
    address: "MG Road, Kochi, Kerala",
    phone: "+919876543210",
    map: "https://www.google.com/maps?q=Kochi&output=embed",
  },
};