import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../components/layout';
import { useToast } from '../components/ui';
import { getFavourites, addFavourite, removeFavourite, searchMembers } from '../api/members';
import { getApiUrl } from '../lib/utils';

export default function Favourites() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch favourites
  const { data: favourites, isLoading, error } = useQuery({
    queryKey: ['favourites'],
    queryFn: getFavourites,
  });

  // Search members
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['memberSearch', searchQuery],
    queryFn: () => searchMembers(searchQuery),
    enabled: searchQuery.length >= 1,
  });

  // Filter out already-favourited members from search results
  const filteredResults = searchResults?.filter(
    (member) => !favourites?.some((fav) => fav.id === member.id)
  );

  // Add favourite mutation
  const addMutation = useMutation({
    mutationFn: addFavourite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
      setSuccessMessage('Favorit erfolgreich hinzugefügt!');
      setTimeout(() => setSuccessMessage(''), 3000);
      // Refresh search results
      queryClient.invalidateQueries({ queryKey: ['memberSearch'] });
      // Focus search input
      searchInputRef.current?.focus();
    },
    onError: (error: Error) => {
      showToast(error.message || 'Fehler beim Hinzufügen', 'error');
    },
  });

  // Remove favourite mutation
  const removeMutation = useMutation({
    mutationFn: removeFavourite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
      showToast('Favorit erfolgreich entfernt', 'success');
    },
    onError: () => {
      showToast('Fehler beim Entfernen des Favoriten', 'error');
    },
  });

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredResults?.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredResults[highlightedIndex]) {
          addMutation.mutate(filteredResults[highlightedIndex].id);
        }
        break;
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  };

  const handleClose = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0)?.toUpperCase() || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0)?.toUpperCase() : '';
    return first + last;
  };

  return (
    <MainLayout>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Meine Favoriten</h2>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Favorit hinzufügen
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Füge Mitglieder zu deinen Favoriten hinzu, um schnell Buchungen für sie zu erstellen.
        </p>

        {/* Member Search Component */}
        {isSearchOpen && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">Mitglied suchen</h3>

            {/* Search Input */}
            <div className="relative mb-4">
              <label htmlFor="member-search-input" className="sr-only">
                Mitglied suchen
              </label>
              <input
                type="text"
                id="member-search-input"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                className="w-full border border-gray-300 rounded px-4 py-2 pr-20"
                placeholder="Mitglied suchen..."
                aria-label="Mitglied suchen"
                autoComplete="off"
              />
              {/* Clear Button */}
              {searchQuery.length > 0 && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Suche löschen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {/* Loading Spinner */}
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="animate-spin h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-100 text-green-800 p-3 rounded mb-2">{successMessage}</div>
            )}

            {/* Search Results Container */}
            <div className="space-y-2 max-h-96 overflow-y-auto" role="listbox" aria-label="Suchergebnisse">
              {/* Empty State */}
              {!isSearching && searchQuery.length > 0 && filteredResults?.length === 0 && (
                <div className="text-gray-500 p-4 text-center">Keine Mitglieder gefunden</div>
              )}

              {/* Results */}
              {filteredResults?.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex justify-between items-center p-3 border border-gray-200 rounded hover:bg-gray-100 ${
                    highlightedIndex === index ? 'bg-blue-100 border-blue-500' : ''
                  }`}
                  role="option"
                  aria-label={`${member.firstname} ${member.lastname}, ${member.email}`}
                >
                  <div>
                    <div className="font-semibold">{member.firstname} {member.lastname}</div>
                    <div className="text-sm text-gray-600">{member.email}</div>
                  </div>
                  <button
                    onClick={() => addMutation.mutate(member.id)}
                    className="bg-green-600 text-white py-1 px-4 rounded hover:bg-green-700 text-sm"
                    aria-label={`${member.firstname} ${member.lastname} zu Favoriten hinzufügen`}
                  >
                    Hinzufügen
                  </button>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="bg-gray-300 text-gray-700 py-2 px-6 rounded hover:bg-gray-400"
              >
                Schließen
              </button>
            </div>
          </div>
        )}

        {/* Favourites List */}
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Lade Favoriten...</p>
          ) : error ? (
            <p className="text-center text-red-500 py-8">Fehler beim Laden der Favoriten</p>
          ) : favourites?.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Keine Favoriten vorhanden. Fügen Sie Mitglieder hinzu, um schnell für sie zu buchen.
            </p>
          ) : (
            favourites?.map((fav) => (
              <div
                key={fav.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {fav.has_profile_picture ? (
                    <img
                      src={getApiUrl(`/api/members/${fav.id}/profile-picture?v=${fav.profile_picture_version}`)}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-medium flex items-center justify-center flex-shrink-0 text-sm">
                      {getInitials(`${fav.firstname} ${fav.lastname}`)}
                    </span>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{fav.firstname} {fav.lastname}</h3>
                    <p className="text-gray-600 text-sm">{fav.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeMutation.mutate(fav.id)}
                  className="text-red-600 hover:text-red-900 p-1"
                  title="Entfernen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
