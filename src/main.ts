import { createApp } from "vue";
import App from "./App.vue";

// Import Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css' // Import MDI icon styles

// Import i18n
import i18n from './i18n'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi', // Set default icon set to mdi
  },
})

createApp(App)
  .use(vuetify)
  .use(i18n)
  .mount("#app");
