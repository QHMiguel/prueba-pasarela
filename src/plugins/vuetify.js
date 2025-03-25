// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Vuetify
import { createVuetify } from "vuetify";

export default createVuetify({
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        typography: {
          fontFamily: "Omnes, sans-serif",
        },
        colors: {
          background: "#f1f4f9", // Configura el color de fondo
        },
      },
    },
  },
});
