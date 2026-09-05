import { useState, useEffect, useCallback } from "react";
import type { FlightOffer, FlightSearchParams } from "../types/amadeus";
import { searchFlights } from "../api";

export function useFlightSearch(params: FlightSearchParams | null) {
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async (searchParams: FlightSearchParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchFlights(searchParams);
      setOffers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load flight offers");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params) {
      fetchOffers(params);
    } else {
      setOffers([]);
      setLoading(false);
      setError(null);
    }
  }, [params, fetchOffers]);

  const refetch = useCallback(() => {
    if (params) {
      fetchOffers(params);
    }
  }, [params, fetchOffers]);

  return { offers, loading, error, refetch };
}
