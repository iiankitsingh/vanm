import { useEffect, useState, useMemo } from "react";
import { useFlightSearch } from "../hooks/useFlightSearch";
import { FilterPanel } from "../components/FilterPanel";
import type { FilterState } from "../components/FilterPanel";
import { SortBar } from "../components/SortBar";
import type { SortOption } from "../components/SortBar";
import { FlightCard } from "../components/FlightCard";
import { PriceCalendar } from "../components/PriceCalendar";
import { SearchForm } from "../components/SearchForm";
import type { FlightSearchParams } from "../types/amadeus";
import { parseISODuration } from "../utils/parseISODuration";
import { getDepartureHour } from "../utils/getDepartureHour";
import { ArrowLeft, SlidersHorizontal, AlertCircle, RefreshCw } from "lucide-react";

interface ResultsProps {
  onNavigate: (path: string) => void;
}

export function Results({ onNavigate }: ResultsProps) {
  // Parse search params from URL
  const queryParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      origin: params.get("from") || "",
      originName: params.get("fromName") || "",
      destination: params.get("to") || "",
      destinationName: params.get("toName") || "",
      departureDate: params.get("depart") || "",
      returnDate: params.get("return") || undefined,
      adults: parseInt(params.get("adults") || "1", 10),
      travelClass: (params.get("cabin") || "ECONOMY") as FlightSearchParams["travelClass"],
      tripType: params.get("tripType") || "one-way"
    };
  }, [window.location.search]);

  // Construct structured params for the hook
  const searchParams: FlightSearchParams | null = useMemo(() => {
    if (!queryParams.origin || !queryParams.destination || !queryParams.departureDate) {
      return null;
    }
    return {
      origin: queryParams.origin,
      destination: queryParams.destination,
      departureDate: queryParams.departureDate,
      returnDate: queryParams.tripType === "round-trip" ? queryParams.returnDate : undefined,
      adults: queryParams.adults,
      travelClass: queryParams.travelClass,
      nonStop: false // Get all flights to allow rich filtering
    };
  }, [queryParams]);

  const { offers, loading, error, refetch } = useFlightSearch(searchParams);

  // Sorting & Filtering State
  const [currentSort, setCurrentSort] = useState<SortOption>("cheapest");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    stops: "all",
    maxPrice: 100000,
    departureTimes: {
      morning: false,
      afternoon: false,
      evening: false,
      night: false
    },
    airlines: []
  });

  // Calculate pricing min/max dynamically from actual results
  const priceRange = useMemo(() => {
    if (offers.length === 0) return { min: 0, max: 100000 };
    const prices = offers.map((o) => {
      let val = parseFloat(o.price.total);
      if (o.price.currency === "EUR") val = val * 91;
      return val;
    });
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [offers]);

  // Extract unique airlines from offers
  const airlinesList = useMemo(() => {
    const set = new Set<string>();
    offers.forEach((o) => {
      if (o.validatingAirlineCodes && o.validatingAirlineCodes[0]) {
        set.add(o.validatingAirlineCodes[0]);
      }
    });
    return Array.from(set);
  }, [offers]);

  // Sync initial maxPrice filter when offers finish loading
  useEffect(() => {
    if (offers.length > 0) {
      setFilters((prev) => ({
        ...prev,
        maxPrice: priceRange.max
      }));
    }
  }, [offers, priceRange]);

  // Toast notifications for mock booking
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Callback to update URL departure date when PriceCalendar is clicked
  const handleSelectDate = (newDate: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("depart", newDate);
    onNavigate(`/results?${params.toString()}`);
  };

  // Callback for header form edit
  const handleFormChange = (params: FlightSearchParams & { originName: string; destinationName: string }) => {
    const query = new URLSearchParams({
      from: params.origin,
      to: params.destination,
      fromName: params.originName,
      toName: params.destinationName,
      depart: params.departureDate,
      return: params.returnDate || "",
      adults: params.adults.toString(),
      cabin: params.travelClass,
      tripType: params.returnDate ? "round-trip" : "one-way"
    });
    onNavigate(`/results?${query.toString()}`);
  };

  // Filter and Sort flight offers
  const processedOffers = useMemo(() => {
    let filtered = [...offers];

    // A. Apply Filter: Stops
    if (filters.stops === "non-stop") {
      filtered = filtered.filter((offer) => {
        const outboundStops = offer.itineraries[0].segments.length - 1;
        const returnStops = offer.itineraries[1] ? offer.itineraries[1].segments.length - 1 : 0;
        return outboundStops === 0 && returnStops === 0;
      });
    } else if (filters.stops === "1-stop") {
      filtered = filtered.filter((offer) => {
        const outboundStops = offer.itineraries[0].segments.length - 1;
        const returnStops = offer.itineraries[1] ? offer.itineraries[1].segments.length - 1 : 0;
        return outboundStops <= 1 && returnStops <= 1;
      });
    }

    // B. Apply Filter: Max Price
    filtered = filtered.filter((offer) => {
      let priceVal = parseFloat(offer.price.total);
      if (offer.price.currency === "EUR") priceVal = priceVal * 91;
      return priceVal <= filters.maxPrice;
    });

    // C. Apply Filter: Departure Times
    const isAnyTimeChecked = Object.values(filters.departureTimes).some(Boolean);
    if (isAnyTimeChecked) {
      filtered = filtered.filter((offer) => {
        const firstSegment = offer.itineraries[0].segments[0];
        const hour = getDepartureHour(firstSegment.departure.at);

        if (filters.departureTimes.morning && hour >= 6 && hour < 12) return true;
        if (filters.departureTimes.afternoon && hour >= 12 && hour < 18) return true;
        if (filters.departureTimes.evening && hour >= 18 && hour < 24) return true;
        if (filters.departureTimes.night && hour >= 0 && hour < 6) return true;
        return false;
      });
    }

    // D. Apply Filter: Airlines
    if (filters.airlines.length > 0) {
      filtered = filtered.filter((offer) =>
        filters.airlines.includes(offer.validatingAirlineCodes[0])
      );
    }

    // E. Apply Sort Option
    if (currentSort === "cheapest") {
      filtered.sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));
    } else if (currentSort === "fastest") {
      filtered.sort((a, b) => {
        const aOutbound = parseISODuration(a.itineraries[0].duration);
        const aReturn = a.itineraries[1] ? parseISODuration(a.itineraries[1].duration) : 0;
        const bOutbound = parseISODuration(b.itineraries[0].duration);
        const bReturn = b.itineraries[1] ? parseISODuration(b.itineraries[1].duration) : 0;
        return aOutbound + aReturn - (bOutbound + bReturn);
      });
    } else if (currentSort === "best") {
      // Custom heuristic: Price in INR + Total travel duration in minutes * 10
      filtered.sort((a, b) => {
        let aPrice = parseFloat(a.price.total);
        if (a.price.currency === "EUR") aPrice = aPrice * 91;

        let bPrice = parseFloat(b.price.total);
        if (b.price.currency === "EUR") bPrice = bPrice * 91;

        const aDuration =
          parseISODuration(a.itineraries[0].duration) +
          (a.itineraries[1] ? parseISODuration(a.itineraries[1].duration) : 0);
        const bDuration =
          parseISODuration(b.itineraries[0].duration) +
          (b.itineraries[1] ? parseISODuration(b.itineraries[1].duration) : 0);

        const aScore = aPrice + aDuration * 10;
        const bScore = bPrice + bDuration * 10;
        return aScore - bScore;
      });
    }

    return filtered;
  }, [offers, filters, currentSort]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* 1. Results Navigation Header */}
      <div className="w-full bg-[#031d44] dark:bg-slate-900 text-white py-4 px-4 md:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate("/")}
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors text-sm font-bold cursor-pointer select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Search Again</span>
          </button>
          <div className="text-center">
            <h2 className="text-md md:text-lg font-black tracking-tight">
              {queryParams.originName || queryParams.origin} to {queryParams.destinationName || queryParams.destination}
            </h2>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              {new Date(queryParams.departureDate).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
              {queryParams.returnDate &&
                ` — ${new Date(queryParams.returnDate).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}`}
              {` • ${queryParams.adults} Adult${queryParams.adults > 1 ? "s" : ""} • ${
                queryParams.travelClass.charAt(0) + queryParams.travelClass.slice(1).toLowerCase()
              }`}
            </p>
          </div>
          <div className="w-16" /> {/* spacer for center alignment */}
        </div>
      </div>

      {/* 2. Top-level quick search panel */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6">
        <details className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <summary className="p-4 flex items-center justify-between cursor-pointer select-none font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-wide">
            <span>Modify Flight Parameters</span>
            <span className="text-primary font-extrabold group-open:hidden">Edit</span>
            <span className="text-primary font-extrabold hidden group-open:inline">Collapse</span>
          </summary>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <SearchForm initialParams={queryParams} onSubmit={handleFormChange} />
          </div>
        </details>
      </div>

      {/* 3. Main content area */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <FilterPanel
          minPrice={priceRange.min}
          maxPrice={priceRange.max}
          airlinesList={airlinesList}
          filters={filters}
          onChange={setFilters}
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        />

        {/* Content list */}
        <div className="flex-1 flex flex-col space-y-6">
          {loading ? (
            // Skeleton Loader cards
            <div className="space-y-6">
              <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"
                ></div>
              ))}
            </div>
          ) : error ? (
            // Error Panel
            <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Flight Search Failed</h3>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-2 max-w-md mx-auto">
                {error}
              </p>
              <button
                onClick={refetch}
                className="mt-6 inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Search</span>
              </button>
            </div>
          ) : processedOffers.length === 0 ? (
            // Empty Results State
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Flights Found</h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                We couldn't find any flights matching your filters. Try widening your price limit or changing departure times.
              </p>
              <button
                onClick={() => onNavigate("/")}
                className="mt-6 text-sm font-bold text-primary hover:text-primary-hover cursor-pointer"
              >
                Clear all filters and search again
              </button>
            </div>
          ) : (
            // Success results
            <>
              {/* Sort Bar */}
              <SortBar
                currentSort={currentSort}
                onChange={setCurrentSort}
                resultsCount={processedOffers.length}
              />

              {/* Floating Filter Button for Mobile */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-6 rounded-full shadow-xl shadow-primary/25 z-40 flex items-center space-x-2 border border-primary-hover active:scale-95 transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filter & Sort</span>
              </button>

              {/* Flight Offers List */}
              <div className="space-y-6">
                {processedOffers.map((offer) => (
                  <FlightCard key={offer.id} offer={offer} onShowToast={triggerToast} />
                ))}
              </div>

              {/* Price Calendar strip below the cards */}
              {queryParams.origin && queryParams.destination && (
                <div className="mt-8">
                  <PriceCalendar
                    origin={queryParams.origin}
                    destination={queryParams.destination}
                    departureDate={queryParams.departureDate}
                    onSelectDate={handleSelectDate}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Booking Mock Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl animate-bounce text-sm">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
