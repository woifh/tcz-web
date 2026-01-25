import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useAvailability } from '../hooks/useAvailability';
import { availabilityService } from '../api/availabilityService';
import { getReservations, getReservationStatus, cancelReservation } from '../api/reservations';
import { BookingModal } from '../components/features';
import api from '../api/client';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00
const COURTS = [1, 2, 3, 4, 5, 6];

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatReservationDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

type SlotStatus = 'available' | 'reserved' | 'blocked' | 'own' | 'own_short_notice' | 'past' | 'short_notice' | 'suspended';

interface SlotInfo {
  status: SlotStatus;
  details?: {
    reservation_id?: number;
    booked_for?: string;
    booked_for_id?: string;
    booked_for_has_profile_picture?: boolean;
    booked_for_profile_picture_version?: number;
    is_short_notice?: boolean;
    is_temporary?: boolean;
    reason?: string;
    block_id?: number;
    can_cancel?: boolean;
  };
}

// Generate full date range for navigation (30 days past, 90 days future)
function generateDateRange(daysBefore: number, daysAfter: number) {
  const today = new Date();
  const days = [];

  for (let i = -daysBefore; i <= daysAfter; i++) {
    const date = addDays(today, i);
    days.push({
      isoDate: formatDateISO(date),
      dayNumber: date.getDate(),
      weekdayAbbr: date.toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2),
      monthAbbr: date.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''),
      isToday: i === 0,
    });
  }

  return days;
}

// Calculate window start index to center on a given date
function getWindowStartIndexForDate(dateRange: { isoDate: string }[], isoDate: string, visibleCount: number): number {
  const index = dateRange.findIndex((d) => d.isoDate === isoDate);
  if (index === -1) return 0;

  const centerOffset = Math.floor(visibleCount / 2);
  return Math.max(0, Math.min(index - centerOffset, dateRange.length - visibleCount));
}

export default function Dashboard() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    courtId: number;
    time: string;
    date: string;
  } | null>(null);

  const dateStr = formatDateISO(selectedDate);
  const isSelectedToday = isSameDay(selectedDate, new Date());

  // Number of day cards to show based on screen size
  const [visibleDayCount, setVisibleDayCount] = useState(7);

  // Full date range (30 days past, 90 days future) - stable reference
  const dateRange = useMemo(() => generateDateRange(30, 90), []);

  // Window start index - tracks which slice of dateRange is visible
  const [windowStartIndex, setWindowStartIndex] = useState(() =>
    getWindowStartIndexForDate(generateDateRange(30, 90), formatDateISO(new Date()), 7)
  );

  useEffect(() => {
    const updateDayCount = () => {
      const newCount = window.innerWidth < 640 ? 5 : 7;
      if (newCount !== visibleDayCount) {
        setVisibleDayCount(newCount);
        // Re-center window when screen size changes
        setWindowStartIndex(getWindowStartIndexForDate(dateRange, formatDateISO(selectedDate), newCount));
      }
    };
    updateDayCount();
    window.addEventListener('resize', updateDayCount);
    return () => window.removeEventListener('resize', updateDayCount);
  }, [dateRange, selectedDate, visibleDayCount]);

  // Visible days are a slice of the full date range
  const visibleDays = useMemo(
    () => dateRange.slice(windowStartIndex, windowStartIndex + visibleDayCount),
    [dateRange, windowStartIndex, visibleDayCount]
  );

  // Navigate using arrow buttons - only shift window if date goes out of view
  const shiftDate = (offset: number) => {
    const currentIndex = dateRange.findIndex((d) => d.isoDate === formatDateISO(selectedDate));
    const newIndex = currentIndex + offset;

    // Check bounds
    if (newIndex < 0 || newIndex >= dateRange.length) return;

    // Update selected date
    const newDate = new Date(dateRange[newIndex].isoDate);
    setSelectedDate(newDate);

    // Only shift window if selected date would go out of view
    const visibleEnd = windowStartIndex + visibleDayCount - 1;
    if (newIndex < windowStartIndex) {
      setWindowStartIndex(newIndex);
    } else if (newIndex > visibleEnd) {
      setWindowStartIndex(newIndex - visibleDayCount + 1);
    }
  };

  // Select a day card - don't shift window, just select
  const selectDayCard = (isoDate: string) => {
    setSelectedDate(new Date(isoDate));
  };

  // Go to today - center window on today
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setWindowStartIndex(getWindowStartIndexForDate(dateRange, formatDateISO(today), visibleDayCount));
  };

  // Date picker change - center window on selected date
  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    setWindowStartIndex(getWindowStartIndexForDate(dateRange, e.target.value, visibleDayCount));
  };

  // Fetch availability with caching and prefetching
  const { data: availability, isLoading: isLoadingAvailability } = useAvailability(dateStr);

  // Fetch reservation status
  const { data: status } = useQuery({
    queryKey: ['reservationStatus'],
    queryFn: getReservationStatus,
    staleTime: 30 * 1000,
  });

  // Fetch user's reservations
  const { data: reservationsData } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => getReservations(false),
    staleTime: 30 * 1000,
  });

  // Separate reservations into own bookings and bookings for others
  const userReservations = useMemo(() => {
    if (!reservationsData?.reservations || !user) return [];
    return reservationsData.reservations.filter((r) => r.booked_for_id === user.id);
  }, [reservationsData, user]);

  const bookingsForOthers = useMemo(() => {
    if (!reservationsData?.reservations || !user) return [];
    return reservationsData.reservations.filter(
      (r) => r.booked_by_id === user.id && r.booked_for_id !== user.id
    );
  }, [reservationsData, user]);

  // Cancel reservation mutation
  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      // Refresh availability cache for current date
      availabilityService.fetchSingle(dateStr);
      queryClient.invalidateQueries({ queryKey: ['reservationStatus'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      showToast('Buchung erfolgreich storniert', 'success');
    },
    onError: () => {
      showToast('Fehler beim Stornieren der Buchung', 'error');
    },
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/members/me/confirm-payment');
      return response.data;
    },
    onSuccess: () => {
      showToast('Zahlungsbestätigung wurde angefordert', 'success');
      refreshProfile();
    },
    onError: () => {
      showToast('Fehler bei der Zahlungsbestätigung', 'error');
    },
  });

  // Resend verification mutation
  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/resend-verification');
      return response.data;
    },
    onSuccess: () => {
      showToast('Bestätigungs-E-Mail wurde gesendet! Bitte prüfe dein Postfach.', 'success');
    },
    onError: () => {
      showToast('Fehler beim Senden der E-Mail', 'error');
    },
  });

  // Transform sparse availability to dense grid
  const grid = useMemo(() => {
    if (!availability) return null;

    const result: Record<number, Record<string, SlotInfo>> = {};
    const currentHour = availability.current_hour;
    const isToday = dateStr === formatDateISO(new Date());

    for (const court of COURTS) {
      result[court] = {};
      for (const hour of HOURS) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        const isPast = isToday && hour < currentHour;

        result[court][time] = {
          status: isPast ? 'past' : 'available',
        };
      }
    }

    // Fill in occupied slots
    for (const court of availability.courts) {
      for (const occupied of court.occupied) {
        let status: SlotStatus;
        const isOwn = occupied.details?.booked_for_id === user?.id;

        if (occupied.status === 'reserved' || occupied.status === 'short_notice') {
          const isShortNotice = occupied.status === 'short_notice' || occupied.details?.is_short_notice;
          if (isOwn) {
            status = isShortNotice ? 'own_short_notice' : 'own';
          } else if (isShortNotice) {
            status = 'short_notice';
          } else {
            status = 'reserved';
          }
        } else if (occupied.status === 'blocked_temporary') {
          // Flask returns 'blocked_temporary' for temporary blocks
          status = 'suspended';
        } else if (occupied.status === 'blocked') {
          status = 'blocked';
        } else {
          status = 'blocked'; // fallback
        }

        result[court.court_number][occupied.time] = {
          status,
          details: occupied.details || undefined,
        };
      }
    }

    return result;
  }, [availability, dateStr, user?.id]);

  const handleSlotClick = (courtId: number, time: string) => {
    const slot = grid?.[courtId]?.[time];
    if (!slot) return;

    if (slot.status === 'available') {
      setBookingModal({
        isOpen: true,
        courtId,
        time,
        date: dateStr,
      });
    } else if ((slot.status === 'own' || slot.status === 'own_short_notice') && slot.details?.reservation_id && slot.details?.can_cancel) {
      // Allow cancelling own reservations from the grid only if API says can_cancel
      handleCancelReservation(slot.details.reservation_id);
    }
  };

  const handleBookingSuccess = () => {
    setBookingModal(null);
    // Refresh availability cache for current date
    availabilityService.fetchSingle(dateStr);
    queryClient.invalidateQueries({ queryKey: ['reservationStatus'] });
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    showToast('Buchung erfolgreich erstellt', 'success');
  };

  const handleCancelReservation = (reservationId: number) => {
    if (confirm('Möchtest du diese Buchung wirklich stornieren?')) {
      cancelMutation.mutate(reservationId);
    }
  };

  const handleConfirmPayment = () => {
    if (
      confirm(
        'Hast du deinen Mitgliedsbeitrag bereits bezahlt? Mit dieser Bestätigung informierst du den Vorstand, dass deine Zahlung erfolgt ist.'
      )
    ) {
      confirmPaymentMutation.mutate();
    }
  };

  const getSlotClasses = (slot: SlotInfo) => {
    const base =
      'h-14 w-full rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-default';
    const canCancel = slot.details?.can_cancel;
    switch (slot.status) {
      case 'available':
        return `${base} bg-white border border-gray-300 text-gray-700 cursor-pointer hover:bg-green-50 hover:border-green-400`;
      case 'reserved':
        return `${base} bg-green-500 text-white`;
      case 'short_notice':
        return `${base} bg-orange-500 text-white`;
      case 'own':
        return canCancel
          ? `${base} bg-green-600 text-white ring-2 ring-green-300 cursor-pointer hover:bg-green-700`
          : `${base} bg-green-600 text-white ring-2 ring-green-300`;
      case 'own_short_notice':
        return canCancel
          ? `${base} bg-orange-500 text-white ring-2 ring-orange-300 cursor-pointer hover:bg-orange-600`
          : `${base} bg-orange-500 text-white ring-2 ring-orange-300`;
      case 'blocked':
        return `${base} bg-gray-400 text-white`;
      case 'suspended':
        return `${base} bg-yellow-400 text-yellow-900`;
      case 'past':
        return `${base} bg-gray-200 text-gray-400`;
    }
  };

  const getSlotContent = (slot: SlotInfo) => {
    switch (slot.status) {
      case 'available':
        return 'Frei';
      case 'reserved':
      case 'short_notice':
      case 'own':
      case 'own_short_notice': {
        const name = (slot.status === 'own' || slot.status === 'own_short_notice') ? 'Meine' : (slot.details?.booked_for?.split(' ')[0] || 'Belegt');
        const hasProfilePic = slot.details?.booked_for_has_profile_picture;
        const profilePicVersion = slot.details?.booked_for_profile_picture_version;
        const memberId = slot.details?.booked_for_id;

        if (hasProfilePic && memberId) {
          return (
            <span className="flex items-center gap-1">
              <img
                src={`/api/members/${memberId}/profile-picture?v=${profilePicVersion}`}
                alt=""
                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                loading="lazy"
              />
              <span className="truncate">{name}</span>
            </span>
          );
        }
        return name;
      }
      case 'blocked':
      case 'suspended':
        return slot.details?.reason || 'Gesperrt';
      case 'past':
        return '';
    }
  };

  const getDayCellClasses = (day: { isoDate: string; isToday: boolean }) => {
    const isSelected = day.isoDate === dateStr;

    if (isSelected) {
      return 'bg-green-600 text-white';
    }
    if (day.isToday) {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-gray-50 text-gray-700 hover:bg-gray-100';
  };

  // Payment status calculations
  const hasUnpaidFee = user && user.fee_paid === false;
  const paymentConfirmationRequested = user?.payment_confirmation_requested;
  const paymentDeadline = status?.payment_deadline;
  const isPastDeadline = paymentDeadline?.is_past ?? false;
  const daysUntilDeadline = paymentDeadline?.days_until ?? 0;

  return (
    <MainLayout>
      {/* Payment Status Banners */}
      {hasUnpaidFee && (
        <>
          {paymentConfirmationRequested ? (
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="flex items-center">
                <span className="material-icons text-blue-600 mr-3">hourglass_empty</span>
                <div>
                  <p className="text-blue-800 font-semibold">Zahlungsbestätigung wird geprüft</p>
                  {isPastDeadline && (
                    <p className="text-blue-600 text-xs mt-1">
                      Buchungen sind bis zur Bestätigung weiterhin gesperrt.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : isPastDeadline ? (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="material-icons text-red-600 mr-3">block</span>
                  <div>
                    <p className="text-red-800 font-semibold">Buchungen gesperrt</p>
                    <p className="text-red-700 text-sm">
                      Die Zahlungsfrist ist abgelaufen. Bitte zahl deinen Beitrag, um wieder buchen zu können.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                  className="ml-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <span className="material-icons text-sm">check_circle</span>
                  Zahlung bestätigen
                </button>
              </div>
            </div>
          ) : paymentDeadline ? (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="material-icons text-yellow-600 mr-3">schedule</span>
                  <div>
                    <p className="text-yellow-800 font-semibold">Mitgliedsbeitrag offen</p>
                    <p className="text-yellow-700 text-sm">
                      {daysUntilDeadline === 0 ? (
                        <>
                          Zahlungsfrist: <strong>Heute</strong>
                        </>
                      ) : daysUntilDeadline === 1 ? (
                        <>
                          Noch <strong>1 Tag</strong> bis zur Zahlungsfrist
                        </>
                      ) : (
                        <>
                          Noch <strong>{daysUntilDeadline} Tage</strong> bis zur Zahlungsfrist
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                  className="ml-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <span className="material-icons text-sm">check_circle</span>
                  Zahlung bestätigen
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="material-icons text-yellow-600 mr-3">warning</span>
                  <div>
                    <p className="text-yellow-800 font-semibold">Mitgliedsbeitrag offen</p>
                    <p className="text-yellow-700 text-sm">Dein Mitgliedsbeitrag ist noch nicht bezahlt.</p>
                  </div>
                </div>
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                  className="ml-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <span className="material-icons text-sm">check_circle</span>
                  Zahlung bestätigen
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Email verification reminder */}
      {user && !user.email_verified && (
        <div className="mb-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="material-icons text-orange-600 mr-3">email</span>
              <div>
                <p className="text-orange-800 font-semibold">E-Mail-Adresse nicht bestätigt</p>
                <p className="text-orange-700 text-sm">
                  Du erhältst keine E-Mail-Benachrichtigungen zu deinen Buchungen, bis du deine E-Mail-Adresse
                  bestätigst.
                </p>
              </div>
            </div>
            <button
              onClick={() => resendVerificationMutation.mutate()}
              disabled={resendVerificationMutation.isPending || resendVerificationMutation.isSuccess}
              className={`ml-4 ${
                resendVerificationMutation.isSuccess
                  ? 'bg-green-600'
                  : 'bg-orange-600 hover:bg-orange-700'
              } text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50`}
            >
              <span className="material-icons text-sm">
                {resendVerificationMutation.isSuccess ? 'check' : 'send'}
              </span>
              {resendVerificationMutation.isPending
                ? 'Wird gesendet...'
                : resendVerificationMutation.isSuccess
                  ? 'E-Mail gesendet'
                  : 'E-Mail erneut senden'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Date Navigation */}
        <div className="mb-6">
          {/* Row 1: Date Header + Heute Button */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => dateInputRef.current?.showPicker()}
              className="flex items-center gap-1 text-lg font-semibold text-gray-900"
            >
              <span>{formatDisplayDate(selectedDate)}</span>
              <span className="material-icons text-gray-500 text-base">expand_more</span>
            </button>
            <button
              onClick={goToToday}
              disabled={isSelectedToday}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isSelectedToday ? 'bg-gray-200 text-gray-400' : 'bg-green-100 text-green-700'
              }`}
            >
              Heute
            </button>
          </div>

          {/* Row 2: Arrow + Day Cards + Arrow */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Left Arrow */}
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
            >
              <span className="material-icons">chevron_left</span>
            </button>

            {/* Day Cards */}
            <div className="flex-1 flex justify-center gap-1 sm:gap-2">
              {visibleDays.map((day) => (
                <button
                  key={day.isoDate}
                  onClick={() => selectDayCard(day.isoDate)}
                  className={`flex flex-col items-center py-2 px-1 sm:px-3 rounded-lg min-w-0 flex-1 ${getDayCellClasses(
                    day
                  )}`}
                >
                  <span className="text-[10px] font-medium opacity-60">{day.monthAbbr}</span>
                  <span className="text-lg sm:text-xl font-bold">{day.dayNumber}</span>
                  <span className="text-[10px] font-medium opacity-60">{day.weekdayAbbr}</span>
                </button>
              ))}
            </div>

            {/* Right Arrow */}
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>

          {/* Hidden native date picker */}
          <input
            ref={dateInputRef}
            type="date"
            value={dateStr}
            onChange={handleDatePickerChange}
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
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Kurzfristig gebucht</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span>Blockiert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span>Vorübergehend gesperrt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span>Vergangen</span>
          </div>
        </div>

        {/* Court Availability Grid */}
        <div className="overflow-x-auto">
          {isLoadingAvailability ? (
            <div className="p-8 text-center text-gray-500">Lade Verfügbarkeit...</div>
          ) : grid ? (
            <table
              className="min-w-full table-fixed"
              style={{ borderCollapse: 'separate', borderSpacing: '4px' }}
            >
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
                {HOURS.map((hour) => {
                  const time = `${hour.toString().padStart(2, '0')}:00`;
                  return (
                    <tr key={hour}>
                      <td className="px-2 py-3 font-semibold text-center text-sm w-16 bg-gray-50 rounded-lg text-gray-600">
                        {time}
                      </td>
                      {COURTS.map((court) => {
                        const slot = grid[court][time];
                        return (
                          <td key={court}>
                            <button
                              onClick={() => handleSlotClick(court, time)}
                              className={getSlotClasses(slot)}
                              disabled={slot.status === 'past'}
                              title={slot.details?.booked_for || slot.details?.reason}
                            >
                              {getSlotContent(slot)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">Keine Daten verfügbar</div>
          )}
        </div>
      </div>

      {/* User's Active Booking Sessions */}
      <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-blue-50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <span className="material-icons">event_note</span>
            Meine aktiven Buchungen
          </h3>
          <Link
            to="/reservations"
            className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
          >
            Alle anzeigen
            <span className="material-icons text-sm">arrow_forward</span>
          </Link>
        </div>

        <div className="space-y-3">
          {userReservations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Keine aktiven Buchungen</p>
          ) : (
            userReservations.map((reservation) => (
              <div
                key={reservation.id}
                className={`${
                  reservation.is_suspended
                    ? 'bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400'
                    : 'bg-white rounded-lg p-4 border border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">Platz {reservation.court_number}</h4>
                    <p className="text-sm text-gray-600">
                      {formatReservationDate(reservation.date)} • {reservation.start_time} - {reservation.end_time}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Gebucht für:</span>
                      {reservation.booked_for_has_profile_picture && (
                        <img
                          src={`/api/members/${reservation.booked_for_id}/profile-picture?v=${reservation.booked_for_profile_picture_version}`}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <span>{reservation.booked_for_name}</span>
                    </div>
                    {reservation.is_suspended && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          <span className="material-icons text-xs">warning</span>
                          Vorübergehend gesperrt
                        </span>
                        {reservation.reason && <p className="text-xs text-yellow-700 mt-1">{reservation.reason}</p>}
                      </div>
                    )}
                    {reservation.is_short_notice && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                        Kurzfristige Buchung
                      </span>
                    )}
                  </div>
                  {!reservation.is_short_notice ? (
                    <button
                      onClick={() => handleCancelReservation(reservation.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Stornieren"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">Nicht stornierbar</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Availability Summary */}
        {status && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white rounded p-3">
                <div className="text-gray-600">Verfügbare Buchungsplätze</div>
                <div className="text-lg font-semibold text-green-600">
                  {status.limits.regular_reservations.available} von {status.limits.regular_reservations.limit}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-gray-600">Kurzfristige Buchungen</div>
                <div className="text-lg font-semibold text-orange-600">
                  {status.limits.short_notice_bookings.available} von {status.limits.short_notice_bookings.limit}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bookings Made for Others */}
      {bookingsForOthers.length > 0 && (
        <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-purple-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="material-icons">people</span>
              Buchungen für andere
            </h3>
          </div>
          <div className="space-y-3">
            {bookingsForOthers.map((reservation) => (
              <div
                key={reservation.id}
                className={`${
                  reservation.is_suspended ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-white'
                } rounded-lg p-4 border border-gray-200`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">Platz {reservation.court_number}</h4>
                    <p className="text-sm text-gray-600">
                      {formatReservationDate(reservation.date)} • {reservation.start_time} - {reservation.end_time}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Gebucht für:</span>
                      {reservation.booked_for_has_profile_picture && (
                        <img
                          src={`/api/members/${reservation.booked_for_id}/profile-picture?v=${reservation.booked_for_profile_picture_version}`}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <span>{reservation.booked_for_name}</span>
                    </div>
                    {reservation.is_suspended && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <span className="material-icons text-xs mr-1">warning</span>
                          Vorübergehend gesperrt
                        </span>
                        {reservation.reason && <p className="text-xs text-yellow-700 mt-1">{reservation.reason}</p>}
                      </div>
                    )}
                    {reservation.is_short_notice && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                        Kurzfristige Buchung
                      </span>
                    )}
                  </div>
                  {!reservation.is_short_notice ? (
                    <button
                      onClick={() => handleCancelReservation(reservation.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Stornieren"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">Nicht stornierbar</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <BookingModal
          isOpen={bookingModal.isOpen}
          onClose={() => setBookingModal(null)}
          courtId={bookingModal.courtId}
          time={bookingModal.time}
          date={bookingModal.date}
          onSuccess={handleBookingSuccess}
        />
      )}
    </MainLayout>
  );
}
