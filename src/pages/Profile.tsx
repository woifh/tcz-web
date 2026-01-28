import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { useToast } from '../components/ui';
import { getProfile, updateProfile, uploadProfilePicture, deleteProfilePicture, resendVerificationEmail } from '../api/members';
import { getApiUrl } from '../lib/utils';
import type { Member } from '../types';

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    street: '',
    zip_code: '',
    city: '',
    password: '',
    password_confirm: '',
    notifications_enabled: true,
    notify_own_bookings: true,
    notify_other_bookings: true,
    notify_court_blocked: true,
    notify_booking_overridden: true,
  });

  const [isUploading, setIsUploading] = useState(false);

  // Fetch profile data
  const { data: profile, isLoading } = useQuery<Member>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        firstname: profile.firstname || '',
        lastname: profile.lastname || '',
        email: profile.email || '',
        phone: profile.phone || '',
        street: profile.street || '',
        zip_code: profile.zip_code || '',
        city: profile.city || '',
        notifications_enabled: profile.notifications_enabled ?? true,
        notify_own_bookings: profile.notify_own_bookings ?? true,
        notify_other_bookings: profile.notify_other_bookings ?? true,
        notify_court_blocked: profile.notify_court_blocked ?? true,
        notify_booking_overridden: profile.notify_booking_overridden ?? true,
      }));
    }
  }, [profile]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showToast('Profil erfolgreich aktualisiert!', 'success');
      setFormData((prev) => ({ ...prev, password: '', password_confirm: '' }));
    },
    onError: (error: Error) => {
      showToast(error.message || 'Fehler beim Speichern', 'error');
    },
  });

  // Resend verification email mutation
  const resendVerificationMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => {
      showToast('Bestätigungsmail wurde gesendet!', 'success');
    },
    onError: () => {
      showToast('Fehler beim Senden der E-Mail', 'error');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (formData.password || formData.password_confirm) {
      if (formData.password !== formData.password_confirm) {
        showToast('Passwörter stimmen nicht überein', 'error');
        return;
      }
    }

    const updateData: Record<string, unknown> = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      phone: formData.phone,
      street: formData.street,
      zip_code: formData.zip_code,
      city: formData.city,
      notifications_enabled: formData.notifications_enabled,
      notify_own_bookings: formData.notify_own_bookings,
      notify_other_bookings: formData.notify_other_bookings,
      notify_court_blocked: formData.notify_court_blocked,
      notify_booking_overridden: formData.notify_booking_overridden,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    updateMutation.mutate(updateData);
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Bitte wähle eine Bilddatei aus', 'error');
      return;
    }

    // Validate file size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Das Bild darf maximal 5 MB groß sein', 'error');
      return;
    }

    setIsUploading(true);
    try {
      await uploadProfilePicture(file);
      showToast('Profilbild erfolgreich hochgeladen!', 'success');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      showToast('Fehler beim Hochladen des Profilbilds', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfilePictureRemove = async () => {
    if (!confirm('Möchtest du dein Profilbild wirklich entfernen?')) {
      return;
    }

    setIsUploading(true);
    try {
      await deleteProfilePicture();
      showToast('Profilbild erfolgreich entfernt!', 'success');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      showToast('Fehler beim Entfernen des Profilbilds', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (firstname?: string, lastname?: string) => {
    const first = (firstname || '').charAt(0).toUpperCase();
    const last = (lastname || '').charAt(0).toUpperCase();
    return first + last;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-xl shadow-sm p-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
              <span className="text-muted-foreground">Lade Profildaten...</span>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">Mein Profil</h1>
          <p className="text-muted-foreground">Verwalte deine persönlichen Informationen und Einstellungen</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Picture Card */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border hover:shadow-lg transition-shadow">
              {/* Card Header with gradient */}
              <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-4 pb-16">
              </div>

              {/* Card Content */}
              <div className="flex flex-col items-center -mt-14 px-6 pb-6">
                {/* Avatar */}
                <div className="relative mb-4">
                  <div
                    className="rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center overflow-hidden border-4 border-white shadow-xl"
                    style={{ width: 128, height: 128 }}
                  >
                    {profile?.has_profile_picture ? (
                      <img
                        src={getApiUrl(`/api/members/${profile.id}/profile-picture?v=${profile.profile_picture_version}`)}
                        alt="Profilbild"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-semibold text-white">
                        {getInitials(profile?.firstname, profile?.lastname)}
                      </span>
                    )}
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {profile?.firstname} {profile?.lastname}
                </h3>

                {/* Verification Badge */}
                {profile?.email_verified ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-success/20 text-success mb-4">
                    <span className="material-icons text-base">verified</span>
                    Verifiziert
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-warning/20 text-warning mb-4">
                    <span className="material-icons text-base">pending</span>
                    Nicht verifiziert
                  </span>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 w-full">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                    />
                    <span className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted transition-colors">
                      <span className="material-icons text-lg">photo_camera</span>
                      Ändern
                    </span>
                  </label>
                  {profile?.has_profile_picture && (
                    <button
                      type="button"
                      onClick={handleProfilePictureRemove}
                      className="px-3 py-2 border border-input rounded-lg text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                      title="Entfernen"
                    >
                      <span className="material-icons text-lg">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Data Form Card */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl shadow-sm border border-border hover:shadow-lg transition-shadow">
              {/* Card Header */}
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="material-icons text-muted-foreground">person</span>
                  Persönliche Daten
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Aktualisiere deine Kontaktinformationen</p>
              </div>

              {/* Card Content */}
              <form onSubmit={handleSubmit} className="p-6">
                {/* Name Section */}
                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                      <span className="material-icons text-base text-muted-foreground">person</span>
                      Vorname
                    </label>
                    <input
                      type="text"
                      value={formData.firstname}
                      onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                      <span className="material-icons text-base text-muted-foreground">person</span>
                      Nachname
                    </label>
                    <input
                      type="text"
                      value={formData.lastname}
                      onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>

                <hr className="border-border my-6" />

                {/* Contact Section */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                      <span className="material-icons text-base text-muted-foreground">email</span>
                      E-Mail
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                      autoComplete="off"
                      required
                    />
                    {!profile?.email_verified && (
                      <button
                        type="button"
                        onClick={() => resendVerificationMutation.mutate()}
                        disabled={resendVerificationMutation.isPending || resendVerificationMutation.isSuccess}
                        className={`mt-2 text-sm underline disabled:opacity-50 ${
                          resendVerificationMutation.isSuccess
                            ? 'text-success'
                            : 'text-info hover:text-info/80'
                        }`}
                      >
                        {resendVerificationMutation.isPending
                          ? 'Wird gesendet...'
                          : resendVerificationMutation.isSuccess
                            ? 'E-Mail gesendet'
                            : 'Bestätigungsmail erneut senden'}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                      <span className="material-icons text-base text-muted-foreground">phone</span>
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="Telefonnummer"
                    />
                  </div>
                </div>

                <hr className="border-border my-6" />

                {/* Address Section */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                    <span className="material-icons text-muted-foreground">location_on</span>
                    Adresse
                  </label>

                  <div className="space-y-4">
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="Straße und Hausnummer"
                    />

                    <div className="grid gap-4 sm:grid-cols-3">
                      <input
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="PLZ"
                      />
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all sm:col-span-2"
                        placeholder="Stadt"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-border my-6" />

                {/* Password Section */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                    <span className="material-icons text-muted-foreground">lock</span>
                    Passwort ändern
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                      autoComplete="new-password"
                      placeholder="Neues Passwort (optional)"
                    />
                    <input
                      type="password"
                      value={formData.password_confirm}
                      onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                      autoComplete="new-password"
                      placeholder="Passwort bestätigen"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted transition-colors"
                  >
                    <span className="material-icons text-lg">close</span>
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Speichern...
                      </>
                    ) : (
                      <>
                        <span className="material-icons text-lg">save</span>
                        Änderungen speichern
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Notifications Card - Full Width */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl shadow-sm border border-border hover:shadow-lg transition-shadow">
              {/* Card Header */}
              <div className="px-6 py-4 border-b border-border bg-muted">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="material-icons text-muted-foreground">notifications</span>
                  E-Mail Benachrichtigungen
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Wähle aus, welche Benachrichtigungen du erhalten möchtest</p>
              </div>

              {/* Card Content */}
              <div className="p-6">
                {/* Master Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted border-2 border-border mb-6">
                  <div className="flex-1">
                    <label htmlFor="notifications-toggle" className="text-base font-semibold text-foreground cursor-pointer">
                      Benachrichtigungen aktiviert
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aktiviere oder deaktiviere alle E-Mail-Benachrichtigungen
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      id="notifications-toggle"
                      checked={formData.notifications_enabled}
                      onChange={() => setFormData(prev => ({ ...prev, notifications_enabled: !prev.notifications_enabled }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Individual Notification Settings */}
                <div
                  className={`space-y-2 pl-4 border-l-4 border-primary transition-opacity ${
                    formData.notifications_enabled ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <p className="text-sm font-medium text-foreground mb-4">Benachrichtigen bei:</p>

                  {/* Notification Option: Own Bookings */}
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex-1">
                      <label htmlFor="notify-own" className="font-medium text-foreground cursor-pointer">
                        Eigene Buchungen
                      </label>
                      <p className="text-sm text-muted-foreground">Wenn du eine Buchung erstellst oder stornierst</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        id="notify-own"
                        checked={formData.notify_own_bookings}
                        onChange={(e) => setFormData({ ...formData, notify_own_bookings: e.target.checked })}
                        disabled={!formData.notifications_enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                  </div>

                  {/* Notification Option: Other Bookings */}
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex-1">
                      <label htmlFor="notify-other" className="font-medium text-foreground cursor-pointer">
                        Buchungen durch andere Mitglieder
                      </label>
                      <p className="text-sm text-muted-foreground">Wenn andere Mitglieder Buchungen vornehmen</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        id="notify-other"
                        checked={formData.notify_other_bookings}
                        onChange={(e) => setFormData({ ...formData, notify_other_bookings: e.target.checked })}
                        disabled={!formData.notifications_enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                  </div>

                  {/* Notification Option: Court Blocked */}
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex-1">
                      <label htmlFor="notify-blocked" className="font-medium text-foreground cursor-pointer">
                        Platzsperrungen
                      </label>
                      <p className="text-sm text-muted-foreground">Bei Turnieren, Wartungsarbeiten, etc.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        id="notify-blocked"
                        checked={formData.notify_court_blocked}
                        onChange={(e) => setFormData({ ...formData, notify_court_blocked: e.target.checked })}
                        disabled={!formData.notifications_enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                  </div>

                  {/* Notification Option: Booking Overridden */}
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex-1">
                      <label htmlFor="notify-overridden" className="font-medium text-foreground cursor-pointer">
                        Stornierung durch Sperrung
                      </label>
                      <p className="text-sm text-muted-foreground">Wenn deine Buchung durch eine Sperrung storniert wird</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        id="notify-overridden"
                        checked={formData.notify_booking_overridden}
                        onChange={(e) => setFormData({ ...formData, notify_booking_overridden: e.target.checked })}
                        disabled={!formData.notifications_enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
