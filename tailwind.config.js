/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"   // <-- make sure .tsx is included (and friends)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
