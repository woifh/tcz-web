import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui';
import {
  getMembers,
  getPendingPaymentConfirmations,
  getPaymentDeadline,
  setPaymentDeadline,
  clearPaymentDeadline,
  rejectPaymentConfirmation,
  updateMember,
} from '../../api/admin';

interface AdminCard {
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const adminCards: AdminCard[] = [
  {
    title: 'Mitglieder',
    description: 'Mitglieder verwalten, erstellen und bearbeiten',
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    path: '/admin/members',
    color: 'blue',
  },
  {
    title: 'Platzsperrungen',
    description: 'Plaetze sperren und Sperrungen verwalten',
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10M9 12l2 2 4-4',
    path: '/admin/blocks',
    color: 'red',
  },
  {
    title: 'Sperrgruende',
    description: 'Sperrgruende erstellen und bearbeiten',
    icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
    path: '/admin/reasons',
    color: 'purple',
  },
  {
    title: 'Audit Log',
    description: 'Aktivitaeten und Aenderungen einsehen',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    path: '/admin/audit',
    color: 'gray',
  },
  {
    title: 'Feature Flags',
    description: 'Features aktivieren und deaktivieren',
    icon: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7',
    path: '/admin/features',
    color: 'green',
  },
];

export default function AdminHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');

  // Fetch data
  const { data: members } = useQuery({
    queryKey: ['adminMembers'],
    queryFn: getMembers,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['pendingConfirmations'],
    queryFn: getPendingPaymentConfirmations,
  });

  const { data: deadlineData } = useQuery({
    queryKey: ['paymentDeadline'],
    queryFn: getPaymentDeadline,
  });

  // Mutations
  const setDeadlineMutation = useMutation({
    mutationFn: (date: string) => setPaymentDeadline(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentDeadline'] });
      setShowDeadlineModal(false);
      showToast('Zahlungsfrist gesetzt', 'success');
    },
    onError: () => {
      showToast('Fehler beim Setzen der Frist', 'error');
    },
  });

  const clearDeadlineMutation = useMutation({
    mutationFn: clearPaymentDeadline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentDeadline'] });
      showToast('Zahlungsfrist entfernt', 'success');
    },
    onError: () => {
      showToast('Fehler beim Entfernen der Frist', 'error');
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: string) => updateMember(id, { fee_paid: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingConfirmations'] });
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] });
      showToast('Zahlung bestaetigt', 'success');
    },
    onError: () => {
      showToast('Fehler beim Bestaetigen', 'error');
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: (id: string) => rejectPaymentConfirmation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingConfirmations'] });
      showToast('Anfrage abgelehnt', 'success');
    },
    onError: () => {
      showToast('Fehler beim Ablehnen', 'error');
    },
  });

  // Stats
  const stats = {
    total: members?.length || 0,
    active: members?.filter((m) => m.is_active).length || 0,
    unpaid: members?.filter((m) => !m.fee_paid).length || 0,
    pending: pendingData?.count || 0,
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-info/10 hover:bg-info/20 border-info/30',
      red: 'bg-destructive/10 hover:bg-destructive/20 border-destructive/30',
      purple: 'bg-primary/10 hover:bg-primary/20 border-primary/30',
      gray: 'bg-muted hover:bg-muted/80 border-border',
      green: 'bg-success/10 hover:bg-success/20 border-success/30',
    };
    return colors[color] || colors.gray;
  };

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'text-info',
      red: 'text-destructive',
      purple: 'text-primary',
      gray: 'text-muted-foreground',
      green: 'text-success',
    };
    return colors[color] || colors.gray;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Administration</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Mitglieder</div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="text-2xl font-bold text-success">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Aktiv</div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="text-2xl font-bold text-destructive">{stats.unpaid}</div>
            <div className="text-sm text-muted-foreground">Unbezahlt</div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Ausstehend</div>
          </div>
        </div>

        {/* Payment Deadline Widget */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Zahlungsfrist</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowDeadlineModal(true)}>
                {deadlineData?.deadline ? 'Aendern' : 'Setzen'}
              </Button>
              {deadlineData?.deadline && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => clearDeadlineMutation.mutate()}
                  isLoading={clearDeadlineMutation.isPending}
                >
                  Entfernen
                </Button>
              )}
            </div>
          </div>
          {deadlineData?.deadline ? (
            <div className="flex items-center gap-4">
              <div
                className={`text-lg font-medium ${deadlineData.is_past ? 'text-destructive' : 'text-foreground'}`}
              >
                {new Date(deadlineData.deadline).toLocaleDateString('de-AT', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              {deadlineData.days_until !== null && (
                <span
                  className={`px-2 py-1 text-sm rounded ${
                    deadlineData.is_past
                      ? 'bg-destructive/20 text-destructive'
                      : deadlineData.days_until <= 7
                        ? 'bg-warning/20 text-warning'
                        : 'bg-success/20 text-success'
                  }`}
                >
                  {deadlineData.is_past
                    ? 'Abgelaufen'
                    : deadlineData.days_until === 0
                      ? 'Heute'
                      : `Noch ${deadlineData.days_until} Tage`}
                </span>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Keine Zahlungsfrist gesetzt</p>
          )}
        </div>

        {/* Pending Payment Confirmations */}
        {pendingData && pendingData.count > 0 && (
          <div className="bg-warning/10 rounded-lg shadow-sm border border-warning/20 p-6">
            <h2 className="text-lg font-medium text-warning mb-4">
              Ausstehende Zahlungsbestaetigungen ({pendingData.count})
            </h2>
            <div className="space-y-3">
              {pendingData.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-card rounded-lg p-4 border border-border"
                >
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                    {member.payment_confirmation_requested_at && (
                      <div className="text-xs text-muted-foreground/70">
                        Angefragt am{' '}
                        {new Date(member.payment_confirmation_requested_at).toLocaleDateString('de-AT')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => rejectPaymentMutation.mutate(member.id)}
                      isLoading={rejectPaymentMutation.isPending}
                    >
                      Ablehnen
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => confirmPaymentMutation.mutate(member.id)}
                      isLoading={confirmPaymentMutation.isPending}
                    >
                      Bestaetigen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Function Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminCards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className={`text-left p-6 rounded-lg border transition-colors ${getColorClasses(card.color)}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg bg-card ${getIconColor(card.color)}`}>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Set Deadline Modal */}
      <Modal
        isOpen={showDeadlineModal}
        onClose={() => setShowDeadlineModal(false)}
        title="Zahlungsfrist setzen"
      >
        <div className="space-y-4">
          <Input
            label="Fristdatum"
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowDeadlineModal(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => setDeadlineMutation.mutate(deadlineDate)}
              isLoading={setDeadlineMutation.isPending}
              disabled={!deadlineDate}
            >
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
