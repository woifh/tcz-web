import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '../../components/layout';
import { Button, Modal, useToast } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
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

interface BlockGroup {
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
  const [deleteModal, setDeleteModal] = useState<BlockGroup | null>(null);

  const isAdmin = user?.role === 'administrator';
  const isTeamster = user?.role === 'teamster';

  // Check for edit mode from URL
  const editBatchIdFromUrl = searchParams.get('edit');

  // Fetch upcoming blocks (next 30 days)
  const { today, thirtyDaysLater } = useMemo(() => {
    const now = new Date();
    return {
      today: now.toISOString().split('T')[0],
      thirtyDaysLater: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  }, []);

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ['blocks', 'upcoming', today, thirtyDaysLater],
    queryFn: () => getBlocks({ start_date: today, end_date: thirtyDaysLater }),
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
        reasonName: first.reason?.name || 'Sperrung',
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
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    }
  }, [editBatchIdFromUrl, blockGroups]);

  // Derive time error from form data (computed, not state)
  const timeError = formData.start_time && formData.end_time
    ? formData.start_time >= formData.end_time
    : false;

  // Check if selected reason is temporary
  const selectedReason = useMemo(() => {
    if (!formData.reason_id || !reasons) return null;
    return reasons.find((r) => r.id === formData.reason_id) || null;
  }, [formData.reason_id, reasons]);

  const isTemporaryBlock = selectedReason?.is_temporary === true;

  // Create blocks mutation (batch)
  const createMutation = useMutation({
    mutationFn: createBlocks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: () => {
      showToast('Fehler beim Erstellen der Sperrung', 'error');
    },
  });

  // Update batch mutation
  const updateMutation = useMutation({
    mutationFn: ({
      batchId,
      data,
    }: {
      batchId: string;
      data: { court_ids: number[]; date: string; start_time: string; end_time: string; reason_id: number; details?: string };
    }) => updateBlockBatch(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: () => {
      showToast('Fehler beim Aktualisieren der Sperrung', 'error');
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
      } else {
        // Create new blocks as a batch (all courts in one request)
        await createMutation.mutateAsync({
          court_ids: formData.courts,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          reason_id: formData.reason_id!,
          details: formData.details,
        });
        showToast(isClone ? 'Neue Sperrung erstellt' : 'Sperrung erstellt', 'success');
      }

      // Reset form
      handleCancel();
    } catch {
      // Error already handled in mutation
    }
  };

  const handleCancel = () => {
    setEditingBatchId(null);
    setFormData(getInitialFormData());
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

  const toggleCourt = (courtId: number) => {
    setFormData((prev) => ({
      ...prev,
      courts: prev.courts.includes(courtId)
        ? prev.courts.filter((c) => c !== courtId)
        : [...prev.courts, courtId],
    }));
  };

  const selectAllCourts = () => {
    setFormData((prev) => ({ ...prev, courts: [...COURTS] }));
  };

  const clearAllCourts = () => {
    setFormData((prev) => ({ ...prev, courts: [] }));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-AT', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const formatCourtsDisplay = (courts: number[]) => {
    if (courts.length === 1) {
      return `Platz ${courts[0]}`;
    }
    return `Plätze ${courts.join(', ')}`;
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
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Platz-Sperrungen</h1>

        {/* Block Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {editingBatchId ? (
            <>
              <h2 className="text-xl font-semibold mb-4">Sperrung bearbeiten</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800">
                  <strong>Bearbeitung:</strong>{' '}
                  {formatCourtsDisplay(formData.courts)} -{' '}
                  {new Date(formData.date).toLocaleDateString('de-AT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}{' '}
                  {formData.start_time}-{formData.end_time}
                </p>
              </div>
            </>
          ) : (
            <h2 className="text-xl font-semibold mb-4">Neue Sperrung erstellen</h2>
          )}

          <form onSubmit={(e) => handleSubmit(e, false)} className="bg-gray-50 p-6 rounded-lg">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column: Court Selection */}
              <div className="lg:w-1/3">
                <label className="block text-gray-700 font-semibold mb-2">Plätze auswählen</label>
                <div className="space-y-2">
                  {COURTS.map((court) => (
                    <label key={court} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.courts.includes(court)}
                        onChange={() => toggleCourt(court)}
                        className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      Platz {court}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={selectAllCourts}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Alle auswählen
                  </button>
                  <span className="text-sm text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={clearAllCourts}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Alle abwählen
                  </button>
                </div>
              </div>

              {/* Right Column: Date, Time, Reason, Details */}
              <div className="lg:w-2/3 space-y-4">
                {/* Date & Time */}
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Datum</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Von</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2 w-28"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Bis</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2 w-28"
                    />
                  </div>
                </div>

                {/* Time Error */}
                {timeError && (
                  <div className="text-sm text-red-600">⚠ Endzeit muss nach Startzeit liegen</div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Grund <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.reason_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reason_id: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Grund auswählen...</option>
                    {availableReasons.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.name}
                      </option>
                    ))}
                  </select>

                  {/* Temporary block hint */}
                  {isTemporaryBlock && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      <strong>Vorübergehende Sperre:</strong> Bestehende Reservierungen werden pausiert, nicht
                      storniert. Betroffene Mitglieder werden benachrichtigt. Bei Aufhebung der Sperre werden die
                      Buchungen automatisch wiederhergestellt.
                    </div>
                  )}
                </div>

                {/* Details */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Details (optional)</label>
                  <input
                    type="text"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="z. B. Regen, Reparatur"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {editingBatchId ? (
                    <>
                      <Button type="submit" disabled={!isFormValid} isLoading={isPending}>
                        Sperrung aktualisieren
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!isFormValid}
                        isLoading={isPending}
                        onClick={(e) => handleSubmit(e, true)}
                      >
                        Als neues Event speichern
                      </Button>
                      <Button type="button" variant="secondary" onClick={handleCancel}>
                        Abbrechen
                      </Button>
                    </>
                  ) : (
                    <Button type="submit" disabled={!isFormValid} isLoading={isPending}>
                      Sperrung erstellen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Upcoming Blocks List */}
        <div className="bg-white rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold p-6 pb-4">Kommende Sperrungen</h2>

          {blocksLoading ? (
            <div className="p-4 text-center text-gray-600">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-2" />
              Lade Sperrungen...
            </div>
          ) : blockGroups.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {blockGroups.map((group) => (
                <div
                  key={group.batchId}
                  className="p-4 hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-medium text-gray-900">{formatDate(group.date)}</span>
                      <span className="text-gray-600">
                        {group.startTime} - {group.endTime} • {formatCourtsDisplay(group.courtNumbers)} •
                      </span>
                      <span className="text-sm text-gray-500">
                        {group.reasonName}
                        {group.details && ` / ${group.details}`}
                      </span>
                      {group.createdByName && (
                        <span className="text-xs text-gray-400">von {group.createdByName}</span>
                      )}
                      {group.isTemporary && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Vorübergehend
                        </span>
                      )}
                      {group.blocks.length > 1 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {group.blocks.length} Plätze
                        </span>
                      )}
                    </div>
                  </div>
                  {canEditGroup(group) && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(group)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Bearbeiten"
                      >
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteModal(group)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Löschen"
                      >
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
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-600">Keine kommenden Sperrungen gefunden.</div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Modal isOpen={true} onClose={() => setDeleteModal(null)} title="Sperrung löschen">
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Möchten Sie diese Sperrung wirklich löschen?</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-900">{formatCourtsDisplay(deleteModal.courtNumbers)}</div>
              <div className="text-sm text-gray-600">
                {formatDate(deleteModal.date)} • {deleteModal.startTime} - {deleteModal.endTime}
              </div>
              <div className="text-sm text-gray-500">
                {deleteModal.reasonName}
                {deleteModal.details && ` • ${deleteModal.details}`}
              </div>
              {deleteModal.blocks.length > 1 && (
                <div className="text-xs text-blue-600 mt-1">{deleteModal.blocks.length} Plätze betroffen</div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="danger"
                onClick={() => handleDeleteBatch(deleteModal)}
                isLoading={deleteMutation.isPending}
                className="flex-1"
              >
                {deleteModal.blocks.length > 1
                  ? `${deleteModal.blocks.length} Sperrungen löschen`
                  : 'Sperrung löschen'}
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
