module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#3fbd15',
        'primary-dark': '#3a991a'
      },
      fontFamily: {
        'cursive': ['"Shadows Into Light Two"', 'cursive'],
        'round': ['"Varela Round"', 'sans-serif']
      },
      backgroundImage: {
        'notes': "url('/img/notes.png')",
      }
    },
  },
  plugins: [],
}