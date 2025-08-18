/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'light-gray-bg': '#F5F7FA',
        'subtle-gray': '#E0E3E8',
        'mint-green': {
          DEFAULT: '#2EC4B6',
          '50': '#E8F6F5',
          '100': '#D4EBE9',
          '200': '#AEE3DD',
          '300': '#88DBC0',
          '400': '#52CEB6',
          '500': '#2EC4B6',
          '600': '#2AB8A9',
          '700': '#219688',
          '800': '#1C7A6E',
          '900': '#176159',
        },
        'energetic-orange': {
          DEFAULT: '#FF9F1C',
          '50': '#FFF6E8',
          '100': '#FFEAD4',
          '200': '#FFD0A1',
          '300': '#FFB66F',
          '400': '#FF9F1C',
          '500': '#E68700',
          '600': '#CC7A00',
          '700': '#B36D00',
          '800': '#995B00',
          '900': '#7F4D00',
        },
        'pastel-pink': '#F7D2DD',
        'pastel-blue': '#A0D2EB',
        'pastel-purple': '#D0BDF4',
        'pastel-teal': '#C4F2EE',
      },
    },
  },
  plugins: [],
}