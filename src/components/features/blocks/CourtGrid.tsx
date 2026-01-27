import { cn } from '../../../lib/utils';

const COURTS = [1, 2, 3, 4, 5, 6];

interface CourtGridProps {
  selectedCourts: number[];
  onToggle: (court: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function CourtGrid({ selectedCourts, onToggle, onSelectAll, onClearAll }: CourtGridProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {COURTS.map((court) => (
          <button
            key={court}
            type="button"
            onClick={() => onToggle(court)}
            className={cn(
              'py-2 rounded-lg text-sm font-bold transition-all',
              selectedCourts.includes(court)
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {court}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-1.5">
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs text-primary hover:text-primary/80 font-medium"
        >
          Alle
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-primary hover:text-primary/80 font-medium"
        >
          Keine
        </button>
      </div>
    </div>
  );
}

export default CourtGrid;
