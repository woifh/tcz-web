import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAvailability } from '../api/courts';

const COURTS = [1, 2, 3, 4, 5, 6];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

interface DayCard {
  isoDate: string;
  dayNumber: number;
  monthAbbr: string;
  weekdayAbbr: string;
  isToday: boolean;
}

export default function Overview() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [windowStart, setWindowStart] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Calculate visible days (5-7 based on screen)
  const [visibleCount, setVisibleCount] = useState(7);

  useEffect(() => {
    const updateCount = () => {
      setVisibleCount(window.innerWidth < 640 ? 5 : 7);
    };
    updateCount();
    window.addEventListener('resize', updateCount);
    return () => window.removeEventListener('resize', updateCount);
  }, []);

  const visibleDays = useMemo((): DayCard[] => {
    const days: DayCard[] = [];
    const startDate = new Date(windowStart);
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < visibleCount; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const isoDate = date.toISOString().split('T')[0];

      days.push({
        isoDate,
        dayNumber: date.getDate(),
        monthAbbr: date.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''),
        weekdayAbbr: date.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''),
        isToday: isoDate === today,
      });
    }
    return days;
  }, [windowStart, visibleCount]);

  // Fetch availability
  const { data: availability, isLoading, error } = useQuery({
    queryKey: ['availability', selectedDate],
    queryFn: () => getAvailability(selectedDate),
  });

  // Get current hour from API response
  const currentHour = availability?.current_hour ?? new Date().getHours();

  // Build slot lookup from availability data
  const slotLookup = useMemo(() => {
    const lookup: Record<string, { status: string; details: Record<string, unknown> | null }> = {};
    if (!availability?.courts) return lookup;

    for (const court of availability.courts) {
      for (const occ of court.occupied) {
        const key = `${court.court_number}-${occ.time}`;
        lookup[key] = { status: occ.status, details: occ.details };
      }
    }
    return lookup;
  }, [availability]);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isSelectedToday = selectedDate === new Date().toISOString().split('T')[0];
  const isSelectedDateToday = selectedDate === new Date().toISOString().split('T')[0];

  const shiftWindow = (direction: number) => {
    const start = new Date(windowStart);
    start.setDate(start.getDate() + direction);
    setWindowStart(start.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setWindowStart(today);
  };

  const getDayCellClasses = (day: DayCard) => {
    const isSelected = day.isoDate === selectedDate;
    if (isSelected) {
      return 'bg-green-600 text-white';
    }
    if (day.isToday) {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

  const getSlotClasses = (court: number, time: string) => {
    const slot = slotLookup[`${court}-${time}`];
    const hour = parseInt(time.split(':')[0], 10);
    const isPast = isSelectedDateToday && hour < currentHour;

    if (isPast) {
      return 'bg-gray-200 text-gray-400 rounded-lg text-center py-3 text-sm';
    }

    if (!slot) {
      return 'bg-white border border-gray-300 text-gray-600 rounded-lg text-center py-3 text-sm';
    }

    if (slot.status === 'blocked') {
      const isTemporary = slot.details?.is_temporary;
      if (isTemporary) {
        return 'bg-yellow-400 text-yellow-900 rounded-lg text-center py-3 text-sm';
      }
      return 'bg-gray-400 text-white rounded-lg text-center py-3 text-sm';
    }

    // Reserved
    return 'bg-green-500 text-white rounded-lg text-center py-3 text-sm';
  };

  const getSlotContent = (court: number, time: string): string => {
    const slot = slotLookup[`${court}-${time}`];
    const hour = parseInt(time.split(':')[0], 10);
    const isPast = isSelectedDateToday && hour < currentHour;

    if (isPast) {
      return 'Vergangen';
    }

    if (!slot) {
      return 'Frei';
    }

    if (slot.status === 'blocked') {
      const reasonName = slot.details?.reason_name;
      return typeof reasonName === 'string' ? reasonName : 'Gesperrt';
    }

    // Reserved - show name
    const bookedFor = slot.details?.booked_for;
    return typeof bookedFor === 'string' ? bookedFor : 'Reserviert';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-green-600">TCZ Platzübersicht</h1>
          <Link
            to="/login"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <span className="material-icons text-sm">login</span>
            Anmelden
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Date Navigation */}
          <div className="mb-6">
            {/* Row 1: Date Header + Heute Button */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => dateInputRef.current?.showPicker()}
                className="flex items-center gap-1 text-lg font-semibold text-gray-900"
              >
                <span>{formatDateHeader(selectedDate)}</span>
                <span className="material-icons text-gray-500 text-base">expand_more</span>
              </button>
              <button
                onClick={goToToday}
                disabled={isSelectedToday}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isSelectedToday
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                Heute
              </button>
            </div>

            {/* Row 2: Arrow + Day Cards + Arrow */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => shiftWindow(-1)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
              >
                <span className="material-icons">chevron_left</span>
              </button>

              <div className="flex-1 flex justify-center gap-1 sm:gap-2">
                {visibleDays.map((day) => (
                  <button
                    key={day.isoDate}
                    onClick={() => setSelectedDate(day.isoDate)}
                    className={`flex flex-col items-center py-2 px-1 sm:px-3 rounded-lg min-w-0 flex-1 ${getDayCellClasses(day)}`}
                  >
                    <span className="text-[10px] font-medium opacity-60">{day.monthAbbr}</span>
                    <span className="text-lg sm:text-xl font-bold">{day.dayNumber}</span>
                    <span className="text-[10px] font-medium opacity-60">{day.weekdayAbbr}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => shiftWindow(1)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
              >
                <span className="material-icons">chevron_right</span>
              </button>
            </div>

            {/* Hidden native date picker */}
            <input
              type="date"
              ref={dateInputRef}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setWindowStart(e.target.value);
              }}
              className="sr-only"
            />
          </div>

          {/* Legend */}
          <div className="hidden lg:flex gap-6 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
              <span>Verfügbar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Gebucht</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span>Vorübergehend gesperrt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span>Blockiert</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <span>Vergangen</span>
            </div>
          </div>

          {/* Court Availability Grid */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Lade Verfügbarkeit...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">Fehler beim Laden der Verfügbarkeit</div>
            ) : (
              <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: '4px' }}>
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-center font-semibold text-sm w-16 bg-gray-100 rounded-lg">
                      Zeit
                    </th>
                    {COURTS.map((court) => (
                      <th key={court} className="px-2 py-2 text-center font-semibold text-sm bg-gray-100 rounded-lg">
                        Platz {court}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time) => (
                    <tr key={time}>
                      <td className="px-2 py-3 font-semibold text-center text-sm bg-gray-50 rounded-lg text-gray-600">
                        {time}
                      </td>
                      {COURTS.map((court) => (
                        <td key={court} className={getSlotClasses(court, time)}>
                          {getSlotContent(court, time)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Information Section for Anonymous Users */}
          <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-icons text-gray-600">info</span>
              <h3 className="text-xl font-semibold text-gray-800">
                Möchtest du einen Platz reservieren?
              </h3>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>
                Um Tennisplätze zu reservieren und weitere Funktionen zu nutzen, musst du dich
                anmelden.
              </p>
              <div className="flex gap-4 mt-4">
                <Link
                  to="/login"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
                >
                  <span className="material-icons text-sm">login</span>
                  Anmelden
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
