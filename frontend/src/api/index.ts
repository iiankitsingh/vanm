import type {
  AmadeusLocation,
  FlightOffer,
  FlightDateOffer,
  InspirationOffer,
  FlightSearchParams
} from "../types/amadeus";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

export async function searchAirports(keyword: string): Promise<AmadeusLocation[]> {
  const response = await fetch(`${API_BASE}/api/airports?keyword=${encodeURIComponent(keyword)}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airport search failed (${response.status}): ${text}`);
  }
  const json = await response.json();
  return json.data || [];
}

export async function searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
  const query = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    adults: params.adults.toString(),
    travelClass: params.travelClass,
    nonStop: params.nonStop.toString()
  });

  if (params.returnDate) {
    query.set("returnDate", params.returnDate);
  }

  const response = await fetch(`${API_BASE}/api/flights?${query.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    let errMessage = `Flight search failed (${response.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.message) errMessage = parsed.message;
      else if (parsed.error) errMessage = parsed.error;
    } catch {
      if (text) errMessage = text;
    }
    throw new Error(errMessage);
  }
  const json = await response.json();
  return json.data || [];
}

export async function getFlightDates(origin: string, dest: string): Promise<FlightDateOffer[]> {
  const response = await fetch(
    `${API_BASE}/api/flight-dates?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
      dest
    )}`
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Flight dates failed (${response.status}): ${text}`);
  }
  const json = await response.json();
  return json.data || [];
}

export async function getInspiration(origin: string): Promise<InspirationOffer[]> {
  const response = await fetch(`${API_BASE}/api/inspiration?origin=${encodeURIComponent(origin)}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Flight inspiration failed (${response.status}): ${text}`);
  }
  const json = await response.json();
  return json.data || [];
}
