<template>
  <v-app>
    <HeaderComponent />
    <v-main class="main-container">
      <LoadingScreen />
      <router-view :key="routeKey" />
    </v-main>
    <FooterComponent />
  </v-app>
</template>

<script>
import FooterComponent from "./components/Footer.vue";
import HeaderComponent from "./components/Header.vue";
import LoadingScreen from '@/components/LoadingScreen.vue'
import { computed } from "vue";
import { useRoute } from "vue-router";
export default {
  name: "App",
  components: {
    FooterComponent,
    HeaderComponent,
    LoadingScreen
  },
  setup() {
    const route = useRoute();
    const routeKey = computed(() => route.fullPath);
    return { routeKey };
  },
};
</script>

<style>
.v-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: center;
}
</style>
