import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../../components/layout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui';
import {
  getBlockReasons,
  createBlockReason,
  updateBlockReason,
  deleteBlockReason,
  type BlockReason,
} from '../../api/admin';

interface ReasonFormData {
  name: string;
  teamster_usable: boolean;
  is_temporary: boolean;
}

type SortField = 'name' | 'usage_count' | 'created_at';
type SortDirection = 'asc' | 'desc';

const initialFormData: ReasonFormData = {
  name: '',
  teamster_usable: false,
  is_temporary: false,
};

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Sort indicator component - defined outside to prevent recreation on each render
function SortIndicator({ field, sortField }: { field: SortField; sortField: SortField }) {
  const isActive = sortField === field;
  return (
    <svg className={`w-4 h-4 inline ml-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

export default function BlockReasons() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingReason, setEditingReason] = useState<BlockReason | null>(null);
  const [formData, setFormData] = useState<ReasonFormData>(initialFormData);
  const [deleteModal, setDeleteModal] = useState<BlockReason | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch block reasons
  const { data: reasons, isLoading, isError, error } = useQuery({
    queryKey: ['blockReasons'],
    queryFn: getBlockReasons,
  });

  // Filter and sort reasons
  const filteredAndSortedReasons = useMemo(() => {
    if (!reasons) return [];

    let result = [...reasons];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'de');
          break;
        case 'usage_count':
          comparison = a.usage_count - b.usage_count;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [reasons, searchQuery, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Create reason mutation
  const createMutation = useMutation({
    mutationFn: createBlockReason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockReasons'] });
      setShowForm(false);
      setFormData(initialFormData);
      showToast('Sperrgrund erstellt', 'success');
    },
    onError: () => {
      showToast('Fehler beim Erstellen des Sperrgrundes', 'error');
    },
  });

  // Update reason mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ReasonFormData> }) =>
      updateBlockReason(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockReasons'] });
      setShowForm(false);
      setEditingReason(null);
      setFormData(initialFormData);
      showToast('Sperrgrund aktualisiert', 'success');
    },
    onError: () => {
      showToast('Fehler beim Aktualisieren des Sperrgrundes', 'error');
    },
  });

  // Delete reason mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBlockReason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockReasons'] });
      setDeleteModal(null);
      showToast('Sperrgrund gelöscht', 'success');
    },
    onError: () => {
      showToast('Fehler beim Löschen des Sperrgrundes', 'error');
    },
  });

  const handleEdit = (reason: BlockReason) => {
    setEditingReason(reason);
    setFormData({
      name: reason.name,
      teamster_usable: reason.teamster_usable,
      is_temporary: reason.is_temporary,
    });
    setShowForm(true);
  };

  // Keyboard navigation for modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteModal) {
          setDeleteModal(null);
        } else if (showForm) {
          setShowForm(false);
          setEditingReason(null);
          setFormData(initialFormData);
        }
      }
    },
    [deleteModal, showForm]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Bitte einen Namen eingeben', 'error');
      return;
    }

    if (editingReason) {
      updateMutation.mutate({ id: editingReason.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <MainLayout>
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="material-icons">category</span>
            Sperrungsgründe verwalten
          </h2>
          <p className="text-muted-foreground mt-1">Anpassbare Gründe für Sperrungen erstellen und bearbeiten</p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button
              onClick={() => {
                setEditingReason(null);
                setFormData(initialFormData);
                setShowForm(true);
              }}
              data-testid="create-reason-btn"
              className="bg-primary hover:bg-primary/90"
            >
              <span className="material-icons text-sm mr-1">add</span>
              Neuen Grund erstellen
            </Button>

            {/* Search */}
            <div className="relative">
              <span className="material-icons absolute left-3 top-2.5 text-muted-foreground text-sm">search</span>
              <input
                type="text"
                placeholder="Gründe durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="reason-search-input"
              />
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="material-icons text-sm">info</span>
            <span>{filteredAndSortedReasons.length} Gründe gefunden</span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Lade Sperrungsgründe...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2 text-destructive">
              <span className="material-icons text-sm mt-0.5">error</span>
              <div>
                <span>{(error as Error)?.message || 'Fehler beim Laden der Sperrgründe'}</span>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['blockReasons'] })}
                  >
                    Erneut versuchen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Grund
                        <SortIndicator field="name" sortField={sortField} />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('usage_count')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Verwendungen
                        <SortIndicator field="usage_count" sortField={sortField} />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Berechtigung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Erstellt von
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Erstellt am
                        <SortIndicator field="created_at" sortField={sortField} />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredAndSortedReasons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-icons text-4xl text-muted-foreground/50">category</span>
                          <div>
                            <p className="text-lg font-medium">Keine Sperrungsgründe gefunden</p>
                            <p className="text-sm">Erstelle den ersten Grund, um zu beginnen.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedReasons.map((reason) => (
                      <tr
                        key={reason.id}
                        className={`hover:bg-muted transition-colors ${!reason.is_active ? 'opacity-60 bg-muted' : ''}`}
                        data-testid={`reason-${reason.id}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${reason.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                              {reason.name}
                            </span>
                            {reason.is_temporary && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/20 text-warning">
                                Vorübergehend
                              </span>
                            )}
                            {!reason.is_active && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                Inaktiv
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {reason.usage_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={reason.teamster_usable}
                              disabled
                              className="w-4 h-4 text-primary bg-muted border-input rounded opacity-60"
                            />
                            <span className="text-sm text-foreground">Mannschaftsführer</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {reason.created_by}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(reason.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {reason.is_active && (
                              <>
                                <button
                                  onClick={() => handleEdit(reason)}
                                  className="text-primary hover:text-primary/80 p-2 rounded hover:bg-primary/10 transition-colors"
                                  title="Bearbeiten"
                                  data-testid={`edit-reason-${reason.id}`}
                                >
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setDeleteModal(reason)}
                                  className="text-destructive hover:text-destructive/80 p-2 rounded hover:bg-destructive/10 transition-colors"
                                  title="Löschen"
                                  data-testid={`delete-reason-${reason.id}`}
                                >
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Reason Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingReason(null);
          setFormData(initialFormData);
        }}
        title={editingReason ? 'Sperrgrund bearbeiten' : 'Neuer Sperrgrund'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="z.B. Wartung, Training, Turnier..."
            data-testid="reason-name-input"
            autoFocus
          />

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.teamster_usable}
                onChange={(e) => setFormData({ ...formData, teamster_usable: e.target.checked })}
                className="h-4 w-4 text-primary rounded"
                data-testid="teamster-usable-checkbox"
              />
              <span className="text-sm text-foreground">
                Mannschaftsführer dürfen diesen Grund verwenden
              </span>
            </label>

            {/* Only show is_temporary checkbox when creating (not editing) */}
            {!editingReason && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_temporary}
                  onChange={(e) => setFormData({ ...formData, is_temporary: e.target.checked })}
                  className="h-4 w-4 text-primary rounded mt-0.5"
                  data-testid="is-temporary-checkbox"
                />
                <div>
                  <span className="text-sm text-foreground">
                    Vorübergehende Sperrung (Buchungen werden suspendiert)
                  </span>
                  <p className="text-xs text-warning mt-0.5">
                    ⚠ Diese Einstellung kann nach dem Erstellen nicht mehr geändert werden.
                  </p>
                </div>
              </label>
            )}

            {/* When editing, show the current value as read-only info */}
            {editingReason && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {editingReason.is_temporary ? (
                  <>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/20 text-warning">
                      Vorübergehend
                    </span>
                    <span>(kann nicht geändert werden)</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      Permanent
                    </span>
                    <span>(kann nicht geändert werden)</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingReason(null);
                setFormData(initialFormData);
              }}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
              data-testid="submit-reason-btn"
            >
              {editingReason ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteModal(null)}
          title="Sperrgrund löschen?"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium">{deleteModal.name}</div>
                <div className="text-sm text-muted-foreground">
                  {deleteModal.usage_count} Verwendungen
                </div>
              </div>
            </div>
            {deleteModal.usage_count > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                <p className="text-sm text-warning">
                  Dieser Grund wird aktuell verwendet und kann daher nur deaktiviert werden.
                </p>
              </div>
            )}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium mb-1">Achtung!</p>
              <ul className="text-sm text-destructive space-y-1">
                <li>• Diese Aktion kann nicht rückgängig gemacht werden</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteModal(null)}>
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(deleteModal.id)}
                isLoading={deleteMutation.isPending}
              >
                {deleteModal.usage_count > 0 ? 'Deaktivieren' : 'Löschen'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
