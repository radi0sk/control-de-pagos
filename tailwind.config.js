/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // Asegúrate de incluir todos tus archivos React aquí
  ],
  theme: {
    extend: {
      // Aquí puedes extender los temas de Tailwind con tus colores personalizados, fuentes, etc.
      colors: {
        'gray-soft': '#F2F2F2',
        'blue-dark': '#1F3A93',
        'blue-secondary': '#002B5B',
        'white-pure': '#FFFFFF',
        'black-soft': '#1C1C1C',
        // Si tienes colores específicos para errores/éxito, puedes definirlos aquí también
        'red-dark': '#C53030', // Ejemplo de un rojo más oscuro para el texto pendiente
      },
    },
  },
  plugins: [],
}
