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
    if (action === 'create' || action.includes('create')) return 'bg-success/20 text-success';
    if (action === 'delete' || action === 'cancel' || action.includes('delete')) return 'bg-destructive/20 text-destructive';
    if (action === 'update' || action.includes('update')) return 'bg-warning/20 text-warning';
    if (action === 'suspend' || action === 'deactivate') return 'bg-warning/20 text-warning';
    if (action === 'unsuspend' || action === 'reactivate') return 'bg-success/20 text-success';
    if (action === 'login' || action === 'logout') return 'bg-info/20 text-info';
    return 'bg-muted text-muted-foreground';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'block': return 'bg-primary/20 text-primary';
      case 'reservation': return 'bg-info/20 text-info';
      case 'member': return 'bg-success/20 text-success';
      case 'reason': return 'bg-warning/20 text-warning';
      default: return 'bg-muted text-muted-foreground';
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
        <h1 className="text-2xl font-bold text-foreground">Aktivitätsprotokoll</h1>

        {/* Actor Filter */}
        <div className="flex gap-2">
          {actorFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActorFilter(filter.value)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                actorFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-muted/80 border'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
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
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center text-muted-foreground">
            Keine Einträge gefunden
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Zeitpunkt</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">Typ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Akteur</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Aktion</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => {
                    const actorType = getActorType(entry);
                    return (
                      <tr key={`${entry.timestamp}-${index}`} className="border-b last:border-b-0 hover:bg-muted/80" data-testid={`audit-entry-${index}`}>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
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
                                  ? 'bg-primary/20 text-primary'
                                  : actorType === 'system'
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-info/20 text-info'
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
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
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
        <div className="text-sm text-muted-foreground text-center">
          {filteredEntries.length} von {auditLog?.length || 0} Einträgen
        </div>
      </div>
    </MainLayout>
  );
}
