import { X, SlidersHorizontal } from "lucide-react";
import { formatPrice } from "../utils/formatPrice";

export interface FilterState {
  stops: "all" | "non-stop" | "1-stop";
  maxPrice: number;
  departureTimes: {
    morning: boolean; // 6am - 12pm
    afternoon: boolean; // 12pm - 6pm
    evening: boolean; // 6pm - 12am
    night: boolean; // 12am - 6am
  };
  airlines: string[];
}

interface FilterPanelProps {
  minPrice: number;
  maxPrice: number;
  airlinesList: string[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPanel({
  minPrice,
  maxPrice,
  airlinesList,
  filters,
  onChange,
  isOpen,
  onClose
}: FilterPanelProps) {
  const handleStopsChange = (stops: FilterState["stops"]) => {
    onChange({ ...filters, stops });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, maxPrice: parseInt(e.target.value, 10) });
  };

  const handleTimeChange = (timeKey: keyof FilterState["departureTimes"]) => {
    const updatedTimes = {
      ...filters.departureTimes,
      [timeKey]: !filters.departureTimes[timeKey]
    };
    onChange({ ...filters, departureTimes: updatedTimes });
  };

  const handleAirlineChange = (airline: string) => {
    let updatedAirlines = [...filters.airlines];
    if (updatedAirlines.includes(airline)) {
      updatedAirlines = updatedAirlines.filter((a) => a !== airline);
    } else {
      updatedAirlines.push(airline);
    }
    onChange({ ...filters, airlines: updatedAirlines });
  };

  const handleReset = () => {
    onChange({
      stops: "all",
      maxPrice: maxPrice || 100000,
      departureTimes: {
        morning: false,
        afternoon: false,
        evening: false,
        night: false
      },
      airlines: []
    });
  };

  const panelContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Filters</h2>
        </div>
        <button
          onClick={handleReset}
          className="text-xs font-bold text-primary hover:text-primary-hover cursor-pointer"
        >
          Reset All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pt-6 pr-1 custom-scrollbar">
        {/* 1. Stops Filter */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Stops
          </h3>
          <div className="space-y-2">
            {[
              { id: "all", label: "All Flights" },
              { id: "non-stop", label: "Non-stop only" },
              { id: "1-stop", label: "Max 1 stop" }
            ].map((option) => (
              <label
                key={option.id}
                className="flex items-center space-x-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                <input
                  type="radio"
                  name="stops"
                  checked={filters.stops === option.id}
                  onChange={() => handleStopsChange(option.id as FilterState["stops"])}
                  className="w-4 h-4 text-primary focus:ring-primary border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2. Price Filter */}
        {maxPrice > minPrice && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Max Price
              </h3>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {formatPrice(filters.maxPrice, "INR")}
              </span>
            </div>
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={filters.maxPrice}
              onChange={handlePriceChange}
              className="w-full accent-primary bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
              <span>{formatPrice(minPrice, "INR")}</span>
              <span>{formatPrice(maxPrice, "INR")}</span>
            </div>
          </div>
        )}

        {/* 3. Departure Times */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Departure Time
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "morning", label: "Morning", desc: "6 AM - 12 PM" },
              { id: "afternoon", label: "Afternoon", desc: "12 PM - 6 PM" },
              { id: "evening", label: "Evening", desc: "6 PM - Midnight" },
              { id: "night", label: "Night", desc: "Midnight - 6 AM" }
            ].map((time) => (
              <label
                key={time.id}
                className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer select-none transition-all duration-200 ${
                  filters.departureTimes[time.id as keyof FilterState["departureTimes"]]
                    ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary dark:text-white"
                    : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={filters.departureTimes[time.id as keyof FilterState["departureTimes"]]}
                  onChange={() => handleTimeChange(time.id as keyof FilterState["departureTimes"])}
                  className="sr-only"
                />
                <span className="text-sm font-bold">{time.label}</span>
                <span className="text-[10px] opacity-80 mt-1">{time.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 4. Airlines Filter */}
        {airlinesList.length > 0 && (
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Airlines
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {airlinesList.map((airline) => {
                const isChecked = filters.airlines.includes(airline);
                return (
                  <label
                    key={airline}
                    className="flex items-center space-x-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleAirlineChange(airline)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span>{airline}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Layout */}
      <div className="hidden lg:block w-72 flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm sticky top-6">
        {panelContent}
      </div>

      {/* Mobile Drawer Slide-up Sheet */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* Content Sheet */}
        <div
          className={`absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 rounded-t-3xl transition-transform duration-300 transform max-h-[85vh] flex flex-col ${
            isOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Drag Handle Indicator */}
          <div className="flex justify-center py-2.5">
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 rounded-full cursor-pointer text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex-1 overflow-hidden">{panelContent}</div>
        </div>
      </div>
    </>
  );
}
