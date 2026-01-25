import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // Error is handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation bar */}
      <nav className="bg-green-700 text-white p-4" id="main-navigation">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <img src="/tcz_icon.png" alt="TCZ Logo" className="rounded-full" style={{ height: 60, width: 60 }} />
              <span className="hidden sm:inline">Tennisclub Zellerndorf</span>
              <span className="sm:hidden">TC Zellerndorf</span>
              <span className="material-icons">sports_tennis</span>
            </h1>
            <Link to="/login" className="hover:bg-green-600 px-3 py-2 rounded transition-colors flex items-center gap-1">
              <span className="material-icons text-sm">login</span>
              <span>Anmelden</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto mt-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 mt-12">
          <div className="flex justify-center mb-6">
            <img src="/tcz_icon.png" alt="Tennisclub Zellerndorf Logo" style={{ height: 150, width: 150 }} />
          </div>
          <h2 className="text-2xl font-bold mb-6 text-center">Anmelden</h2>

          {error && (
            <div className="mb-4 p-4 rounded flex items-center gap-3 bg-red-100 text-red-700">
              <span className="material-icons">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                E-Mail
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
                Passwort
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-icons">login</span>
              {isSubmitting ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-gray-600 hover:text-green-600 transition duration-200 flex items-center justify-center gap-1">
              <span className="material-icons text-sm">arrow_back</span>
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
