import { onMounted } from 'vue';
<script>

export default {
  data() {
    return {
      animacion: false
    };
  },
  mounted() {
    setTimeout(() => {
      this.animacion = true;
    }, 1000);
  },
  methods: {
    goBack() {
      let token = localStorage.getItem("token");
      let propuesta = localStorage.getItem("propuesta");
      this.$router.push({ name: "BuscarCliente", query: { propuesta, token } });
    },
  },
};
</script>

<template>
  <v-container class="pa-4">

    <div class="contenido">
      <transition enter-active-class="animate__animated animate__fadeInUp">
        <v-card class="text-center pa-6 error-card" v-if="animacion">

          <v-icon class="sad-icon">mdi-emoticon-sad-outline</v-icon>
          <h2 class="error-title">Sesión Caducada</h2>
          <p class="error-message">
            Por razones de seguridad, tu sesión ha caducado. No te preocupes, puedes volver a intentarlo cuando estés
            listo.
          </p>
          <v-btn class="btn-inicio mt-4" @click="goBack()">
            Regresar al inicio
          </v-btn>
        </v-card>
      </transition>
    </div>

  </v-container>
</template>

<style scoped>
.contenido {
  display: flex;
  justify-content: center;
  align-items: center;
}

.error-card {
  border-radius: 14px;
  box-shadow: 0px 5px 15px #00000026;
  transition: all 0.3s ease-in-out;
  max-width: 420px;
  padding: 40px !important;
  background-color: #ffffff;
  text-align: center;
}

.sad-icon {
  font-size: 64px;
  color: #285ae2;
  margin-bottom: 15px;
}

.error-title {
  font-size: 22px;
  font-weight: bold;
  color: #212121;
  margin-bottom: 8px;
}

.error-message {
  font-size: 16px;
  color: #666;
  line-height: 1.5;
}

.btn-inicio {
  background-color: #ff4081;
  color: #ffffff;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s ease;
}

.btn-inicio:hover {
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}
</style>
