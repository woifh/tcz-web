import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { getMembers, getPendingPaymentConfirmations, type MemberListItem } from '../../api/admin';

type FilterTab = 'all' | 'active' | 'inactive' | 'unpaid' | 'pending';
type SortField = 'name' | 'email' | 'role' | 'is_active' | 'fee_paid';
type SortDirection = 'asc' | 'desc';

// Sort indicator component - defined outside to prevent recreation on each render
function SortIndicator({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) {
    return <span className="text-muted-foreground/50 ml-1">↕</span>;
  }
  return <span className="text-primary ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
}

export default function Members() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['adminMembers'],
    queryFn: getMembers,
  });

  // Fetch pending confirmations
  const { data: pendingData } = useQuery({
    queryKey: ['pendingConfirmations'],
    queryFn: getPendingPaymentConfirmations,
  });

  const pendingMemberIds = useMemo(() => {
    return new Set(pendingData?.members.map((m) => m.id) || []);
  }, [pendingData]);

  const isLoading = membersLoading;

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get payment status for member
  const getPaymentStatus = (member: MemberListItem): 'paid' | 'pending' | 'unpaid' => {
    if (member.fee_paid) return 'paid';
    if (pendingMemberIds.has(member.id)) return 'pending';
    return 'unpaid';
  };

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    if (!members) return [];

    const result = members.filter((member) => {
      // Search filter - split query into terms, all terms must match
      if (searchQuery) {
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const firstname = member.firstname.toLowerCase();
        const lastname = member.lastname.toLowerCase();
        const email = member.email?.toLowerCase() || '';

        // Every term must match at least one field (firstname, lastname, or email)
        const allTermsMatch = terms.every(term =>
          firstname.includes(term) || lastname.includes(term) || email.includes(term)
        );
        if (!allTermsMatch) {
          return false;
        }
      }

      // Tab filter
      switch (activeTab) {
        case 'active':
          if (!member.is_active) return false;
          break;
        case 'inactive':
          if (member.is_active) return false;
          break;
        case 'unpaid':
          if (member.fee_paid || pendingMemberIds.has(member.id)) return false;
          break;
        case 'pending':
          if (!pendingMemberIds.has(member.id)) return false;
          break;
      }

      // Role filter
      if (roleFilter !== 'all' && member.role !== roleFilter) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = `${a.firstname} ${a.lastname}`.localeCompare(
            `${b.firstname} ${b.lastname}`,
            'de'
          );
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email, 'de');
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'is_active':
          comparison = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
          break;
        case 'fee_paid':
          comparison = (a.fee_paid ? 1 : 0) - (b.fee_paid ? 1 : 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [members, searchQuery, activeTab, roleFilter, pendingMemberIds, sortField, sortDirection]);

  // Statistics
  const stats = useMemo(() => {
    if (!members) return { total: 0, active: 0, inactive: 0, unpaid: 0, pending: 0 };
    return {
      total: members.length,
      active: members.filter((m) => m.is_active).length,
      inactive: members.filter((m) => !m.is_active).length,
      unpaid: members.filter((m) => !m.fee_paid && !pendingMemberIds.has(m.id)).length,
      pending: pendingData?.count || 0,
    };
  }, [members, pendingMemberIds, pendingData]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'administrator':
        return <span className="px-2 py-1 text-xs rounded bg-primary/20 text-primary">Admin</span>;
      case 'teamster':
        return <span className="px-2 py-1 text-xs rounded bg-info/20 text-info">Teamleiter</span>;
      default:
        return null;
    }
  };

  const tabs: { key: FilterTab; label: string; count: number; highlight?: boolean }[] = [
    { key: 'all', label: 'Alle', count: stats.total },
    { key: 'active', label: 'Aktiv', count: stats.active },
    { key: 'inactive', label: 'Inaktiv', count: stats.inactive },
    { key: 'pending', label: 'Ausstehend', count: stats.pending, highlight: stats.pending > 0 },
    { key: 'unpaid', label: 'Unbezahlt', count: stats.unpaid },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mitglieder</h1>
          <Button
            onClick={() => navigate('/admin/members/new')}
            data-testid="create-member-btn"
          >
            Neues Mitglied
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Mitglied suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="member-search-input"
              />
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                data-testid="role-filter"
              >
                <option value="all">Alle Rollen</option>
                <option value="administrator">Administrator</option>
                <option value="teamster">Teamleiter</option>
                <option value="member">Mitglied</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}{' '}
                {tab.highlight ? (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-warning/20 text-warning">
                    {tab.count}
                  </span>
                ) : (
                  `(${tab.count})`
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Members List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center text-muted-foreground">
            Keine Mitglieder gefunden
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b">
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('name')}
                  >
                    Mitglied <SortIndicator field="name" sortField={sortField} sortDirection={sortDirection} />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('email')}
                  >
                    E-Mail <SortIndicator field="email" sortField={sortField} sortDirection={sortDirection} />
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('is_active')}
                  >
                    Status <SortIndicator field="is_active" sortField={sortField} sortDirection={sortDirection} />
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-medium text-muted-foreground hidden sm:table-cell cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('fee_paid')}
                  >
                    Beitrag <SortIndicator field="fee_paid" sortField={sortField} sortDirection={sortDirection} />
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b last:border-b-0" data-testid={`member-${member.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium text-muted-foreground">
                            {member.firstname[0]}{member.lastname[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {member.firstname} {member.lastname}
                            {getRoleBadge(member.role)}
                          </div>
                          <div className="text-sm text-muted-foreground sm:hidden">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <a
                        href={`mailto:${member.email}`}
                        className="text-primary hover:underline"
                      >
                        {member.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.is_active ? (
                        <span className="px-2 py-1 text-xs rounded bg-success/20 text-success">
                          Aktiv
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
                          Inaktiv
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {(() => {
                        const status = getPaymentStatus(member);
                        switch (status) {
                          case 'paid':
                            return (
                              <span className="px-2 py-1 text-xs rounded bg-success/20 text-success">
                                Bezahlt
                              </span>
                            );
                          case 'pending':
                            return (
                              <span className="px-2 py-1 text-xs rounded bg-warning/20 text-warning">
                                Ausstehend
                              </span>
                            );
                          default:
                            return (
                              <span className="px-2 py-1 text-xs rounded bg-destructive/20 text-destructive">
                                Unbezahlt
                              </span>
                            );
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/admin/members/${member.id}`)}
                          data-testid={`view-member-${member.id}`}
                        >
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination info */}
        <div className="text-sm text-muted-foreground text-center">
          {filteredMembers.length} von {stats.total} Mitgliedern
        </div>
      </div>
    </MainLayout>
  );
}
