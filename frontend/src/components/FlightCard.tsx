import { useState } from "react";
import type { FlightOffer } from "../types/amadeus";
import { formatDuration } from "../utils/formatDuration";
import { formatPrice } from "../utils/formatPrice";

interface FlightCardProps {
  offer: FlightOffer;
  onShowToast: (message: string) => void;
}

export function FlightCard({ offer, onShowToast }: FlightCardProps) {
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({});

  const handleLogoError = (iataCode: string) => {
    setLogoErrors((prev) => ({ ...prev, [iataCode]: true }));
  };

  const handleViewDeal = () => {
    onShowToast("Booking flow not available in demo");
  };

  const firstItinerary = offer.itineraries[0];
  const returnItinerary = offer.itineraries[1];

  const renderItineraryDetails = (itinerary: typeof firstItinerary, label: "Outbound" | "Return") => {
    const firstSegment = itinerary.segments[0];
    const lastSegment = itinerary.segments[itinerary.segments.length - 1];
    const stopsCount = itinerary.segments.length - 1;

    const departTime = new Date(firstSegment.departure.at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    const arrivalTime = new Date(lastSegment.arrival.at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    const carrierCode = firstSegment.carrierCode;
    const hasLogoFailed = logoErrors[carrierCode];

    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between py-4 border-b border-slate-100 last:border-b-0 dark:border-slate-800">
        {/* Airline Info */}
        <div className="flex items-center space-x-3 min-w-[150px] mb-2 md:mb-0">
          {!hasLogoFailed ? (
            <img
              src={`https://assets.airtrfx.com/media-em/lc/${carrierCode}.png`}
              alt={carrierCode}
              onError={() => handleLogoError(carrierCode)}
              className="w-8 h-8 object-contain rounded"
            />
          ) : (
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs rounded border border-slate-300 dark:border-slate-600">
              {carrierCode}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              {carrierCode} {firstSegment.number}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        </div>

        {/* Route Times */}
        <div className="flex items-center space-x-8 flex-1 justify-between md:justify-center md:space-x-12">
          {/* Depart */}
          <div className="text-left md:text-right min-w-[70px]">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{departTime}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {firstSegment.departure.iataCode}
            </p>
          </div>

          {/* Connection Visual */}
          <div className="flex flex-col items-center flex-1 max-w-[160px] px-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDuration(itinerary.duration)}
            </p>
            <div className="relative w-full h-[2px] bg-slate-300 dark:bg-slate-700 my-1">
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                  stopsCount === 0 ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {stopsCount === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Non-stop</span>
              ) : stopsCount === 1 ? (
                <span className="text-amber-600 dark:text-amber-400">1 stop ({firstSegment.arrival.iataCode})</span>
              ) : (
                <span className="text-amber-700 dark:text-amber-500">{stopsCount} stops</span>
              )}
            </p>
          </div>

          {/* Arrive */}
          <div className="text-right min-w-[70px]">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{arrivalTime}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lastSegment.arrival.iataCode}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col md:flex-row justify-between hover:shadow-md transition-shadow duration-300 gap-6">
      {/* Flight Segments (Outbound & Optional Return) */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        {renderItineraryDetails(firstItinerary, "Outbound")}
        {returnItinerary && renderItineraryDetails(returnItinerary, "Return")}
      </div>

      {/* Pricing / Booking Area */}
      <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-6 min-w-[150px] gap-4">
        <div className="text-left md:text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Price</p>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            {formatPrice(offer.price.total, offer.price.currency)}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Includes taxes & fees</p>
        </div>

        <button
          onClick={handleViewDeal}
          className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-xl shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 active:scale-95 transition-all text-sm w-full md:w-auto"
        >
          View Deal
        </button>
      </div>
    </div>
  );
}
