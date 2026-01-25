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
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Laden...</div>
        ) : isError ? (
          <div className="bg-red-50 rounded-lg p-8 text-center">
            <p className="text-red-600">Fehler beim Laden der Feature Flags</p>
          </div>
        ) : flags?.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            Keine Feature Flags vorhanden
          </div>
        ) : (
          <div className="space-y-4">
            {flags?.map((flag) => (
              <div key={flag.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">{flag.name}</h3>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{flag.key}</code>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
                    )}
                    {flag.updated_at && (
                      <p className="text-xs text-gray-400 mt-2">
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {flag.is_enabled ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </label>
                </div>

                {/* Role Restrictions */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Erlaubte Rollen:</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <label
                        key={role}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                          flag.allowed_roles.includes(role)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
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
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Hinweise</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>Feature Flags steuern, welche Features im System aktiviert sind</li>
            <li>Rollen-Einschraenkungen bestimmen, wer das Feature nutzen darf</li>
            <li>Aenderungen wirken sich sofort auf alle Benutzer aus</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
