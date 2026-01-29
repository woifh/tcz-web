import { type ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getApiUrl } from '../../lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);

  const adminRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const adminTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdminEnter = () => {
    if (adminTimeoutRef.current) clearTimeout(adminTimeoutRef.current);
    setAdminOpen(true);
  };

  const handleAdminLeave = () => {
    adminTimeoutRef.current = setTimeout(() => setAdminOpen(false), 150);
  };

  const handleAccountEnter = () => {
    if (accountTimeoutRef.current) clearTimeout(accountTimeoutRef.current);
    setAccountOpen(true);
  };

  const handleAccountLeave = () => {
    accountTimeoutRef.current = setTimeout(() => setAccountOpen(false), 150);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'administrator';
  const isTeamster = user?.role === 'teamster';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(event.target as Node)) {
        setAdminOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (adminTimeoutRef.current) clearTimeout(adminTimeoutRef.current);
      if (accountTimeoutRef.current) clearTimeout(accountTimeoutRef.current);
    };
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav className="bg-green-700 text-white p-4" id="main-navigation">
        <div className="container mx-auto">
          {/* Desktop/Tablet Navigation */}
          <div className="flex justify-between items-center">
            <h1 className={`text-2xl font-bold flex items-center gap-2 lg:!flex ${mobileMenuOpen ? 'hidden' : ''}`}>
              <img src="/tcz_icon.png" alt="TCZ Logo" className="rounded-full" style={{ height: 60, width: 60 }} />
              <span className="hidden sm:inline">Tennisclub Zellerndorf</span>
              <span className="sm:hidden">TC Zellerndorf</span>
              <span className="material-icons">sports_tennis</span>
            </h1>

            <div className="flex items-center gap-4">
              {/* Desktop Menu (hidden on mobile) */}
              <div className="hidden lg:flex gap-4 items-center">
                {/* Dashboard Link */}
                <Link to="/dashboard" className="hover:bg-green-600 px-3 py-2 rounded transition-colors flex items-center gap-2">
                  <span className="material-icons text-2xl">dashboard</span>
                  <span>Platzübersicht</span>
                </Link>

                {/* Admin Panel Dropdown (only for admins) */}
                {isAdmin && (
                  <div
                    ref={adminRef}
                    className="relative"
                    onMouseEnter={handleAdminEnter}
                    onMouseLeave={handleAdminLeave}
                  >
                    <button
                      className="hover:bg-green-600 px-3 py-2 rounded transition-colors flex items-center gap-2"
                      aria-haspopup="true"
                      aria-expanded={adminOpen}
                    >
                      <span className="material-icons text-2xl">admin_panel_settings</span>
                      <span>Admin</span>
                      <span
                        className={`material-icons text-sm transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`}
                      >
                        expand_more
                      </span>
                    </button>
                    {adminOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50">
                        <div className="py-1">
                          <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <span className="material-icons text-sm">home</span>
                            <span>Admin-Panel</span>
                          </Link>
                          <Link to="/admin/blocks" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <span className="material-icons text-sm">block</span>
                            <span>Platz-Sperrungen</span>
                          </Link>
                          <Link to="/admin/reasons" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <span className="material-icons text-sm">list_alt</span>
                            <span>Sperrungsgründe</span>
                          </Link>
                          <Link to="/admin/members" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <span className="material-icons text-sm">people</span>
                            <span>Mitglieder</span>
                          </Link>
                          <Link to="/admin/audit" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <span className="material-icons text-sm">history</span>
                            <span>Audit-Protokoll</span>
                          </Link>
                          <Link to="/admin/features" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <span className="material-icons text-sm">toggle_on</span>
                            <span>Feature-Flags</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Teamster Panel Link (teamsters only, NOT admins) */}
                {isTeamster && !isAdmin && (
                  <Link to="/admin/blocks" className="hover:bg-green-600 px-3 py-2 rounded transition-colors flex items-center gap-2">
                    <span className="material-icons text-2xl">block</span>
                    <span>Platz-Sperrungen</span>
                  </Link>
                )}

                {/* My Account Dropdown */}
                <div
                  ref={accountRef}
                  className="relative"
                  onMouseEnter={handleAccountEnter}
                  onMouseLeave={handleAccountLeave}
                >
                  <button
                    className="hover:bg-green-600 px-3 py-2 rounded transition-colors flex items-center gap-2"
                    aria-haspopup="true"
                    aria-expanded={accountOpen}
                  >
                    {user?.has_profile_picture ? (
                      <img
                        src={getApiUrl(`/api/members/${user.id}/profile-picture?v=${user.profile_picture_version}`)}
                        alt=""
                        className="rounded-full object-cover"
                        style={{ width: 32, height: 32 }}
                      />
                    ) : (
                      <span className="material-icons text-2xl">account_circle</span>
                    )}
                    <span>Mein Konto</span>
                    <span
                      className={`material-icons text-sm transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}
                    >
                      expand_more
                    </span>
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50">
                      <div className="py-1">
                        <Link to="/reservations" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <span className="material-icons text-sm">event</span>
                          <span>Meine Reservierungen</span>
                        </Link>
                        <Link to="/favourites" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <span className="material-icons text-sm">star</span>
                          <span>Favoriten</span>
                        </Link>
                        <Link to="/statistics" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <span className="material-icons text-sm">bar_chart</span>
                          <span>Meine Statistiken</span>
                        </Link>
                        <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <span className="material-icons text-sm">person</span>
                          <span>Mein Profil</span>
                        </Link>
                        <Link to="/help" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <span className="material-icons text-sm">help</span>
                          <span>Hilfe-Center</span>
                        </Link>
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span className="material-icons text-sm">logout</span>
                          <span>Abmelden</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menü öffnen"
              >
                <span className="material-icons">menu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4">
            {/* Dashboard */}
            <Link
              to="/dashboard"
              className="block w-full flex items-center gap-2 px-4 py-3 hover:bg-green-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-icons text-sm">dashboard</span>
              <span>Platzübersicht</span>
            </Link>

            {/* Admin Panel Section (only for admins) */}
            {isAdmin && (
              <div>
                <button
                  onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-600"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-sm">admin_panel_settings</span>
                    <span>Admin</span>
                  </div>
                  <span
                    className={`material-icons text-sm transition-transform duration-200 ${mobileAdminOpen ? 'rotate-180' : ''}`}
                  >
                    expand_more
                  </span>
                </button>
                {mobileAdminOpen && (
                  <div className="bg-green-800 bg-opacity-50">
                    <Link to="/admin" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                      <span className="material-icons text-sm">home</span>
                      <span>Admin-Panel</span>
                    </Link>
                    <Link to="/admin/blocks" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                      <span className="material-icons text-sm">block</span>
                      <span>Platz-Sperrungen</span>
                    </Link>
                    <Link to="/admin/reasons" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                      <span className="material-icons text-sm">list_alt</span>
                      <span>Sperrungsgründe</span>
                    </Link>
                    <Link to="/admin/members" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                      <span className="material-icons text-sm">people</span>
                      <span>Mitglieder</span>
                    </Link>
                    <Link to="/admin/audit" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                      <span className="material-icons text-sm">history</span>
                      <span>Audit-Protokoll</span>
                    </Link>
                    <Link to="/admin/features" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                      <span className="material-icons text-sm">toggle_on</span>
                      <span>Feature-Flags</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Teamster Panel Link (teamsters only, NOT admins) */}
            {isTeamster && !isAdmin && (
              <Link
                to="/admin/blocks"
                className="block w-full flex items-center gap-2 px-4 py-3 hover:bg-green-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="material-icons text-sm">block</span>
                <span>Platz-Sperrungen</span>
              </Link>
            )}

            {/* My Account Section */}
            <div>
              <button
                onClick={() => setMobileAccountOpen(!mobileAccountOpen)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-600"
              >
                <div className="flex items-center gap-2">
                  {user?.has_profile_picture ? (
                    <img
                      src={getApiUrl(`/api/members/${user.id}/profile-picture?v=${user.profile_picture_version}`)}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="material-icons text-lg">account_circle</span>
                  )}
                  <span>Mein Konto</span>
                </div>
                <span
                  className={`material-icons text-sm transition-transform duration-200 ${mobileAccountOpen ? 'rotate-180' : ''}`}
                >
                  expand_more
                </span>
              </button>
              {mobileAccountOpen && (
                <div className="bg-green-800 bg-opacity-50">
                  <Link to="/reservations" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                    <span className="material-icons text-sm">event</span>
                    <span>Meine Reservierungen</span>
                  </Link>
                  <Link to="/favourites" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                    <span className="material-icons text-sm">star</span>
                    <span>Favoriten</span>
                  </Link>
                  <Link to="/statistics" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                    <span className="material-icons text-sm">bar_chart</span>
                    <span>Meine Statistiken</span>
                  </Link>
                  <Link to="/profile" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                    <span className="material-icons text-sm">person</span>
                    <span>Mein Profil</span>
                  </Link>
                  <Link to="/help" className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600" onClick={() => setMobileMenuOpen(false)}>
                    <span className="material-icons text-sm">help</span>
                    <span>Hilfe-Center</span>
                  </Link>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="block w-full flex items-center gap-2 px-4 py-3 pl-12 hover:bg-green-600"
                  >
                    <span className="material-icons text-sm">logout</span>
                    <span>Abmelden</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="container mx-auto mt-8 px-4">
        {children}
      </div>

      {/* Toast Container */}
      <div id="toast-container" className="fixed top-4 right-4 z-50 space-y-2"></div>

      {/* Screen Reader Live Region for Announcements */}
      <div id="sr-announcements" aria-live="polite" aria-atomic="true" className="sr-only"></div>
    </div>
  );
}
