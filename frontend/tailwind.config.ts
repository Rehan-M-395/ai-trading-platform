import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#04070d",
        foreground: "#e5eef8",
        card: "#0b1220",
        muted: "#8ca0b7",
        border: "rgba(148, 163, 184, 0.16)",
        accent: "#d946ef",
        success: "#22c55e",
        danger: "#f97316"
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
        display: ["Space Grotesk", "Trebuchet MS", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(217, 70, 239, 0.16), 0 24px 80px rgba(3, 7, 18, 0.62)",
        soft: "0 20px 60px rgba(2, 6, 23, 0.45)"
      },
      backgroundImage: {
        "terminal-grid":
          "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)"
      },
      animation: {
        float: "float 10s ease-in-out infinite",
        pulseSoft: "pulseSoft 5s ease-in-out infinite",
        slideUp: "slideUp 0.5s ease-out"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.85" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0px)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
