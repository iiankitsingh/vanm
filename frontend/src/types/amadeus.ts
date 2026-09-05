export interface AmadeusLocation {
  type: string;
  subType: "AIRPORT" | "CITY";
  name: string;
  detailedName?: string;
  id: string;
  self?: {
    href: string;
    methods: string[];
  };
  timeZoneOffset?: string;
  iataCode: string;
  address: {
    cityName: string;
    cityCode: string;
    countryName: string;
    countryCode: string;
    stateCode?: string;
    regionCode?: string;
  };
  analytics?: any;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  travelClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  nonStop: boolean;
}

export interface FlightEndpoint {
  iataCode: string;
  terminal?: string;
  at: string; // ISO DateTime
}

export interface FlightSegment {
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  carrierCode: string;
  number: string;
  aircraft?: {
    code: string;
  };
  operating?: {
    carrierCode: string;
  };
  duration: string; // ISO 8601 duration e.g. PT2H30M
  id: string;
  numberOfStops: number;
  blacklistedInEU?: boolean;
}

export interface FlightItinerary {
  duration: string; // ISO 8601 duration
  segments: FlightSegment[];
}

export interface FlightPrice {
  currency: string;
  total: string;
  base: string;
  fees?: Array<{
    amount: string;
    type: string;
  }>;
  grandTotal?: string;
}

export interface FlightOffer {
  type: string;
  id: string;
  source: string;
  instantTicketingRequired?: boolean;
  nonHomogeneous?: boolean;
  oneWay?: boolean;
  lastTicketingDate?: string;
  numberOfBookableSeats?: number;
  itineraries: FlightItinerary[];
  price: FlightPrice;
  pricingOptions?: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: {
      currency: string;
      total: string;
      base: string;
    };
    fareDetailsBySegment: Array<{
      segmentId: string;
      cabin: string;
      fareBasis: string;
      class: string;
      includedCheckedBags?: {
        quantity?: number;
        weight?: number;
        weightUnit?: string;
      };
    }>;
  }>;
}

export interface FlightDateOffer {
  type: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  price: {
    total: string;
  };
}

export interface InspirationOffer {
  type: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  price: {
    total: string;
  };
}
