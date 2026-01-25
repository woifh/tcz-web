import { useState } from 'react';
import { MainLayout } from '../components/layout';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    category: 'Buchungen',
    question: 'Wie kann ich einen Platz reservieren?',
    answer: 'Gehen Sie zur Platzuebersicht und klicken Sie auf einen gruenen (verfuegbaren) Zeitslot. Waehlen Sie den gewuenschten Platz und bestaetigen Sie die Buchung.',
  },
  {
    category: 'Buchungen',
    question: 'Wie storniere ich eine Buchung?',
    answer: 'Gehen Sie zu "Meine Reservierungen" und klicken Sie auf "Stornieren" bei der entsprechenden Buchung. Beachten Sie die Stornierungsfristen.',
  },
  {
    category: 'Buchungen',
    question: 'Wie viele Buchungen kann ich gleichzeitig haben?',
    answer: 'Vollmitglieder koennen bis zu 2 aktive Buchungen gleichzeitig haben. Foerdermitglieder koennen keine Plaetze reservieren.',
  },
  {
    category: 'Buchungen',
    question: 'Was ist eine kurzfristige Buchung?',
    answer: 'Eine kurzfristige Buchung ist eine Reservierung innerhalb von 24 Stunden. Diese Buchungen werden nicht auf Ihr Buchungslimit angerechnet.',
  },
  {
    category: 'Konto',
    question: 'Wie aendere ich mein Passwort?',
    answer: 'Gehen Sie zu "Mein Profil" und klicken Sie auf "Passwort aendern". Geben Sie Ihr aktuelles Passwort und das neue Passwort ein.',
  },
  {
    category: 'Konto',
    question: 'Wie aktiviere ich E-Mail-Benachrichtigungen?',
    answer: 'In Ihrem Profil finden Sie die Benachrichtigungseinstellungen. Aktivieren Sie dort die gewuenschten E-Mail-Benachrichtigungen.',
  },
  {
    category: 'Konto',
    question: 'Wie bestatige ich meine Mitgliedsbeitragszahlung?',
    answer: 'Klicken Sie in Ihrem Profil auf "Zahlung bestaetigen". Ein Administrator wird Ihre Anfrage pruefen und den Zahlungseingang bestaetigen.',
  },
  {
    category: 'Favoriten',
    question: 'Was sind Favoriten?',
    answer: 'Favoriten sind andere Mitglieder, die Sie haeufig als Spielpartner auswaehlen. Sie koennen Favoriten hinzufuegen, um schneller Buchungen fuer diese Personen zu erstellen.',
  },
  {
    category: 'Sperrungen',
    question: 'Was bedeutet "Platz gesperrt"?',
    answer: 'Ein gesperrter Platz ist fuer einen bestimmten Zeitraum nicht buchbar. Gruende koennen Wartungsarbeiten, Turniere oder Trainings sein.',
  },
  {
    category: 'Sperrungen',
    question: 'Was passiert mit meiner Buchung bei einer Sperrung?',
    answer: 'Wenn ein Platz gesperrt wird und Ihre Buchung betroffen ist, wird diese automatisch suspendiert. Sie werden per E-Mail benachrichtigt.',
  },
];

export default function HelpCenter() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const filteredItems = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(filteredItems.map((item) => item.category)));

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Hilfe-Center</h1>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <input
            type="text"
            placeholder="Suche in der Hilfe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* FAQ Items by Category */}
        {categories.map((category) => (
          <div key={category} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <h2 className="text-lg font-medium text-gray-900 px-6 py-4 bg-gray-50 border-b">
              {category}
            </h2>
            <div className="divide-y">
              {filteredItems
                .filter((item) => item.category === category)
                .map((item) => {
                  const globalIndex = faqItems.indexOf(item);
                  const isOpen = openItems.has(globalIndex);
                  return (
                    <div key={globalIndex}>
                      <button
                        onClick={() => toggleItem(globalIndex)}
                        className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center justify-between gap-4"
                      >
                        <span className="font-medium text-gray-800">{item.question}</span>
                        <span
                          className={`material-icons text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        >
                          expand_more
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4 text-gray-600">{item.answer}</div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            Keine Ergebnisse gefunden fuer "{searchQuery}"
          </div>
        )}

        {/* Contact Section */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-2">Noch Fragen?</h2>
          <p className="text-blue-800">
            Wenn Sie weitere Hilfe benoetigen, wenden Sie sich bitte an einen Administrator oder
            schreiben Sie eine E-Mail an{' '}
            <a href="mailto:info@tc-zellerndorf.at" className="underline">
              info@tc-zellerndorf.at
            </a>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
