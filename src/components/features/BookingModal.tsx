import { useEffect, useCallback, useRef, useReducer } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { createReservation, cancelReservation } from '../../api/reservations';
import { searchMembers, getFavourites } from '../../api/members';
import type { Member } from '../../types';

// Type for active sessions returned by API when booking limit is exceeded
interface ActiveSession {
  reservation_id: number;
  date: string;
  start_time: string;
  court_number: number;
  booked_by_id?: string;
  booked_by_name?: string;
  is_short_notice: boolean;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courtId: number;
  time: string;
  date: string;
  onSuccess: () => void;
}

type BookingStep =
  | { type: 'form' }
  | { type: 'searching' }
  | { type: 'submitting' }
  | { type: 'conflict'; sessions: ActiveSession[] }
  | { type: 'confirmCancel'; session: ActiveSession; allSessions: ActiveSession[] };

// Form state managed by reducer for atomic updates
interface FormState {
  step: BookingStep;
  bookForOther: boolean;
  selectedMember: Member | null;
  searchQuery: string;
  highlightedIndex: number;
  showSearchResults: boolean;
}

type FormAction =
  | { type: 'RESET' }
  | { type: 'SET_STEP'; step: BookingStep }
  | { type: 'SET_BOOK_FOR_OTHER'; value: boolean }
  | { type: 'SET_SELECTED_MEMBER'; member: Member | null }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_HIGHLIGHTED_INDEX'; index: number }
  | { type: 'SET_SHOW_SEARCH_RESULTS'; show: boolean }
  | { type: 'SELECT_MEMBER'; member: Member }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'UPDATE_SEARCH'; query: string };

const initialFormState: FormState = {
  step: { type: 'form' },
  bookForOther: false,
  selectedMember: null,
  searchQuery: '',
  highlightedIndex: -1,
  showSearchResults: false,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'RESET':
      return initialFormState;
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_BOOK_FOR_OTHER':
      return { ...state, bookForOther: action.value };
    case 'SET_SELECTED_MEMBER':
      return { ...state, selectedMember: action.member };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.query };
    case 'SET_HIGHLIGHTED_INDEX':
      return { ...state, highlightedIndex: action.index };
    case 'SET_SHOW_SEARCH_RESULTS':
      return { ...state, showSearchResults: action.show };
    case 'SELECT_MEMBER':
      return {
        ...state,
        selectedMember: action.member,
        searchQuery: `${action.member.firstname} ${action.member.lastname}`,
        showSearchResults: false,
        highlightedIndex: -1,
      };
    case 'CLEAR_SELECTION':
      return {
        ...state,
        bookForOther: false,
        selectedMember: null,
        searchQuery: '',
      };
    case 'UPDATE_SEARCH':
      return {
        ...state,
        searchQuery: action.query,
        selectedMember: null,
        showSearchResults: true,
        highlightedIndex: -1,
      };
    default:
      return state;
  }
}

export default function BookingModal({
  isOpen,
  onClose,
  courtId,
  time,
  date,
  onSuccess,
}: BookingModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);

  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const { step, bookForOther, selectedMember, searchQuery, highlightedIndex, showSearchResults } = formState;

  // Fetch favourites
  const { data: favourites } = useQuery({
    queryKey: ['favourites'],
    queryFn: getFavourites,
    enabled: bookForOther,
  });

  // Search members
  const { data: searchResults } = useQuery({
    queryKey: ['memberSearch', searchQuery],
    queryFn: () => searchMembers(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  // Create reservation mutation
  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['reservationStatus'] });
      onSuccess();
    },
    onError: (error: unknown) => {
      const errorData = (error as { response?: { data?: { active_sessions?: ActiveSession[]; error?: string } } })?.response?.data;

      if (errorData?.active_sessions) {
        dispatch({ type: 'SET_STEP', step: { type: 'conflict', sessions: errorData.active_sessions } });
      }
    },
  });

  // Cancel reservation mutation
  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['reservationStatus'] });
      // Retry the booking after successful cancellation
      handleSubmit();
    },
  });

  // Reset state when modal opens (not on close)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      dispatch({ type: 'RESET' });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Focus search input when booking for other
  useEffect(() => {
    if (bookForOther && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [bookForOther]);

  const displayResults = searchQuery.length >= 2 ? searchResults : favourites;

  const handleSubmit = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: { type: 'submitting' } });
    createMutation.mutate({
      court_id: courtId,
      date,
      start_time: time,
      booked_for_id: bookForOther ? selectedMember?.id : undefined,
    });
  }, [createMutation, courtId, date, time, bookForOther, selectedMember]);

  const handleSelectMember = (member: Member) => {
    dispatch({ type: 'SELECT_MEMBER', member });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!displayResults?.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        dispatch({
          type: 'SET_HIGHLIGHTED_INDEX',
          index: highlightedIndex < displayResults.length - 1 ? highlightedIndex + 1 : highlightedIndex,
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        dispatch({
          type: 'SET_HIGHLIGHTED_INDEX',
          index: highlightedIndex > 0 ? highlightedIndex - 1 : highlightedIndex,
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && displayResults[highlightedIndex]) {
          handleSelectMember(displayResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        dispatch({ type: 'SET_SHOW_SEARCH_RESULTS', show: false });
        break;
    }
  };

  const handleCancelSession = (session: ActiveSession) => {
    if (step.type !== 'conflict') return;
    dispatch({ type: 'SET_STEP', step: { type: 'confirmCancel', session, allSessions: step.sessions } });
  };

  const confirmCancellation = () => {
    if (step.type !== 'confirmCancel') return;
    cancelMutation.mutate(step.session.reservation_id);
  };

  const formatTime = (t: string) => t.slice(0, 5);
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Render conflict resolution modal
  if (step.type === 'conflict') {
    const isShortNoticeConflict = step.sessions.some((s) => s.is_short_notice);

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isShortNoticeConflict ? 'Kurzfristige Buchung aktiv' : 'Buchungslimit erreicht'}
        data-testid="conflict-modal"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {isShortNoticeConflict
              ? 'Du hast bereits eine aktive kurzfristige Buchung. Kurzfristige Buchungen können nicht storniert werden.'
              : 'Du hast bereits die maximale Anzahl an Buchungen erreicht. Storniere eine bestehende Buchung, um eine neue zu erstellen.'}
          </p>

          <div className="space-y-2">
            <h3 className="font-medium">
              {isShortNoticeConflict ? 'Deine aktive kurzfristige Buchung:' : 'Deine aktiven Buchungen:'}
            </h3>
            {step.sessions.map((session) => (
              <div
                key={session.reservation_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    Platz {session.court_number} - {formatTime(session.start_time)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(session.date)}
                    {session.booked_by_name && session.booked_by_id !== user?.id && (
                      <span className="ml-2">
                        (für {session.booked_by_name})
                      </span>
                    )}
                  </div>
                </div>
                {!session.is_short_notice && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleCancelSession(session)}
                  >
                    Stornieren
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Render cancellation confirmation modal
  if (step.type === 'confirmCancel') {
    const goBackToConflict = () => {
      dispatch({ type: 'SET_STEP', step: { type: 'conflict', sessions: step.allSessions } });
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={goBackToConflict}
        title="Buchung stornieren?"
        data-testid="cancel-confirm-modal"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Möchtest du diese Buchung wirklich stornieren?
          </p>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium">
              Platz {step.session.court_number} - {formatTime(step.session.start_time)}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(step.session.date)}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={goBackToConflict}
            >
              Zurück
            </Button>
            <Button
              variant="danger"
              onClick={confirmCancellation}
              isLoading={cancelMutation.isPending}
              data-testid="confirm-cancel-btn"
            >
              Ja, stornieren
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Render main booking form
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Platz buchen"
      data-testid="booking-modal"
    >
      <div className="space-y-4">
        {/* Booking details */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500">Platz</div>
              <div className="font-semibold">{courtId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Zeit</div>
              <div className="font-semibold">{formatTime(time)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Datum</div>
              <div className="font-semibold">{formatDate(date)}</div>
            </div>
          </div>
        </div>

        {/* Book for self or other */}
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bookFor"
              checked={!bookForOther}
              onChange={() => dispatch({ type: 'CLEAR_SELECTION' })}
              className="text-blue-600"
            />
            <span>Für mich selbst buchen</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bookFor"
              checked={bookForOther}
              onChange={() => dispatch({ type: 'SET_BOOK_FOR_OTHER', value: true })}
              className="text-blue-600"
            />
            <span>Für jemand anderen buchen</span>
          </label>
        </div>

        {/* Member search */}
        {bookForOther && (
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Mitglied suchen..."
              value={searchQuery}
              onChange={(e) => dispatch({ type: 'UPDATE_SEARCH', query: e.target.value })}
              onFocus={() => dispatch({ type: 'SET_SHOW_SEARCH_RESULTS', show: true })}
              onKeyDown={handleSearchKeyDown}
              data-testid="member-search-input"
            />

            {/* Search results dropdown */}
            {showSearchResults && displayResults && displayResults.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto"
                data-testid="search-results"
              >
                {searchQuery.length < 2 && favourites && favourites.length > 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500 border-b">
                    Favoriten
                  </div>
                )}
                {displayResults.map((member, index) => (
                  <button
                    key={member.id}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 ${
                      index === highlightedIndex ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectMember(member)}
                    data-testid={`member-result-${member.id}`}
                  >
                    <span className="font-medium">
                      {member.firstname} {member.lastname}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={step.type === 'submitting'}
            disabled={bookForOther && !selectedMember}
            data-testid="submit-booking-btn"
          >
            Buchen
          </Button>
        </div>
      </div>
    </Modal>
  );
}
