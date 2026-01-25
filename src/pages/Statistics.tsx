import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { getMemberStatistics } from '../api/members';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export default function Statistics() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string>('');

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['statistics', user?.id, selectedYear],
    queryFn: () => getMemberStatistics(user!.id, selectedYear ? parseInt(selectedYear) : undefined),
    enabled: !!user?.id,
  });

  const maxMonthlyCount =
    stats?.monthly_breakdown && stats.monthly_breakdown.length > 0
      ? Math.max(...stats.monthly_breakdown.map((m) => m.count))
      : 1;

  return (
    <MainLayout>
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="material-icons">bar_chart</span>
              Meine Statistiken
            </h2>
          </div>
          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="year-filter" className="text-sm text-gray-600">
              Jahr:
            </label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Gesamt</option>
              {stats?.available_years?.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4"></div>
            <span className="text-gray-500">Lade Statistiken...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <span className="material-icons text-4xl text-red-400 mb-2">error_outline</span>
            <p className="text-red-600">{(error as Error).message}</p>
            <button onClick={() => refetch()} className="mt-4 text-blue-600 hover:underline">
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && stats && stats.summary.total_bookings === 0 && (
          <div className="text-center py-12">
            <span className="material-icons text-4xl text-gray-300 mb-2">sports_tennis</span>
            <p className="text-gray-500">Noch keine Buchungen vorhanden.</p>
            <a href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
              Jetzt einen Platz buchen
            </a>
          </div>
        )}

        {/* Stats Content */}
        {!isLoading && !error && stats && stats.summary.total_bookings > 0 && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-700">{stats.summary.total_bookings}</div>
                <div className="text-sm text-green-600">Buchungen gesamt</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-700">{stats.summary.bookings_by_others}</div>
                <div className="text-sm text-blue-600">Gebucht von anderen</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-700">{stats.summary.cancellation_count}</div>
                <div className="text-sm text-orange-600">Stornierungen</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-700">{stats.summary.cancellation_rate}%</div>
                <div className="text-sm text-purple-600">Stornierungsrate</div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Partners */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800">
                  <span className="material-icons text-green-600">group</span>
                  Häufigste Spielpartner
                </h3>
                {stats.partners.top_partners.length > 0 ? (
                  <div className="space-y-3">
                    {stats.partners.top_partners.map((partner, index) => (
                      <div key={partner.member_id} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                        {/* Rank Badge */}
                        <div
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0
                              ? 'bg-yellow-400 text-yellow-900'
                              : index === 1
                                ? 'bg-gray-300 text-gray-700'
                                : index === 2
                                  ? 'bg-orange-300 text-orange-800'
                                  : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </div>
                        {/* Profile Picture */}
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {partner.has_profile_picture ? (
                            <img
                              src={`/api/members/${partner.member_id}/profile-picture?v=${partner.profile_picture_version}`}
                              className="w-full h-full object-cover"
                              alt={partner.name}
                            />
                          ) : (
                            <span className="text-green-600 font-medium text-sm">{getInitials(partner.name)}</span>
                          )}
                        </div>
                        {/* Name and Count */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{partner.name}</div>
                          <div className="text-sm text-gray-500">
                            {partner.play_count} {partner.play_count === 1 ? 'Spiel' : 'Spiele'}
                          </div>
                        </div>
                        {/* Last Played */}
                        {partner.last_played && (
                          <div className="text-xs text-gray-400 flex-shrink-0">{formatDate(partner.last_played)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm py-4 text-center">Noch keine Spielpartner</div>
                )}
                {stats.partners.total_unique_partners > 0 && (
                  <div className="mt-4 pt-3 border-t text-sm text-gray-500 text-center">
                    {stats.partners.total_unique_partners} verschiedene Spielpartner insgesamt
                  </div>
                )}
              </div>

              {/* Monthly Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800">
                  <span className="material-icons text-green-600">calendar_month</span>
                  Buchungen pro Monat
                </h3>
                {stats.monthly_breakdown.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {stats.monthly_breakdown.map((month) => (
                      <div key={`${month.year}-${month.month}`} className="flex items-center gap-3">
                        <div className="w-28 text-sm text-gray-600 flex-shrink-0">
                          {month.month_name}
                          {!selectedYear && <span className="text-gray-400 ml-1">{month.year}</span>}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-green-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((month.count / maxMonthlyCount) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="w-8 text-sm text-right font-medium text-gray-700">{month.count}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm py-4 text-center">Keine Daten vorhanden</div>
                )}
              </div>
            </div>

            {/* Preferences Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Court Preferences */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-800">
                  <span className="material-icons text-green-600 text-base">sports_tennis</span>
                  Lieblings-Plätze
                </h3>
                {stats.court_preferences.length > 0 ? (
                  <div className="space-y-2">
                    {stats.court_preferences.map((court) => (
                      <div key={court.court_number} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-green-600 text-white text-xs font-bold rounded">
                            {court.court_number}
                          </span>
                          <span className="text-sm text-gray-700">Platz {court.court_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-full rounded-full"
                              style={{ width: `${court.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{court.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm py-4 text-center">Keine Daten</div>
                )}
              </div>

              {/* Time Preferences */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-800">
                  <span className="material-icons text-green-600 text-base">schedule</span>
                  Lieblings-Uhrzeiten
                </h3>
                {stats.time_preferences.favorite_time_slots.length > 0 ? (
                  <div className="space-y-2">
                    {stats.time_preferences.favorite_time_slots.map((slot) => (
                      <div key={slot.time} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{slot.time} Uhr</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${slot.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{slot.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm py-4 text-center">Keine Daten</div>
                )}
              </div>

              {/* Day Preferences */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-800">
                  <span className="material-icons text-green-600 text-base">today</span>
                  Lieblings-Wochentage
                </h3>
                {stats.time_preferences.favorite_days.length > 0 ? (
                  <div className="space-y-2">
                    {stats.time_preferences.favorite_days.map((day) => (
                      <div key={day.day} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{day.day}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-full rounded-full"
                              style={{ width: `${day.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{day.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm py-4 text-center">Keine Daten</div>
                )}
              </div>
            </div>

            {/* Member Since */}
            {stats.summary.member_since && (
              <div className="text-center text-sm text-gray-500 pt-4 border-t">
                Mitglied seit {formatDate(stats.summary.member_since)}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
