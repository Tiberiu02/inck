module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3fbd15",
        "primary-dark": "#3a991a",
        "primary-light": "#47d119",
        red: "#ff2020",
      },
      fontFamily: {
        cursive: ['"Shadows Into Light Two"', "cursive"],
        round: ['"Varela Round"', "sans-serif"],
      },
      backgroundImage: {
        notes: "url('/img/notes.png')",
      },
      dropShadow: {
        "md-vertical": [
          "0 4px 3px rgb(0 0 0 / 0.07)",
          "0 2px 2px rgb(0 0 0 / 0.06)",
          "0 -4px 3px rgb(0 0 0 / 0.05)",
          "0 -2px 2px rgb(0 0 0 / 0.04)",
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
