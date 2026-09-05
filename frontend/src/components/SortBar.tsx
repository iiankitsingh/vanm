export type SortOption = "cheapest" | "fastest" | "best";

interface SortBarProps {
  currentSort: SortOption;
  onChange: (sort: SortOption) => void;
  resultsCount: number;
}

export function SortBar({ currentSort, onChange, resultsCount }: SortBarProps) {
  const tabs: Array<{ id: SortOption; label: string; desc: string }> = [
    { id: "cheapest", label: "Cheapest", desc: "Cheapest option first" },
    { id: "fastest", label: "Fastest", desc: "Shortest duration first" },
    { id: "best", label: "Best", desc: "Best price vs time" }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Results Count Info */}
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          We found <span className="font-extrabold text-slate-800 dark:text-slate-100">{resultsCount}</span> flight
          {resultsCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* Sort Options Button Group */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer select-none ${
              currentSort === tab.id
                ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
