import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../components/layout';
import { useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { getReservations, cancelReservation, type ReservationsResponse } from '../api/reservations';
import type { Reservation } from '../types';

export default function Reservations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelling, setCancelling] = useState<number | null>(null);

  // Fetch reservations
  const { data, isLoading } = useQuery<ReservationsResponse>({
    queryKey: ['reservations'],
    queryFn: () => getReservations(false),
  });

  const reservations = data?.reservations || [];

  // Split reservations: my own vs bookings I made for others
  const myReservations = reservations.filter((r) => r.booked_for_id === user?.id);
  const bookingsForOthers = reservations.filter(
    (r) => r.booked_by_id === user?.id && r.booked_for_id !== user?.id
  );

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['reservationStatus'] });
      setCancelling(null);
      showToast('Buchung erfolgreich storniert', 'success');
    },
    onError: () => {
      setCancelling(null);
      showToast('Fehler beim Stornieren der Buchung', 'error');
    },
  });

  const handleCancel = async (reservationId: number) => {
    setCancelling(reservationId);
    cancelMutation.mutate(reservationId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0)?.toUpperCase() || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0)?.toUpperCase() : '';
    return first + last;
  };

  const renderReservationRow = (reservation: Reservation, showBookedFor = false) => {
    const memberName = showBookedFor
      ? (reservation.booked_for || '')
      : (reservation.booked_by || '');
    const memberId = showBookedFor ? reservation.booked_for_id : reservation.booked_by_id;
    const hasProfilePicture = showBookedFor
      ? reservation.booked_for_has_profile_picture
      : reservation.booked_by_has_profile_picture;
    const profilePictureVersion = showBookedFor
      ? reservation.booked_for_profile_picture_version
      : reservation.booked_by_profile_picture_version;

    return (
      <tr
        key={reservation.id}
        className={reservation.status === 'suspended' ? 'bg-yellow-50' : ''}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <span>Platz {reservation.court_id}</span>
          {reservation.status === 'suspended' && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              <span className="material-icons text-xs mr-1">warning</span>
              Vorübergehend gesperrt
            </span>
          )}
          {reservation.is_short_notice && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
              Kurzfristige Buchung
            </span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">{formatDate(reservation.date)}</td>
        <td className="px-6 py-4 whitespace-nowrap">
          {reservation.start_time} - {reservation.end_time}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            {hasProfilePicture ? (
              <img
                src={`/api/members/${memberId}/profile-picture?v=${profilePictureVersion}`}
                alt=""
                style={{ width: 28, height: 28, borderRadius: '9999px', objectFit: 'cover', flexShrink: 0 }}
                loading="lazy"
              />
            ) : (
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '9999px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: 12,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getInitials(memberName)}
              </span>
            )}
            <span>{memberName}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {!reservation.is_short_notice ? (
              <button
                onClick={() => handleCancel(reservation.id)}
                disabled={cancelling === reservation.id}
                className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Stornieren"
              >
                {cancelling === reservation.id ? (
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            ) : (
              <span className="text-gray-500 text-sm">Nicht stornierbar</span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <MainLayout>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Meine aktiven Buchungen</h2>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-gray-600 mt-2">Lade Buchungen...</p>
          </div>
        ) : myReservations.length === 0 ? (
          <p className="text-gray-600">Du hast gerade keine aktiven Buchungen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uhrzeit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gebucht von
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myReservations.map((r) => renderReservationRow(r, false))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bookings Made for Others */}
        {bookingsForOthers.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="material-icons">people</span>
              Buchungen für andere
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platz
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uhrzeit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gebucht für
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookingsForOthers.map((r) => renderReservationRow(r, true))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
