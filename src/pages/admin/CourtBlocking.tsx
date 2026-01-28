import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '../../components/layout';
import { Button, Modal, Alert, useToast } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { CourtGrid } from '../../components/features/blocks/CourtGrid';
import { BlockListItem } from '../../components/features/blocks/BlockListItem';
import {
  getBlocks,
  getBlockReasons,
  createBlocks,
  updateBlockBatch,
  deleteBlockBatch,
  type Block,
} from '../../api/admin';

const COURTS = [1, 2, 3, 4, 5, 6];

interface BlockFormData {
  courts: number[];
  date: string;
  start_time: string;
  end_time: string;
  reason_id: number | null;
  details: string;
}

export interface BlockGroup {
  batchId: string;
  blocks: Block[];
  date: string;
  startTime: string;
  endTime: string;
  courtNumbers: number[];
  reasonName: string;
  details?: string;
  createdByName?: string;
  isTemporary: boolean;
}

interface ConflictInfo {
  batch_id: string;
  date: string;
  start_time: string;
  end_time: string;
  court_numbers: number[];
  reason_name: string | null;
  conflicting_court: number | null;
  details?: string;
  created_by_name?: string;
}

interface ReservationConflict {
  reservation_id: number;
  court_number: number;
  date: string;
  time: string;
  booked_for: string;
  booked_for_id: string;
}

const getInitialFormData = (): BlockFormData => ({
  courts: [],
  date: new Date().toISOString().split('T')[0],
  start_time: '08:00',
  end_time: '22:00',
  reason_id: null,
  details: '',
});

export default function CourtBlocking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [formData, setFormData] = useState<BlockFormData>(getInitialFormData);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [originalEditInfo, setOriginalEditInfo] = useState<{
    courts: number[];
    date: string;
    start_time: string;
    end_time: string;
    reason_name: string;
    details: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<BlockGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [conflictError, setConflictError] = useState<ConflictInfo | null>(null);
  const [reservationConflicts, setReservationConflicts] = useState<ReservationConflict[] | null>(null);
  const [pendingConfirmData, setPendingConfirmData] = useState<{ isUpdate: boolean; batchId?: string } | null>(null);

  const isAdmin = user?.role === 'administrator';
  const isTeamster = user?.role === 'teamster';

  // Check for edit mode from URL
  const editBatchIdFromUrl = searchParams.get('edit');

  // Fetch all blocks from today onwards (no end date limit)
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ['blocks', 'upcoming', today],
    queryFn: () => getBlocks({ start_date: today }),
  });

  // Fetch block reasons
  const { data: reasons } = useQuery({
    queryKey: ['blockReasons'],
    queryFn: getBlockReasons,
  });

  // Filter reasons based on role
  const availableReasons = useMemo(() => {
    if (!reasons) return [];
    if (isAdmin) return reasons;
    if (isTeamster) return reasons.filter((r) => r.teamster_usable);
    return [];
  }, [reasons, isAdmin, isTeamster]);

  // Group blocks by batch_id
  const blockGroups = useMemo((): BlockGroup[] => {
    if (!blocks) return [];

    const groupMap = new Map<string, Block[]>();

    blocks.forEach((block) => {
      const key = block.batch_id || `single_${block.id}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(block);
    });

    const groups: BlockGroup[] = [];

    groupMap.forEach((groupBlocks, batchId) => {
      const first = groupBlocks[0];
      const courtNumbers = groupBlocks.map((b) => b.court_number).sort((a, b) => a - b);

      groups.push({
        batchId,
        blocks: groupBlocks,
        date: first.date,
        startTime: first.start_time.slice(0, 5),
        endTime: first.end_time.slice(0, 5),
        courtNumbers,
        reasonName: first.reason_name || 'Sperrung',
        details: first.details || first.comment,
        createdByName: first.created_by_name,
        isTemporary: first.is_temporary || false,
      });
    });

    // Sort by date and time
    return groups.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [blocks]);

  // Filter blocks by search query
  const filteredBlockGroups = useMemo(() => {
    if (!searchQuery.trim()) return blockGroups;
    const q = searchQuery.toLowerCase();
    return blockGroups.filter(
      (g) =>
        g.reasonName.toLowerCase().includes(q) ||
        g.details?.toLowerCase().includes(q) ||
        g.createdByName?.toLowerCase().includes(q) ||
        g.courtNumbers.some((c) => c.toString().includes(q))
    );
  }, [blockGroups, searchQuery]);

  // Load edit batch data when editBatchIdFromUrl is set
  useEffect(() => {
    if (editBatchIdFromUrl && blockGroups.length > 0) {
      const group = blockGroups.find((g) => g.batchId === editBatchIdFromUrl);
      if (group) {
        /* eslint-disable react-hooks/set-state-in-effect -- Intentional: sync form state from URL params */
        setEditingBatchId(group.batchId);
        const first = group.blocks[0];
        setFormData({
          courts: group.courtNumbers,
          date: group.date,
          start_time: group.startTime,
          end_time: group.endTime,
          reason_id: first.reason_id,
          details: group.details || '',
        });
        // Store original values for display (only set once when entering edit mode)
        setOriginalEditInfo((prev) =>
          prev
            ? prev
            : {
                courts: group.courtNumbers,
                date: group.date,
                start_time: group.startTime,
                end_time: group.endTime,
                reason_name: group.reasonName,
                details: group.details || '',
              }
        );
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } else if (!editBatchIdFromUrl) {
      // URL param was cleared - reset edit state
      setEditingBatchId(null);
      setOriginalEditInfo(null);
    }
  }, [editBatchIdFromUrl, blockGroups]);

  // Derive time error from form data (computed, not state)
  const timeError = formData.start_time && formData.end_time ? formData.start_time >= formData.end_time : false;

  // Check if selected reason is temporary
  const selectedReason = useMemo(() => {
    if (!formData.reason_id || !reasons) return null;
    return reasons.find((r) => r.id === formData.reason_id) || null;
  }, [formData.reason_id, reasons]);

  const isTemporaryBlock = selectedReason?.is_temporary === true;

  // Helper to extract conflict info from error
  const extractConflictInfo = (error: unknown): ConflictInfo | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = error as any;
    return axiosError?.response?.data?.conflict || null;
  };

  // Helper to extract reservation conflicts from error
  const extractReservationConflicts = (error: unknown): ReservationConflict[] | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = error as any;
    return axiosError?.response?.data?.reservation_conflicts || null;
  };

  // Clear conflicts when form data changes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Intentional: clear stale conflict state when form inputs change */
    setConflictError(null);
    setReservationConflicts(null);
    setPendingConfirmData(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [formData.courts, formData.date, formData.start_time, formData.end_time]);

  // Create blocks mutation (batch)
  const createMutation = useMutation({
    mutationFn: createBlocks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setConflictError(null);
      setReservationConflicts(null);
      setPendingConfirmData(null);
    },
    onError: (error) => {
      const resConflicts = extractReservationConflicts(error);
      if (resConflicts) {
        setReservationConflicts(resConflicts);
        setPendingConfirmData({ isUpdate: false });
        return;
      }
      const conflict = extractConflictInfo(error);
      if (conflict) {
        setConflictError(conflict);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosError = error as any;
        showToast(axiosError?.response?.data?.error || 'Fehler beim Erstellen der Sperrung', 'error');
      }
    },
  });

  // Update batch mutation
  const updateMutation = useMutation({
    mutationFn: ({
      batchId,
      data,
    }: {
      batchId: string;
      data: { court_ids: number[]; date: string; start_time: string; end_time: string; reason_id: number; details?: string; confirm?: boolean };
    }) => updateBlockBatch(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setConflictError(null);
      setReservationConflicts(null);
      setPendingConfirmData(null);
    },
    onError: (error) => {
      const resConflicts = extractReservationConflicts(error);
      if (resConflicts) {
        setReservationConflicts(resConflicts);
        setPendingConfirmData({ isUpdate: true, batchId: editingBatchId || undefined });
        return;
      }
      const conflict = extractConflictInfo(error);
      if (conflict) {
        setConflictError(conflict);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosError = error as any;
        showToast(axiosError?.response?.data?.error || 'Fehler beim Aktualisieren der Sperrung', 'error');
      }
    },
  });

  // Delete batch mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBlockBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setDeleteModal(null);
      showToast('Sperrung gelöscht', 'success');
    },
    onError: () => {
      showToast('Fehler beim Löschen der Sperrung', 'error');
    },
  });

  const handleSubmit = async (e: React.FormEvent, isClone = false) => {
    e.preventDefault();

    if (formData.courts.length === 0) {
      showToast('Bitte mindestens einen Platz auswählen', 'error');
      return;
    }

    if (!formData.reason_id) {
      showToast('Bitte einen Grund auswählen', 'error');
      return;
    }

    if (timeError) {
      showToast('Endzeit muss nach Startzeit liegen', 'error');
      return;
    }

    try {
      if (editingBatchId && !isClone) {
        // Update existing batch using batch_id
        await updateMutation.mutateAsync({
          batchId: editingBatchId,
          data: {
            court_ids: formData.courts,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            reason_id: formData.reason_id!,
            details: formData.details,
          },
        });
        showToast('Sperrung aktualisiert', 'success');
        // Stay in edit mode - user must click Cancel to exit
      } else {
        // Create new blocks as a batch (all courts in one request)
        const result = await createMutation.mutateAsync({
          court_ids: formData.courts,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          reason_id: formData.reason_id!,
          details: formData.details,
        });
        showToast(isClone ? 'Neue Sperrung erstellt' : 'Sperrung erstellt', 'success');
        // Enter edit mode for the newly created event
        setEditingBatchId(result.batch_id);
        setSearchParams({ edit: result.batch_id });
      }
    } catch {
      // Error already handled in mutation
    }
  };

  const handleCancel = () => {
    setEditingBatchId(null);
    setFormData(getInitialFormData());
    setOriginalEditInfo(null);
    setSearchParams({});
  };

  const handleEdit = (group: BlockGroup) => {
    setSearchParams({ edit: group.batchId });
  };

  const handleDeleteBatch = async (group: BlockGroup) => {
    // Delete entire batch using batch_id
    try {
      await deleteMutation.mutateAsync(group.batchId);
    } catch {
      // Error handled in mutation
    }
  };

  const handleConfirmReservationCancellation = async () => {
    if (!pendingConfirmData || !formData.reason_id) return;

    try {
      if (pendingConfirmData.isUpdate && pendingConfirmData.batchId) {
        // Update with confirmation
        await updateMutation.mutateAsync({
          batchId: pendingConfirmData.batchId,
          data: {
            court_ids: formData.courts,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            reason_id: formData.reason_id,
            details: formData.details,
            confirm: true,
          },
        });
        showToast('Sperrung aktualisiert', 'success');
      } else {
        // Create with confirmation
        const result = await createMutation.mutateAsync({
          court_ids: formData.courts,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          reason_id: formData.reason_id,
          details: formData.details,
          confirm: true,
        });
        showToast('Sperrung erstellt', 'success');
        // Enter edit mode for the newly created event
        setEditingBatchId(result.batch_id);
        setSearchParams({ edit: result.batch_id });
      }
    } catch {
      // Error already handled in mutation
    }
  };

  const toggleCourt = (courtId: number) => {
    setFormData((prev) => ({
      ...prev,
      courts: prev.courts.includes(courtId) ? prev.courts.filter((c) => c !== courtId) : [...prev.courts, courtId],
    }));
  };

  const selectAllCourts = () => {
    setFormData((prev) => ({ ...prev, courts: [...COURTS] }));
  };

  const clearAllCourts = () => {
    setFormData((prev) => ({ ...prev, courts: [] }));
  };

  const formatCourtsDisplay = (courts: number[]) => {
    if (courts.length === 1) {
      return `Platz ${courts[0]}`;
    }
    return `Plätze ${courts.join(', ')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-AT', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const canEditGroup = (group: BlockGroup) => {
    if (isAdmin) return true;
    if (isTeamster) {
      const first = group.blocks[0];
      return first.created_by_id === user?.id;
    }
    return false;
  };

  const isFormValid = formData.courts.length > 0 && formData.reason_id !== null && !timeError;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Platz-Sperrungen</h1>
          <p className="text-muted-foreground text-sm">Court-Blockierungen verwalten</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Column - Left Side (1/3) */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border">
              {/* Header - Blue for edit mode, Green for create */}
              <div className={editingBatchId ? 'bg-info px-4 py-3' : 'bg-primary px-4 py-3'}>
                <h2 className="text-white font-semibold flex items-center gap-2">
                  {editingBatchId ? <span className="material-icons text-xl">edit</span> : <span className="material-icons text-xl">add</span>}
                  {editingBatchId ? 'Sperrung bearbeiten' : 'Neue Sperrung'}
                </h2>
              </div>

              <form onSubmit={(e) => handleSubmit(e, false)} className="p-4 space-y-4">
                {/* Edit Mode Info - Shows ORIGINAL values, not current form values */}
                {editingBatchId && originalEditInfo && (
                  <div className="bg-muted/50 border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Bearbeitung
                      </span>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                        title="Bearbeitung abbrechen"
                      >
                        <span className="material-icons text-base">close</span>
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {originalEditInfo.courts.map((court) => (
                          <span
                            key={court}
                            className="px-2 py-0.5 rounded text-xs font-bold bg-primary text-primary-foreground"
                          >
                            {court}
                          </span>
                        ))}
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground border border-border">
                          {originalEditInfo.reason_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="material-icons text-sm">schedule</span>
                        <span>
                          {(() => {
                            const date = new Date(originalEditInfo.date);
                            const today = new Date();
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            if (date.toDateString() === today.toDateString()) return 'Heute';
                            if (date.toDateString() === tomorrow.toDateString()) return 'Morgen';
                            return date.toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' });
                          })()}
                        </span>
                        <span>•</span>
                        <span>{originalEditInfo.start_time} - {originalEditInfo.end_time}</span>
                      </div>
                      {originalEditInfo.details && (
                        <div className="text-xs text-muted-foreground">{originalEditInfo.details}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Courts */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Plätze *
                  </label>
                  <CourtGrid
                    selectedCourts={formData.courts}
                    onToggle={toggleCourt}
                    onSelectAll={selectAllCourts}
                    onClearAll={clearAllCourts}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Datum *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                {/* Time Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Von *
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Bis *
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Time Error */}
                {timeError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span className="material-icons text-xs">warning</span>
                    Ungültige Zeitspanne
                  </p>
                )}

                {/* Reason */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Grund *
                  </label>
                  <select
                    value={formData.reason_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reason_id: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                  >
                    <option value="">Grund auswählen...</option>
                    {availableReasons.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Temporary block warning */}
                {isTemporaryBlock && (
                  <Alert variant="warning">
                    <span className="material-icons text-sm flex-shrink-0">warning</span>
                    <span>Reservierungen werden pausiert und können wiederhergestellt werden.</span>
                  </Alert>
                )}

                {/* Details */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Details
                  </label>
                  <input
                    type="text"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                    placeholder="Optional..."
                  />
                </div>

                {/* Block Conflict Error */}
                {conflictError && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-destructive font-semibold text-xs uppercase tracking-wide">
                      <span className="material-icons text-base">warning</span>
                      Blockierungs-Konflikt
                    </div>
                    <p className="text-xs text-destructive/80">
                      Ein Platz kann nur eine Sperrung zur gleichen Zeit haben!
                    </p>
                    <div className="bg-background rounded-md p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {conflictError.court_numbers.map((court) => (
                          <span
                            key={court}
                            className="px-2 py-0.5 rounded text-xs font-bold bg-primary text-primary-foreground"
                          >
                            {court}
                          </span>
                        ))}
                        <span className="text-sm font-medium text-foreground ml-1">
                          {conflictError.reason_name || 'Sperrung'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(conflictError.date).toLocaleDateString('de-AT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        • {conflictError.start_time} - {conflictError.end_time}
                      </div>
                      {conflictError.details && (
                        <div className="text-xs text-muted-foreground">{conflictError.details}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reservation Conflict Warning */}
                {reservationConflicts && reservationConflicts.length > 0 && (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-warning font-semibold text-xs uppercase tracking-wide">
                      <span className="material-icons text-base">warning</span>
                      Reservierungen betroffen
                    </div>

                    <p className="text-xs text-warning/80 font-medium">
                      Folgende {reservationConflicts.length} Reservierung{reservationConflicts.length > 1 ? 'en' : ''} werden unwiderruflich storniert:
                    </p>

                    <div className="bg-background rounded-md divide-y divide-border max-h-40 overflow-y-auto">
                      {reservationConflicts.map((c) => (
                        <div key={c.reservation_id} className="p-2.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary text-primary-foreground">
                              {c.court_number}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {c.booked_for}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(c.date).toLocaleDateString('de-AT', {
                              day: 'numeric',
                              month: 'short',
                            })} • {c.time} Uhr
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        onClick={handleConfirmReservationCancellation}
                        variant="danger"
                        isLoading={isPending}
                        className="flex-1"
                      >
                        {reservationConflicts.length} Reservierung{reservationConflicts.length > 1 ? 'en' : ''} stornieren
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setReservationConflicts(null);
                          setPendingConfirmData(null);
                        }}
                        variant="outline"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button type="submit" disabled={!isFormValid} isLoading={isPending} className="w-full">
                    <span className="material-icons text-base">add</span>
                    {editingBatchId ? 'Aktualisieren' : 'Erstellen'}
                  </Button>
                  {editingBatchId && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!isFormValid}
                        isLoading={isPending}
                        onClick={(e) => handleSubmit(e, true)}
                        className="w-full"
                      >
                        Als neues Event speichern
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleCancel} className="w-full">
                        Abbrechen
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Blocks List Column - Right Side (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border">
              {/* Blue Header */}
              <div className="bg-info px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <span className="material-icons text-xl">event</span>
                    Kommende Sperrungen
                  </h2>
                  <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs text-white font-bold">
                    {filteredBlockGroups.length}
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="p-3 bg-muted/50 border-b border-border">
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Suche nach Grund, Details, Platz..."
                    className="w-full pl-9 pr-9 py-2 text-sm border border-input rounded-lg bg-background focus:border-info focus:ring-1 focus:ring-info/20 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <span className="material-icons text-base">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Blocks List */}
              <div className="divide-y divide-border max-h-[calc(100vh-300px)] overflow-y-auto">
                {blocksLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2" />
                    <span className="text-muted-foreground">Lade Sperrungen...</span>
                  </div>
                ) : filteredBlockGroups.length > 0 ? (
                  filteredBlockGroups.map((group) => (
                    <BlockListItem
                      key={group.batchId}
                      group={group}
                      onEdit={handleEdit}
                      onDelete={setDeleteModal}
                      canEdit={canEditGroup(group)}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'Keine Sperrungen gefunden.' : 'Keine kommenden Sperrungen.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Modal isOpen={true} onClose={() => setDeleteModal(null)} title="Sperrung löschen">
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <span className="material-icons text-2xl text-destructive">warning</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Möchten Sie diese Sperrung wirklich löschen?</p>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-3">
              <div className="font-medium text-foreground">{formatCourtsDisplay(deleteModal.courtNumbers)}</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(deleteModal.date)} • {deleteModal.startTime} - {deleteModal.endTime}
              </div>
              <div className="text-sm text-muted-foreground">
                {deleteModal.reasonName}
                {deleteModal.details && ` • ${deleteModal.details}`}
              </div>
              {deleteModal.blocks.length > 1 && (
                <div className="text-xs text-info mt-1">{deleteModal.blocks.length} Plätze betroffen</div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="danger"
                onClick={() => handleDeleteBatch(deleteModal)}
                isLoading={deleteMutation.isPending}
                className="flex-1"
              >
                {deleteModal.blocks.length > 1 ? `${deleteModal.blocks.length} Sperrungen löschen` : 'Sperrung löschen'}
              </Button>
              <Button variant="secondary" onClick={() => setDeleteModal(null)} className="flex-1">
                Abbrechen
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
