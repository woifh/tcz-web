import { Link } from 'react-router-dom';

export default function ServerError() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-9xl font-bold text-gray-300 mb-4">500</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Serverfehler</h1>
        <p className="text-xl text-gray-600 mb-8">
          Ein interner Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.
        </p>
        <Link
          to="/"
          className="inline-block bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
