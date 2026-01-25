import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../../components/layout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getAuditLog, type AuditLogEntry } from '../../api/admin';

// Action labels in German (matching Flask's 'action' field)
const ACTION_LABELS: Record<string, string> = {
  // Reservations
  create: 'Erstellt',
  cancel: 'Storniert',
  suspend: 'Suspendiert',
  unsuspend: 'Reaktiviert',
  // Blocks
  create_block: 'Sperrung erstellt',
  update: 'Geaendert',
  delete: 'Geloescht',
  // Block Reasons
  create_reason: 'Sperrgrund erstellt',
  update_reason: 'Sperrgrund geaendert',
  delete_reason: 'Sperrgrund geloescht',
  deactivate_reason: 'Sperrgrund deaktiviert',
  reactivate_reason: 'Sperrgrund reaktiviert',
  // Auth
  login: 'Anmeldung',
  logout: 'Abmeldung',
  failed_login: 'Fehlgeschlagene Anmeldung',
  // Members
  create_member: 'Mitglied erstellt',
  update_member: 'Mitglied geaendert',
  delete_member: 'Mitglied geloescht',
  deactivate: 'Deaktiviert',
  reactivate: 'Reaktiviert',
  verify_email: 'E-Mail verifiziert',
  resend_verification: 'Verifizierung erneut gesendet',
  // Password
  password_change: 'Passwort geaendert',
  password_reset: 'Passwort zurueckgesetzt',
  // Payment
  update_payment_deadline: 'Zahlungsfrist geaendert',
  confirm_payment: 'Zahlung bestaetigt',
  reject_payment: 'Zahlungsbestaetigung abgelehnt',
  request_payment_confirmation: 'Zahlungsbestaetigung angefordert',
  // Feature Flags
  update_feature_flag: 'Feature Flag geaendert',
  // Profile
  update_profile_picture: 'Profilbild geaendert',
  delete_profile_picture: 'Profilbild geloescht',
};

type ActorFilter = 'all' | 'admin' | 'member' | 'system';

// Type filter for API call
const TYPE_FILTERS = [
  { value: 'all', label: 'Alle Aktionen' },
  { value: 'reservation', label: 'Buchungen' },
  { value: 'block', label: 'Sperrungen' },
  { value: 'member', label: 'Mitglieder' },
  { value: 'reason', label: 'Sperrgruende' },
];

export default function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState<ActorFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Helper to determine actor type from performer_role
  const getActorType = (entry: AuditLogEntry): ActorFilter => {
    if (entry.user === 'System' || !entry.performer_role || entry.performer_role === 'system') {
      return 'system';
    }
    if (entry.performer_role === 'administrator' || entry.performer_role === 'teamster') {
      return 'admin';
    }
    return 'member';
  };

  // Fetch audit log
  const { data: auditLog, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['auditLog', typeFilter],
    queryFn: () => getAuditLog(typeFilter === 'all' ? undefined : { type: typeFilter }),
  });

  // Filter entries (type filtering is done by API, here we do search/date/actor)
  const filteredEntries = useMemo(() => {
    if (!auditLog) return [];

    return auditLog.filter((entry) => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const userName = entry.user?.toLowerCase() || '';
        const action = ACTION_LABELS[entry.action]?.toLowerCase() || entry.action.toLowerCase();
        const details = JSON.stringify(entry.details).toLowerCase();
        if (!userName.includes(search) && !action.includes(search) && !details.includes(search)) {
          return false;
        }
      }

      // Date filter
      if (dateFrom) {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        if (entryDate < dateFrom) return false;
      }
      if (dateTo) {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        if (entryDate > dateTo) return false;
      }

      // Actor filter
      if (actorFilter !== 'all') {
        const actorType = getActorType(entry);
        if (actorType !== actorFilter) return false;
      }

      return true;
    });
  }, [auditLog, searchQuery, dateFrom, dateTo, actorFilter]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDetails = (entry: AuditLogEntry) => {
    const { details } = entry;

    if (!details || typeof details !== 'string') {
      return null;
    }

    // Details is already formatted as a string by Flask
    return details;
  };

  const getActionColor = (action: string) => {
    if (action === 'create' || action.includes('create')) return 'bg-green-100 text-green-700';
    if (action === 'delete' || action === 'cancel' || action.includes('delete')) return 'bg-red-100 text-red-700';
    if (action === 'update' || action.includes('update')) return 'bg-yellow-100 text-yellow-700';
    if (action === 'suspend' || action === 'deactivate') return 'bg-orange-100 text-orange-700';
    if (action === 'unsuspend' || action === 'reactivate') return 'bg-teal-100 text-teal-700';
    if (action === 'login' || action === 'logout') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'block': return 'bg-purple-100 text-purple-700';
      case 'reservation': return 'bg-blue-100 text-blue-700';
      case 'member': return 'bg-green-100 text-green-700';
      case 'reason': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'block': return 'Sperrung';
      case 'reservation': return 'Buchung';
      case 'member': return 'Mitglied';
      case 'reason': return 'Sperrgrund';
      default: return type;
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setActorFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const actorFilters: { value: ActorFilter; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Mitglied' },
    { value: 'system', label: 'System' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Aktivitätsprotokoll</h1>

        {/* Actor Filter */}
        <div className="flex gap-2">
          {actorFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActorFilter(filter.value)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                actorFilter === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="audit-search-input"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="type-filter"
            >
              {TYPE_FILTERS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Von"
              data-testid="date-from-input"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Bis"
              data-testid="date-to-input"
            />
          </div>
          {(searchQuery || typeFilter !== 'all' || actorFilter !== 'all' || dateFrom || dateTo) && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Filter zuruecksetzen
              </Button>
            </div>
          )}
        </div>

        {/* Audit Log List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Laden...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            Keine Einträge gefunden
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Zeitpunkt</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 hidden sm:table-cell">Typ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Akteur</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Aktion</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 hidden lg:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => {
                    const actorType = getActorType(entry);
                    return (
                      <tr key={`${entry.timestamp}-${index}`} className="border-b last:border-b-0 hover:bg-gray-50" data-testid={`audit-entry-${index}`}>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {formatTimestamp(entry.timestamp)}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`px-2 py-1 text-xs rounded ${getTypeColor(entry.type)}`}>
                            {getTypeLabel(entry.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.user}</span>
                            <span
                              className={`px-1.5 py-0.5 text-xs rounded ${
                                actorType === 'admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : actorType === 'system'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {actorType === 'admin' ? 'Admin' : actorType === 'system' ? 'System' : 'Mitglied'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${getActionColor(entry.action)}`}>
                            {ACTION_LABELS[entry.action] || entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                          {formatDetails(entry) || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="text-sm text-gray-500 text-center">
          {filteredEntries.length} von {auditLog?.length || 0} Einträgen
        </div>
      </div>
    </MainLayout>
  );
}
