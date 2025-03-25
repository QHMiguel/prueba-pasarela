<template>
  <header class="header-interseguro">
    <div class="header-content">
      <img src="@/assets/logo.svg" alt="Interseguro Logo" class="header-logo" />
      <div v-if="showTimer" class="session-timer">
        <span class="hourglass">⏳</span> Tiempo restante: {{ formattedTime }}
      </div>
    </div>
  </header>
</template>

<script>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useSessionTimerStore } from "@/stores/sessionTimerStore";

export default {
  name: "HeaderComponent",
  setup() {
    const route = useRoute();
    const sessionTimerStore = useSessionTimerStore();

    // Mostrar solo en las vistas de pasarela
    const showTimer = computed(() => ["Pago", "Afiliacion", "PagoCuotas"].includes(route.name));

    const formattedTime = computed(() => {
      const total = sessionTimerStore.timeLeft;
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    });

    return {
      showTimer,
      formattedTime
    };
  },
};
</script>

<style scoped>
.header-interseguro {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 40px;
  box-shadow: 0px 2px 10px #21212121;
  height: 60px;
}

.header-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.header-logo {
  height: 30px;
}

.session-timer {
  font-size: 14px;
  color: #285ae2;
  font-weight: bold;
  background: #f4f7ff;
  padding: 6px 12px;
  border-radius: 8px;
  box-shadow: 0px 2px 5px #285ae221;
  margin-left: auto;
  white-space: nowrap;
}

@keyframes spin {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}

.hourglass {
  display: inline-block;
  animation: spin 2s linear infinite;
  margin-right: 4px;
}

@media (max-width: 768px) {
  .header-interseguro {
    padding: 10px 20px;
  }

  .session-timer {
    font-size: 12px;
    padding: 4px 8px;
  }
}

@media (max-width: 480px) {
  .header-interseguro {
    padding: 8px 15px;
  }

  .session-timer {
    font-size: 11px;
    padding: 3px 6px;
  }
}
</style>
