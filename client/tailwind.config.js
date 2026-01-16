/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0f172a", // Slate 900
                secondary: "#334155", // Slate 700
                accent: "#3b82f6", // Blue 500
                background: "#f8fafc", // Slate 50
                bolivar: {
                    green: '#016D39', // Fun Green - Primary
                    dark: '#00522B',  // Darker shade for interaction
                    yellow: '#FFD050', // Mustard - Accent
                    light: '#E6F0EB', // Very light green for backgrounds
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
