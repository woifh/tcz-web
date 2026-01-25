import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { useToast } from '../components/ui';
import { getProfile, updateProfile, uploadProfilePicture, deleteProfilePicture, resendVerificationEmail } from '../api/members';
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

  const handleNotificationToggle = () => {
    setFormData((prev) => ({
      ...prev,
      notifications_enabled: !prev.notifications_enabled,
    }));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <div className="text-center py-8">
            <span className="text-gray-500">Lade Profildaten...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
        {/* Header with Profile Picture */}
        <div className="flex justify-between items-start mb-6 pb-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Mein Profil</h2>
            <p className="text-gray-600 text-sm mt-1">Hier kannst du deine Kontaktdaten bearbeiten.</p>
          </div>

          {/* Profile Picture Section */}
          <div className="flex flex-col items-center ml-4">
            <div className="relative mb-2">
              <div
                className="rounded-full bg-green-100 flex items-center justify-center overflow-hidden"
                style={{ width: 100, height: 100 }}
              >
                {profile?.has_profile_picture ? (
                  <img
                    src={`/api/members/${profile.id}/profile-picture?t=${Date.now()}`}
                    alt="Profilbild"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-medium text-green-600">
                    {getInitials(profile?.firstname, profile?.lastname)}
                  </span>
                )}
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-1">
              <label className="cursor-pointer text-gray-500 hover:text-blue-600" title="Bild ändern">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />
                <span className="material-icons text-xl">photo_camera</span>
              </label>
              {profile?.has_profile_picture && (
                <button
                  type="button"
                  onClick={handleProfilePictureRemove}
                  className="text-gray-500 hover:text-red-600"
                  title="Entfernen"
                >
                  <span className="material-icons text-xl">delete</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Row 1: Firstname | Lastname */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Vorname</label>
            <input
              type="text"
              value={formData.firstname}
              onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Nachname</label>
            <input
              type="text"
              value={formData.lastname}
              onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          {/* Row 2: PLZ | City */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">PLZ</label>
            <input
              type="text"
              value={formData.zip_code}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="PLZ"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Stadt</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Stadt"
            />
          </div>

          {/* Row 3: Street (full width) */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-2">Straße</label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Straße und Hausnummer"
            />
          </div>

          {/* Row 4: Email | Phone */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">E-Mail</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              autoComplete="off"
              required
            />
            {/* Email verification badge */}
            <div className="mt-2">
              {profile?.email_verified ? (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <span className="material-icons text-base">verified</span>
                  <span>Bestätigt</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-orange-600 text-sm">
                    <span className="material-icons text-base">pending</span>
                    <span>Nicht bestätigt</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => resendVerificationMutation.mutate()}
                    disabled={resendVerificationMutation.isPending || resendVerificationMutation.isSuccess}
                    className={`text-sm underline disabled:opacity-50 ${
                      resendVerificationMutation.isSuccess
                        ? 'text-green-600'
                        : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    {resendVerificationMutation.isPending
                      ? 'Wird gesendet...'
                      : resendVerificationMutation.isSuccess
                        ? 'E-Mail gesendet'
                        : 'E-Mail erneut senden'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Telefon</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Telefonnummer"
            />
          </div>

          {/* Row 5: Password | Password Confirmation */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Neues Passwort (optional)</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              autoComplete="new-password"
              placeholder="Leer lassen, um beizubehalten"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Passwort bestätigen</label>
            <input
              type="password"
              value={formData.password_confirm}
              onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              autoComplete="new-password"
              placeholder="Leer lassen, um beizubehalten"
            />
          </div>

          {/* Notification Preferences Section */}
          <div className="md:col-span-2 border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 mt-4">E-Mail Benachrichtigungen</h3>

            {/* Master Toggle */}
            <div className="mb-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications_enabled}
                  onChange={handleNotificationToggle}
                  className="mr-3 w-5 h-5 accent-green-600"
                />
                <span className="font-medium text-gray-800">Benachrichtigungen aktiviert</span>
              </label>
            </div>

            {/* Sub-options with visual hierarchy */}
            <div
              className="ml-8 pl-4 border-l-2 border-green-400 space-y-2 py-2"
              style={{ opacity: formData.notifications_enabled ? 1 : 0.5 }}
            >
              <p className="text-sm text-gray-500 mb-2">Benachrichtigen bei:</p>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notify_own_bookings}
                  onChange={(e) => setFormData({ ...formData, notify_own_bookings: e.target.checked })}
                  disabled={!formData.notifications_enabled}
                  className="mr-3 w-4 h-4 accent-green-600"
                />
                <span className="text-gray-700">Eigene Buchungen (erstellen, stornieren)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notify_other_bookings}
                  onChange={(e) => setFormData({ ...formData, notify_other_bookings: e.target.checked })}
                  disabled={!formData.notifications_enabled}
                  className="mr-3 w-4 h-4 accent-green-600"
                />
                <span className="text-gray-700">Buchungen durch andere Mitglieder</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notify_court_blocked}
                  onChange={(e) => setFormData({ ...formData, notify_court_blocked: e.target.checked })}
                  disabled={!formData.notifications_enabled}
                  className="mr-3 w-4 h-4 accent-green-600"
                />
                <span className="text-gray-700">Platzsperrungen (Turniere, Wartung, etc.)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notify_booking_overridden}
                  onChange={(e) => setFormData({ ...formData, notify_booking_overridden: e.target.checked })}
                  disabled={!formData.notifications_enabled}
                  className="mr-3 w-4 h-4 accent-green-600"
                />
                <span className="text-gray-700">Stornierung meiner Buchung durch Sperrung</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="md:col-span-2 flex justify-end gap-4 mt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bg-gray-300 text-gray-700 py-2 px-6 rounded hover:bg-gray-400"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
