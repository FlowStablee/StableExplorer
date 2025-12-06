/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: "#00ff9d",       // FlowStable Green
        dark: "#050505",       // Deep Black
        card: "#0a0a0a",       // Card BG
        border: "#222222",     // Subtle Border
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'], // Hacker Font
      },
      backgroundImage: {
        'cyber-grid': "linear-gradient(rgba(0, 255, 157, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 157, 0.05) 1px, transparent 1px)",
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}