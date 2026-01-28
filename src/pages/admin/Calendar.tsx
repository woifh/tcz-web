import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout';
import { Button } from '../../components/ui/Button';
import { getBlocks, type Block } from '../../api/admin';

export default function Calendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Fetch blocks for the current month
  const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['blocks', startDate, endDate],
    queryFn: () => getBlocks({ start_date: startDate, end_date: endDate }),
  });

  // Group blocks by date
  const blocksByDate = useMemo(() => {
    const map = new Map<string, Block[]>();
    blocks?.forEach((block) => {
      const existing = map.get(block.date) || [];
      existing.push(block);
      map.set(block.date, existing);
    });
    return map;
  }, [blocks]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const today = new Date().toISOString().split('T')[0];

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
          <Button onClick={() => navigate('/admin/blocks')}>Neue Sperrung</Button>
        </div>

        {/* Month Navigation */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="secondary" onClick={prevMonth}>
              &larr; Vorher
            </Button>
            <h2 className="text-lg font-medium">
              {currentMonth.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="secondary" onClick={nextMonth}>
              Naechster &rarr;
            </Button>
          </div>

          {/* Calendar Grid */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-24 bg-muted rounded" />;
                }

                const dateStr = date.toISOString().split('T')[0];
                const dayBlocks = blocksByDate.get(dateStr) || [];
                const isToday = dateStr === today;

                return (
                  <div
                    key={dateStr}
                    className={`h-24 border rounded p-1 overflow-hidden ${
                      isToday ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : 'text-foreground'}`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5 overflow-y-auto max-h-16">
                      {dayBlocks.slice(0, 3).map((block) => (
                        <div
                          key={block.id}
                          className="text-xs px-1 py-0.5 rounded truncate text-white"
                          style={{ backgroundColor: '#6b7280' }}
                          title={`Platz ${block.court_number}: ${block.reason || 'Sperrung'} (${block.start_time}-${block.end_time})`}
                        >
                          P{block.court_number}
                        </div>
                      ))}
                      {dayBlocks.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{dayBlocks.length - 3} mehr</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Legende</h3>
          <div className="flex flex-wrap gap-4">
            {Array.from(new Set(blocks?.map((b) => b.reason))).filter(Boolean).map((reasonName) => (
              <div key={reasonName} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#6b7280' }}
                />
                <span className="text-sm text-muted-foreground">{reasonName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
