/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3F66F5",
          dark: "#2E4FD1",
          light: "#7C97FF",
        },
      },
    },
  },
  plugins: [],
};
