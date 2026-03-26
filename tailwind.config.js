/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        mist: "#dce9ff",
        signal: "#7cf2c9",
        flare: "#ffd36b",
        coral: "#ff8c69",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(148, 163, 184, 0.15), 0 22px 80px rgba(8, 17, 31, 0.45)",
      },
    },
  },
  plugins: [],
};
