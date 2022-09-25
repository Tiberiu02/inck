module.exports = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        primary: "#3fbd15",
        "primary-dark": "#3a991a",
        "primary-light": "#47d119",
        "inck-red": "#ff2020",
        select: "#64c8ff",
      },
      opacity: {
        select: 0.5,
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
        "selected-file": [
          "0 0px 10px rgb(100 200 255 / 0.1)",
          "0 5px 0px rgb(100 200 255 / 1)",
          "0 -5px 0px rgb(100 200 255 / 1)",
          "5px 0 0px rgb(100 200 255 / 1)",
          "-5px 0 0px rgb(100 200 255 / 1)",
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
