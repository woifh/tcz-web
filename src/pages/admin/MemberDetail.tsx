import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui';
import {
  getMember,
  updateMember,
  createMember,
  deleteMember,
  deactivateMember,
  reactivateMember,
  resendMemberVerification,
  type CreateMemberData,
} from '../../api/admin';
import type { Member } from '../../types';

interface MemberFormData {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phone: string;
  street: string;
  city: string;
  zip_code: string;
  role: 'member' | 'teamster' | 'administrator';
  membership_type: 'full' | 'sustaining';
  fee_paid: boolean;
}

const initialFormData: MemberFormData = {
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  phone: '',
  street: '',
  city: '',
  zip_code: '',
  role: 'member',
  membership_type: 'full',
  fee_paid: false,
};

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const isCreateMode = id === 'new';

  const [formData, setFormData] = useState<MemberFormData>(initialFormData);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const syncedMemberIdRef = useRef<string | undefined>(undefined);

  // Fetch member data (only in edit mode)
  const { data: member, isLoading, isError } = useQuery({
    queryKey: ['adminMember', id],
    queryFn: () => getMember(id!),
    enabled: !isCreateMode && !!id,
  });

  // Populate form when member data loads (only once per member)
  useEffect(() => {
    if (member && member.id !== syncedMemberIdRef.current) {
      syncedMemberIdRef.current = member.id;
      // Reset form with member data
      const newFormData = {
        firstname: member.firstname || '',
        lastname: member.lastname || '',
        email: member.email || '',
        password: '',
        phone: member.phone || '',
        street: member.street || '',
        city: member.city || '',
        zip_code: member.zip_code || '',
        role: member.role || 'member',
        membership_type: member.membership_type || 'full',
        fee_paid: member.fee_paid || false,
      };
      /* eslint-disable react-hooks/set-state-in-effect -- Intentional: sync form state from fetched data */
      setFormData(newFormData);
      setHasChanges(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [member]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateMemberData) => createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] });
      showToast('Mitglied erstellt', 'success');
      navigate('/admin/members');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Fehler beim Erstellen', 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Member>) => updateMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] });
      queryClient.invalidateQueries({ queryKey: ['adminMember', id] });
      showToast('Mitglied aktualisiert', 'success');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Fehler beim Speichern', 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteMember(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] });
      showToast('Mitglied geloescht', 'success');
      navigate('/admin/members');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Fehler beim Loeschen', 'error');
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: () => deactivateMember(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] });
      queryClient.invalidateQueries({ queryKey: ['adminMember', id] });
      showToast('Mitglied deaktiviert', 'success');
      setShowDeactivateModal(false);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Fehler beim Deaktivieren', 'error');
    },
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: () => reactivateMember(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] });
      queryClient.invalidateQueries({ queryKey: ['adminMember', id] });
      showToast('Mitglied reaktiviert', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Fehler beim Reaktivieren', 'error');
    },
  });

  // Resend verification mutation
  const resendMutation = useMutation({
    mutationFn: () => resendMemberVerification(id!),
    onSuccess: () => {
      showToast('Verifizierungs-E-Mail gesendet', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Fehler beim Senden', 'error');
    },
  });

  const handleInputChange = (field: keyof MemberFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstname.trim() || !formData.lastname.trim()) {
      showToast('Vor- und Nachname sind erforderlich', 'error');
      return;
    }
    if (!formData.email.trim()) {
      showToast('E-Mail ist erforderlich', 'error');
      return;
    }
    if (isCreateMode && !formData.password) {
      showToast('Passwort ist erforderlich', 'error');
      return;
    }

    if (isCreateMode) {
      createMutation.mutate({
        firstname: formData.firstname,
        lastname: formData.lastname,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        street: formData.street || undefined,
        city: formData.city || undefined,
        zip_code: formData.zip_code || undefined,
        role: formData.role,
        membership_type: formData.membership_type,
        fee_paid: formData.fee_paid,
      });
    } else {
      const updateData: Partial<Member> = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        email: formData.email,
        phone: formData.phone || undefined,
        street: formData.street || undefined,
        city: formData.city || undefined,
        zip_code: formData.zip_code || undefined,
        role: formData.role,
        membership_type: formData.membership_type,
        fee_paid: formData.fee_paid,
      };
      updateMutation.mutate(updateData);
    }
  };

  if (!isCreateMode && isLoading) {
    return (
      <MainLayout>
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      </MainLayout>
    );
  }

  if (!isCreateMode && isError) {
    return (
      <MainLayout>
        <div className="bg-destructive/10 rounded-lg p-8 text-center">
          <p className="text-destructive mb-4">Mitglied nicht gefunden</p>
          <Button variant="secondary" onClick={() => navigate('/admin/members')}>
            Zurueck zur Liste
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => navigate('/admin/members')}>
              &larr; Zurueck
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {isCreateMode ? 'Neues Mitglied' : `${member?.firstname} ${member?.lastname}`}
            </h1>
          </div>
          {!isCreateMode && member && (
            <div className="flex items-center gap-2">
              {member.is_active ? (
                <span className="px-2 py-1 text-xs rounded bg-success/20 text-success">Aktiv</span>
              ) : (
                <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">Inaktiv</span>
              )}
              {member.email_verified ? (
                <span className="px-2 py-1 text-xs rounded bg-info/20 text-info">Verifiziert</span>
              ) : (
                <span className="px-2 py-1 text-xs rounded bg-warning/20 text-warning">
                  Nicht verifiziert
                </span>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-6">
          {/* Personal Info */}
          <div>
            <h2 className="text-lg font-medium text-foreground mb-4">Persoenliche Daten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Vorname"
                value={formData.firstname}
                onChange={(e) => handleInputChange('firstname', e.target.value)}
                required
              />
              <Input
                label="Nachname"
                value={formData.lastname}
                onChange={(e) => handleInputChange('lastname', e.target.value)}
                required
              />
              <Input
                label="E-Mail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
              <Input
                label="Telefon"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
          </div>

          {/* Password (only for create) */}
          {isCreateMode && (
            <div>
              <h2 className="text-lg font-medium text-foreground mb-4">Passwort</h2>
              <div className="max-w-sm">
                <Input
                  label="Passwort"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Address */}
          <div>
            <h2 className="text-lg font-medium text-foreground mb-4">Adresse</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Strasse"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                />
              </div>
              <Input
                label="PLZ"
                value={formData.zip_code}
                onChange={(e) => handleInputChange('zip_code', e.target.value)}
              />
              <Input
                label="Ort"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
          </div>

          {/* Admin Settings */}
          <div>
            <h2 className="text-lg font-medium text-foreground mb-4">Einstellungen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rolle</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    handleInputChange('role', e.target.value as 'member' | 'teamster' | 'administrator')
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="member">Mitglied</option>
                  <option value="teamster">Teamleiter</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Mitgliedschaft</label>
                <select
                  value={formData.membership_type}
                  onChange={(e) =>
                    handleInputChange('membership_type', e.target.value as 'full' | 'sustaining')
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="full">Vollmitglied</option>
                  <option value="sustaining">Foerdermitglied</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.fee_paid}
                    onChange={(e) => handleInputChange('fee_paid', e.target.checked)}
                    className="h-4 w-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">Mitgliedsbeitrag bezahlt</span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {hasChanges && !isCreateMode && (
                <span className="text-sm text-warning">Ungespeicherte Aenderungen</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/members')}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
                disabled={!isCreateMode && !hasChanges}
              >
                {isCreateMode ? 'Erstellen' : 'Speichern'}
              </Button>
            </div>
          </div>
        </form>

        {/* Actions (only in edit mode) */}
        {!isCreateMode && member && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-4">
            <h2 className="text-lg font-medium text-foreground">Aktionen</h2>

            {/* Email verification */}
            {!member.email_verified && (
              <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg">
                <div>
                  <p className="font-medium text-warning">E-Mail nicht verifiziert</p>
                  <p className="text-sm text-warning/80">
                    Verifizierungs-E-Mail erneut senden
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => resendMutation.mutate()}
                  isLoading={resendMutation.isPending}
                >
                  E-Mail senden
                </Button>
              </div>
            )}

            {/* Activate/Deactivate */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium text-foreground">
                  {member.is_active ? 'Mitglied deaktivieren' : 'Mitglied reaktivieren'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {member.is_active
                    ? 'Deaktivierte Mitglieder koennen sich nicht anmelden'
                    : 'Reaktiviert den Zugang zum System'}
                </p>
              </div>
              {member.is_active ? (
                <Button variant="secondary" size="sm" onClick={() => setShowDeactivateModal(true)}>
                  Deaktivieren
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => reactivateMutation.mutate()}
                  isLoading={reactivateMutation.isPending}
                >
                  Reaktivieren
                </Button>
              )}
            </div>

            {/* Delete */}
            <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
              <div>
                <p className="font-medium text-destructive">Mitglied loeschen</p>
                <p className="text-sm text-destructive">
                  Diese Aktion kann nicht rueckgaengig gemacht werden
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                Loeschen
              </Button>
            </div>
          </div>
        )}

        {/* Member Info (only in edit mode) */}
        {!isCreateMode && member && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-medium text-foreground mb-4">Informationen</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Mitglied seit</dt>
                <dd className="font-medium">
                  {member.member_since
                    ? new Date(member.member_since).toLocaleDateString('de-AT')
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">E-Mail verifiziert am</dt>
                <dd className="font-medium">
                  {member.email_verified_at
                    ? new Date(member.email_verified_at).toLocaleDateString('de-AT')
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mitglieds-ID</dt>
                <dd className="font-mono text-xs">{member.id}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Mitglied loeschen?">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Moechtest du <strong>{member?.firstname} {member?.lastname}</strong> wirklich loeschen?
          </p>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium mb-1">Achtung!</p>
            <ul className="text-sm text-destructive space-y-1">
              <li>Alle Buchungen werden storniert</li>
              <li>Alle Daten werden geloescht</li>
              <li>Diese Aktion kann nicht rueckgaengig gemacht werden</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate()}
              isLoading={deleteMutation.isPending}
            >
              Endgueltig loeschen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Mitglied deaktivieren?"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Moechtest du <strong>{member?.firstname} {member?.lastname}</strong> wirklich deaktivieren?
          </p>
          <p className="text-sm text-muted-foreground">
            Deaktivierte Mitglieder koennen sich nicht mehr anmelden. Die Daten bleiben erhalten.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowDeactivateModal(false)}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={() => deactivateMutation.mutate()}
              isLoading={deactivateMutation.isPending}
            >
              Deaktivieren
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
