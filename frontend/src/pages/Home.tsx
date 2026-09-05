import { useEffect, useState } from "react";
import { SearchForm } from "../components/SearchForm";
import { getInspiration } from "../api";
import type { InspirationOffer, FlightSearchParams } from "../types/amadeus";
import { formatPrice } from "../utils/formatPrice";
import { Compass, PlaneTakeoff, ExternalLink } from "lucide-react";

interface HomeProps {
  onNavigate: (path: string) => void;
}

// Fallback inspiration data in case BOM returns empty/error in test env
const FALLBACK_INSPIRATIONS = [
  { destination: "NYC", price: { total: "189" } },
  { destination: "LON", price: { total: "145" } },
  { destination: "PAR", price: { total: "138" } },
  { destination: "DXB", price: { total: "98" } },
  { destination: "SIN", price: { total: "112" } },
  { destination: "TYO", price: { total: "220" } }
];

const DESTINATION_NAMES: Record<string, string> = {
  NYC: "New York, USA",
  LON: "London, UK",
  PAR: "Paris, France",
  DXB: "Dubai, UAE",
  SIN: "Singapore",
  TYO: "Tokyo, Japan",
  MAD: "Madrid, Spain",
  ROM: "Rome, Italy",
  MUC: "Munich, Germany"
};

const DESTINATION_IMAGES: Record<string, string> = {
  NYC: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80",
  LON: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=80",
  PAR: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
  DXB: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80",
  SIN: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=400&q=80",
  TYO: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=400&q=80"
};

export function Home({ onNavigate }: HomeProps) {
  const [inspiration, setInspiration] = useState<InspirationOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    async function loadInspirations() {
      try {
        const data = await getInspiration("BOM");
        if (data && data.length > 0) {
          setInspiration(data.slice(0, 6));
          setIsFallback(false);
        } else {
          // If empty, use mock fallbacks
          setInspiration(FALLBACK_INSPIRATIONS as InspirationOffer[]);
          setIsFallback(true);
        }
      } catch (err) {
        // Safe catch, load mock details
        setInspiration(FALLBACK_INSPIRATIONS as InspirationOffer[]);
        setIsFallback(true);
      } finally {
        setLoading(false);
      }
    }
    loadInspirations();
  }, []);

  const handleSearchSubmit = (params: FlightSearchParams & { originName: string; destinationName: string }) => {
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

  const handleCardClick = (destinationCode: string) => {
    const today = new Date();
    // Default departure date to 30 days from now
    const departure = new Date();
    departure.setDate(today.getDate() + 30);
    const departStr = departure.toISOString().split("T")[0];

    const query = new URLSearchParams({
      from: "BOM",
      to: destinationCode,
      fromName: "Mumbai",
      toName: DESTINATION_NAMES[destinationCode] || destinationCode,
      depart: departStr,
      return: "",
      adults: "1",
      cabin: "ECONOMY",
      tripType: "one-way"
    });
    onNavigate(`/results?${query.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Header with Gradient Background */}
      <div className="w-full bg-gradient-to-b from-[#031d44] via-[#0770e3] to-[#dbebff] dark:to-[#090f19] pt-16 pb-36 px-4 md:px-8 text-center text-white relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-2.5 mb-3 animate-fade-in">
            <PlaneTakeoff className="w-8 h-8 text-amber-300 drop-shadow" />
            <span className="font-extrabold text-2xl tracking-wider uppercase font-sans">
              AeroSearch
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow font-sans">
            Millions of cheap flights. One simple search.
          </h1>
          <p className="text-sm md:text-md font-semibold text-slate-100/90 mb-10 max-w-xl mx-auto drop-shadow-sm">
            Compare prices, explore destinations, and plan your next adventure without hidden fees.
          </p>
        </div>
      </div>

      {/* Floating Form Area */}
      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 -mt-24 relative z-10">
        <SearchForm onSubmit={handleSearchSubmit} />
      </div>

      {/* Explore Section */}
      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 py-16">
        <div className="flex items-center space-x-2 mb-6">
          <Compass className="w-6 h-6 text-primary" />
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Explore destinations from Mumbai (BOM)
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {isFallback && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-900/50 self-start">
                Note: Showing popular destinations (Amadeus Test API inspiration routes).
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {inspiration.map((offer, idx) => {
                const dest = offer.destination;
                const name = DESTINATION_NAMES[dest] || `${dest} City`;
                const image =
                  DESTINATION_IMAGES[dest] ||
                  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80";

                return (
                  <button
                    key={idx}
                    onClick={() => handleCardClick(dest)}
                    className="group relative h-64 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-end text-left border border-slate-100 dark:border-slate-800 cursor-pointer select-none active:scale-[0.98]"
                  >
                    {/* Background Image */}
                    <img
                      src={image}
                      alt={name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Card Content */}
                    <div className="relative p-6 z-10 text-white w-full">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                        Cheapest Deal
                      </p>
                      <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5 mt-0.5">
                        <span>{name}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <div className="flex justify-between items-baseline mt-4 border-t border-white/10 pt-3">
                        <span className="text-xs font-semibold text-slate-300">Prices starting from</span>
                        <span className="text-xl font-black text-amber-300">
                          {formatPrice(offer.price.total, "EUR")}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold bg-white dark:bg-slate-900/50">
        <p>© 2026 AeroSearch. Created for demonstration purposes. All rights reserved.</p>
      </footer>
    </div>
  );
}
