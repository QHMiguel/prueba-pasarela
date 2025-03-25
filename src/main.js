import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import { loadFonts } from "./plugins/webfontloader";
import "./styles/global.css";
import "./styles/fonts.css";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import "animate.css";
import emitter from "./plugins/mitt";
import isPasarelaCompoment from "is-pasarela-component";

import configData from "./config/config.json";

loadFonts();

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate)

let environment = process.env.VUE_APP_ENV;

if (!configData[environment]) {
  console.info(
    `No se encontró configuración para el ambiente "${environment}". Se usará "dev" por defecto.`
  );
  environment = "dev";
}

app.config.globalProperties.$config = configData[environment];

app.use(pinia);
app.use(router);
app.use(vuetify);
app.component("is-pasarela-compoment", isPasarelaCompoment);

app.config.globalProperties.$emitter = emitter;

app.mount("#app");
