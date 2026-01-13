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
        // Dark theme colors
        athena: {
          bg: '#1a1a1a',        // Main background
          surface: '#252525',   // Panels, sidebar
          border: '#3a3a3a',    // Subtle borders
          text: '#e0e0e0',      // Primary text
          muted: '#888888',     // Secondary text
        },
      },
    },
  },
  plugins: [],
};
