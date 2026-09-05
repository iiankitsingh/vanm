import { useEffect, useState, useRef } from "react";
import { getFlightDates } from "../api";
import type { FlightDateOffer } from "../types/amadeus";
import { formatPrice } from "../utils/formatPrice";

interface PriceCalendarProps {
  origin: string;
  destination: string;
  departureDate: string;
  onSelectDate: (date: string) => void;
}

export function PriceCalendar({ origin, destination, departureDate, onSelectDate }: PriceCalendarProps) {
  const [dateOffers, setDateOffers] = useState<FlightDateOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadDates() {
      setLoading(true);
      setError(null);
      try {
        const data = await getFlightDates(origin, destination);
        if (active) {
          setDateOffers(data);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Failed to load flight dates");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (origin && destination) {
      loadDates();
    }

    return () => {
      active = false;
    };
  }, [origin, destination]);

  // Generate 35 days (5 weeks) centered around the departure date
  const calendarDays = (() => {
    const days: Date[] = [];
    const baseDate = new Date(departureDate);
    if (isNaN(baseDate.getTime())) return [];

    // Start 7 days before baseDate
    const startDate = new Date(baseDate);
    startDate.setDate(baseDate.getDate() - 7);

    // Make sure we don't display past days relative to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      startDate.setTime(today.getTime());
    }

    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  })();

  // Map dates to pricing
  const datePriceMap = new Map<string, number>();
  dateOffers.forEach((offer) => {
    datePriceMap.set(offer.departureDate, parseFloat(offer.price.total));
  });

  // Calculate pricing thresholds for coloring
  const prices = dateOffers.map((o) => parseFloat(o.price.total)).filter((p) => !isNaN(p));
  let minPrice = 0;
  let maxPrice = 0;
  let q25 = 0;
  let q75 = 0;

  if (prices.length > 0) {
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    q25 = minPrice + 0.25 * range;
    q75 = minPrice + 0.75 * range;
  }

  const getCellColorClass = (price: number | undefined, isSelected: boolean) => {
    if (isSelected) {
      return "bg-primary border-primary text-white";
    }
    if (price === undefined) {
      return "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-slate-800 text-slate-500";
    }

    // Color thresholding
    if (price <= q25) {
      return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400";
    } else if (price <= q75) {
      return "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400";
    } else {
      return "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400";
    }
  };

  const formatDateString = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Scroll current selected date into view on mount or change
  useEffect(() => {
    if (containerRef.current) {
      const selectedEl = containerRef.current.querySelector("[data-selected='true']");
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [departureDate, loading]);

  if (loading && dateOffers.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[70px] h-20 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && dateOffers.length === 0) {
    return null; // Don't show price calendar if it fails and there's no data
  }

  if (calendarDays.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">Price Calendar</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cheapest flight dates from {origin} to {destination}
          </p>
        </div>
        {prices.length > 0 && (
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Budget
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Mid-range
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Expensive
            </span>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x scroll-smooth"
      >
        {calendarDays.map((day) => {
          const dateStr = formatDateString(day);
          const isSelected = dateStr === departureDate;
          const priceVal = datePriceMap.get(dateStr);
          const dayName = day.toLocaleDateString([], { weekday: "short" });
          const dayNum = day.getDate();
          const monthName = day.toLocaleDateString([], { month: "short" });

          return (
            <button
              key={dateStr}
              data-selected={isSelected}
              onClick={() => onSelectDate(dateStr)}
              className={`flex-shrink-0 w-20 py-2.5 border rounded-xl flex flex-col items-center justify-between transition-all duration-200 snap-center active:scale-95 ${getCellColorClass(
                priceVal,
                isSelected
              )}`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">
                {dayName}
              </span>
              <span className="text-lg font-extrabold leading-tight">
                {dayNum}
              </span>
              <span className="text-[10px] font-semibold tracking-wide mb-1 opacity-75">
                {monthName}
              </span>
              <span className="text-[10px] font-bold mt-1 tracking-tight">
                {priceVal !== undefined ? formatPrice(priceVal, "EUR") : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
