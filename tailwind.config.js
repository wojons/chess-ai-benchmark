/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // CYBER-BRUTALIST COLOR PALETTE
      colors: {
        // Core Backgrounds
        obsidian: "#020202",
        void: "#050505",
        midnight: "#0a0a0a",
        "slate-950": "#0a0a0a",
        "slate-900": "#111111",
        "slate-800": "#1a1a1a",
        "slate-700": "#222222",
        "slate-600": "#333333",
        "slate-500": "#444444",
        "slate-400": "#666666",
        "slate-300": "#888888",
        "slate-200": "#aaaaaa",
        "slate-100": "#cccccc",
        "slate-50": "#eeeeee",

        // Ghost White / High-Contrast
        ghost: "#F5F5F7",
        "ghost-50": "rgba(245, 245, 247, 0.5)",
        "ghost-20": "rgba(245, 245, 247, 0.2)",

        // Model Identity Accents
        "electric-cyan": "#06b6d4",
        "electric-cyan-600": "#0891b2",
        "neon-vermilion": "#ff4444",
        "neon-vermilion-600": "#dc2626",

        // Neural Stream Colors
        whisper: "rgba(6, 182, 212, 0.4)",
        shout: "#F5F5F7",
      },
      fontFamily: {
        // JetBrains Mono for logs and data
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Consolas"', "monospace"],
        // Heavy, ultra-tracking sans for headers (Inter/Roboto style)
        sans: [
          '"Inter"',
          '"Roboto"',
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        // Micro- typography sizes
        xxs: "0.625rem",
        xxxs: "0.5rem",
      },
      borderWidth: {
        // Brutalist 1px borders
        brutalist: "1px",
      },
      animation: {
        // Cyber-Brutalist animations
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "neural-pulse": "neuralPulse 2s ease-in-out infinite",
        glitch: "glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        typewriter: "typewriter 0.05s steps(1) forwards",
        scanline: "scanline 4s linear infinite",
        shake: "shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
      },
      keyframes: {
        // Neural Pulse: Scanning line effect
        neuralPulse: {
          "0%, 100%": { opacity: "0.1" },
          "50%": { opacity: "0.3" },
        },
        // Glitch: Turn transition effect
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
        // Typewriter: Character reveal effect
        typewriter: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Scanline: Subtle overlay animation
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        // Shake: Move impact effect
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-2px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(2px)" },
        },
        glow: {
          "0%": { opacity: "0.8" },
          "100%": { opacity: "1" },
        },
      },
      backgroundImage: {
        // Subtle noise texture
        "noise-pattern":
          "url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22256%22 height=%22256%22 fill=%22transparent%22/%3E%3Crect width=%22256%22 height=%22256%22 filter=%22url(%23noise)%22 opacity=%220.05%22/%3E%3C/svg%3E')",
        // Scanline overlay
        "scanline-pattern":
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.03) 2px)",
      },
    },
  },
  plugins: [],
};
