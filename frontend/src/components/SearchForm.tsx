import { useState, useEffect, useRef } from "react";
import { useAirportSearch } from "../hooks/useAirportSearch";
import type { FlightSearchParams, AmadeusLocation } from "../types/amadeus";
import { MapPin, Calendar, Users, ChevronDown, RefreshCw } from "lucide-react";

interface SearchFormProps {
  initialParams?: Partial<FlightSearchParams> & { originName?: string; destinationName?: string };
  onSubmit: (params: FlightSearchParams & { originName: string; destinationName: string }) => void;
}

export function SearchForm({ initialParams, onSubmit }: SearchFormProps) {
  // Trip type state: one-way or round-trip
  const [tripType, setTripType] = useState<"one-way" | "round-trip">(
    initialParams?.returnDate ? "round-trip" : "one-way"
  );

  // Origin Airport Typeahead
  const [originInput, setOriginInput] = useState(initialParams?.originName || "");
  const [originCode, setOriginCode] = useState(initialParams?.origin || "");
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const { results: originResults, loading: originLoading } = useAirportSearch(originInput);

  // Destination Airport Typeahead
  const [destinationInput, setDestinationInput] = useState(initialParams?.destinationName || "");
  const [destinationCode, setDestinationCode] = useState(initialParams?.destination || "");
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const { results: destinationResults, loading: destinationLoading } = useAirportSearch(destinationInput);

  // Dates
  const todayStr = new Date().toISOString().split("T")[0];
  const [departureDate, setDepartureDate] = useState(initialParams?.departureDate || todayStr);
  const [returnDate, setReturnDate] = useState(initialParams?.returnDate || "");

  // Passengers
  const [adults, setAdults] = useState<number>(initialParams?.adults || 1);
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);

  // Cabin Class
  const [travelClass, setTravelClass] = useState<FlightSearchParams["travelClass"]>(
    initialParams?.travelClass || "ECONOMY"
  );

  // Refs for closing dropdowns on click outside
  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);
  const passengerRef = useRef<HTMLDivElement>(null);

  // Sync with initialParams if they change
  useEffect(() => {
    if (initialParams) {
      if (initialParams.origin) setOriginCode(initialParams.origin);
      if (initialParams.originName) setOriginInput(initialParams.originName);
      if (initialParams.destination) setDestinationCode(initialParams.destination);
      if (initialParams.destinationName) setDestinationInput(initialParams.destinationName);
      if (initialParams.departureDate) setDepartureDate(initialParams.departureDate);
      if (initialParams.returnDate) {
        setReturnDate(initialParams.returnDate);
        setTripType("round-trip");
      } else {
        setReturnDate("");
        setTripType("one-way");
      }
      if (initialParams.adults) setAdults(initialParams.adults);
      if (initialParams.travelClass) setTravelClass(initialParams.travelClass);
    }
  }, [initialParams]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setShowOriginDropdown(false);
      }
      if (destinationRef.current && !destinationRef.current.contains(event.target as Node)) {
        setShowDestinationDropdown(false);
      }
      if (passengerRef.current && !passengerRef.current.contains(event.target as Node)) {
        setShowPassengerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwapAirports = () => {
    const tempInput = originInput;
    const tempCode = originCode;
    setOriginInput(destinationInput);
    setOriginCode(destinationCode);
    setDestinationInput(tempInput);
    setDestinationCode(tempCode);
  };

  const handleSelectOrigin = (loc: AmadeusLocation) => {
    const formatted = `${loc.address.cityName} (${loc.iataCode})`;
    setOriginInput(formatted);
    setOriginCode(loc.iataCode);
    setShowOriginDropdown(false);
  };

  const handleSelectDestination = (loc: AmadeusLocation) => {
    const formatted = `${loc.address.cityName} (${loc.iataCode})`;
    setDestinationInput(formatted);
    setDestinationCode(loc.iataCode);
    setShowDestinationDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originCode) {
      alert("Please select a valid origin airport from the dropdown list.");
      return;
    }
    if (!destinationCode) {
      alert("Please select a valid destination airport from the dropdown list.");
      return;
    }
    if (originCode === destinationCode) {
      alert("Origin and destination airports cannot be the same.");
      return;
    }

    onSubmit({
      origin: originCode,
      originName: originInput.replace(/\s\([A-Z]{3}\)$/, ""), // strip IATA for display
      destination: destinationCode,
      destinationName: destinationInput.replace(/\s\([A-Z]{3}\)$/, ""),
      departureDate,
      returnDate: tripType === "round-trip" ? returnDate : undefined,
      adults,
      travelClass,
      nonStop: false // Default to false, filterable on results page
    });
  };

  const travelClassLabels: Record<FlightSearchParams["travelClass"], string> = {
    ECONOMY: "Economy",
    PREMIUM_ECONOMY: "Premium Economy",
    BUSINESS: "Business",
    FIRST: "First"
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-200"
    >
      {/* 1. Trip Type & Cabin Class Selection */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Trip Type Pills */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setTripType("one-way")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              tripType === "one-way"
                ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            One-way
          </button>
          <button
            type="button"
            onClick={() => setTripType("round-trip")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              tripType === "round-trip"
                ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Round-trip
          </button>
        </div>

        {/* Cabin Class Selection */}
        <div className="flex items-center space-x-2">
          <label htmlFor="cabin-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Cabin Class:
          </label>
          <select
            id="cabin-select"
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value as FlightSearchParams["travelClass"])}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold py-2 px-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
          >
            {Object.entries(travelClassLabels).map(([key, val]) => (
              <option key={key} value={key}>
                {val}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Main Search Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-6">
        {/* Origin Airport Field */}
        <div ref={originRef} className="relative md:col-span-4">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
            From
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Origin Airport or City"
              value={originInput}
              onChange={(e) => {
                setOriginInput(e.target.value);
                setOriginCode("");
                setShowOriginDropdown(true);
              }}
              onFocus={() => setShowOriginDropdown(true)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all dark:placeholder:text-slate-500"
            />
          </div>

          {showOriginDropdown && originInput.trim().length >= 2 && (
            <div className="absolute left-0 z-30 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
              {originLoading ? (
                <div className="p-4 text-xs font-medium text-slate-500 text-center animate-pulse">
                  Searching airports...
                </div>
              ) : originResults.length === 0 ? (
                <div className="p-4 text-xs font-medium text-slate-500 text-center">
                  No airports or cities found
                </div>
              ) : (
                originResults.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectOrigin(loc)}
                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col border-b border-slate-100 last:border-b-0 dark:border-slate-800/40"
                  >
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {loc.address.cityName} ({loc.iataCode})
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {loc.name} — {loc.address.countryName}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center md:col-span-1 pt-4 md:pt-0">
          <button
            type="button"
            onClick={handleSwapAirports}
            className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-all active:scale-90"
            title="Swap locations"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-300 md:rotate-95" />
          </button>
        </div>

        {/* Destination Airport Field */}
        <div ref={destinationRef} className="relative md:col-span-4">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
            To
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Destination Airport or City"
              value={destinationInput}
              onChange={(e) => {
                setDestinationInput(e.target.value);
                setDestinationCode("");
                setShowDestinationDropdown(true);
              }}
              onFocus={() => setShowDestinationDropdown(true)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all dark:placeholder:text-slate-500"
            />
          </div>

          {showDestinationDropdown && destinationInput.trim().length >= 2 && (
            <div className="absolute left-0 z-30 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
              {destinationLoading ? (
                <div className="p-4 text-xs font-medium text-slate-500 text-center animate-pulse">
                  Searching airports...
                </div>
              ) : destinationResults.length === 0 ? (
                <div className="p-4 text-xs font-medium text-slate-500 text-center">
                  No airports or cities found
                </div>
              ) : (
                destinationResults.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectDestination(loc)}
                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col border-b border-slate-100 last:border-b-0 dark:border-slate-800/40"
                  >
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {loc.address.cityName} ({loc.iataCode})
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {loc.name} — {loc.address.countryName}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Passenger selector */}
        <div ref={passengerRef} className="relative md:col-span-3">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
            Passengers
          </label>
          <button
            type="button"
            onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-sm font-semibold flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <span className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-slate-400" />
              <span>
                {adults} Adult{adults > 1 ? "s" : ""}
              </span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showPassengerDropdown ? "rotate-180" : ""}`} />
          </button>

          {showPassengerDropdown && (
            <div className="absolute right-0 z-30 w-full md:w-56 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Adults</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Ages 12 or above</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    disabled={adults <= 1}
                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center font-extrabold text-lg text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 select-none"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200 w-4 text-center">
                    {adults}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdults(Math.min(9, adults + 1))}
                    disabled={adults >= 9}
                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center font-extrabold text-lg text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 select-none"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Dates Fields & Submission Button */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Departure Date Field */}
        <div className={`relative ${tripType === "round-trip" ? "md:col-span-4" : "md:col-span-8"}`}>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
            Departure Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              min={todayStr}
              value={departureDate}
              onChange={(e) => {
                setDepartureDate(e.target.value);
                if (returnDate && e.target.value > returnDate) {
                  setReturnDate(e.target.value);
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer dark:color-scheme-dark"
            />
          </div>
        </div>

        {/* Return Date Field */}
        {tripType === "round-trip" && (
          <div className="relative md:col-span-4">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
              Return Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                min={departureDate || todayStr}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required={tripType === "round-trip"}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Search Button */}
        <div className="md:col-span-4">
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-200 active:scale-[0.98] text-sm uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Search Flights</span>
          </button>
        </div>
      </div>
    </form>
  );
}
