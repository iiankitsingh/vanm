import { useState, useEffect } from "react";
import type { AmadeusLocation } from "../types/amadeus";
import { searchAirports } from "../api";

export function useAirportSearch(query: string) {
  const [results, setResults] = useState<AmadeusLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const handler = setTimeout(async () => {
      try {
        const res = await searchAirports(trimmed);
        setResults(res);
      } catch (err: any) {
        setError(err.message || "Failed to load airports");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  return { results, loading, error };
}
