/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Temporary block colors (generated dynamically in dashboard.js and templates)
    'bg-yellow-400',
    'bg-yellow-100',
    'bg-yellow-50',
    'text-yellow-700',
    'text-yellow-800',
    'text-yellow-900',
    'border-yellow-400',
  ],
  theme: {
    extend: {
      colors: {
        'court-available': '#10b981',  // green-500
        'court-reserved': '#ef4444',   // red-500
        'court-blocked': '#6b7280',    // gray-500
      },
    },
  },
  plugins: [],
}
