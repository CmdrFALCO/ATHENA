/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tri-color system (will use later)
        'connection-blue': '#3B82F6',    // Explicit connections
        'connection-green': '#22C55E',   // Semantic suggestions
        'connection-red': '#EF4444',     // Validation errors
        'connection-amber': '#F59E0B',   // Validation warnings
      },
    },
  },
  plugins: [],
};
