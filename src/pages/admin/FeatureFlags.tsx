import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../../components/layout';
import { useToast } from '../../components/ui';
import { getFeatureFlags, updateFeatureFlag, type FeatureFlag } from '../../api/admin';

export default function FeatureFlags() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Fetch feature flags
  const { data: flags, isLoading, isError } = useQuery({
    queryKey: ['featureFlags'],
    queryFn: getFeatureFlags,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FeatureFlag> }) =>
      updateFeatureFlag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
      showToast('Feature Flag aktualisiert', 'success');
    },
    onError: () => {
      showToast('Fehler beim Aktualisieren', 'error');
    },
  });

  const handleToggle = (flag: FeatureFlag) => {
    updateMutation.mutate({
      id: flag.id,
      data: { is_enabled: !flag.is_enabled },
    });
  };

  const handleRoleToggle = (flag: FeatureFlag, role: string) => {
    const newRoles = flag.allowed_roles.includes(role)
      ? flag.allowed_roles.filter((r) => r !== role)
      : [...flag.allowed_roles, role];
    updateMutation.mutate({
      id: flag.id,
      data: { allowed_roles: newRoles },
    });
  };

  const roles = ['member', 'teamster', 'administrator'];
  const roleLabels: Record<string, string> = {
    member: 'Mitglied',
    teamster: 'Teamleiter',
    administrator: 'Administrator',
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Feature Flags</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : isError ? (
          <div className="bg-destructive/10 rounded-lg p-8 text-center">
            <p className="text-destructive">Fehler beim Laden der Feature Flags</p>
          </div>
        ) : flags?.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center text-muted-foreground">
            Keine Feature Flags vorhanden
          </div>
        ) : (
          <div className="space-y-4">
            {flags?.map((flag) => (
              <div key={flag.id} className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-foreground">{flag.name}</h3>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{flag.key}</code>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                    )}
                    {flag.updated_at && (
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        Zuletzt aktualisiert:{' '}
                        {new Date(flag.updated_at).toLocaleString('de-AT')}
                      </p>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flag.is_enabled}
                      onChange={() => handleToggle(flag)}
                      className="sr-only peer"
                      disabled={updateMutation.isPending}
                    />
                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-medium text-foreground">
                      {flag.is_enabled ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </label>
                </div>

                {/* Role Restrictions */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-foreground mb-2">Erlaubte Rollen:</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <label
                        key={role}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                          flag.allowed_roles.includes(role)
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={flag.allowed_roles.includes(role)}
                          onChange={() => handleRoleToggle(flag, role)}
                          className="sr-only"
                          disabled={updateMutation.isPending}
                        />
                        {roleLabels[role]}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-info/10 rounded-lg p-4 border border-info/20">
          <h3 className="font-medium text-info mb-2">Hinweise</h3>
          <ul className="text-sm text-info/80 space-y-1">
            <li>Feature Flags steuern, welche Features im System aktiviert sind</li>
            <li>Rollen-Einschraenkungen bestimmen, wer das Feature nutzen darf</li>
            <li>Aenderungen wirken sich sofort auf alle Benutzer aus</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
