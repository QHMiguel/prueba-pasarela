<template>
  <v-container class="d-flex justify-center align-center fill-height">

    <transition enter-active-class="animate__animated animate__rubberBand animate__fast ">
      <v-card class="success-card" v-if="animaciones">
        <v-card-text class="text-center">
          <v-icon size="48" class="text-success">mdi-check-circle-outline</v-icon>
          <h2 class="title text-success">Afiliación de medio de pago exitosa</h2>
          <v-divider class="my-4"></v-divider>

          <div class="info-section">
            <div class="info-row centered-row">
              <p>
                <strong>{{ tarjeta }} {{ transaccion.paycard }}</strong>
              </p>
            </div>
            <div class="info-row" v-if="pasarela">
              <p class="info-label">Pasarela de Pago:</p>
              <p class="info-value">{{ pasarela }}</p>
            </div>
            <div class="info-row">
              <p class="info-label">Número de pedido:</p>
              <p class="info-value">{{ cliente.policy }}</p>
            </div>
            <div class="info-row">
              <p class="info-label">Cliente:</p>
              <p class="info-value">
                {{ cliente.name }} {{ cliente.lastName1 }}
                {{ cliente.lastName2 }}
              </p>
            </div>
            <div class="info-row">
              <p class="info-label">Fecha y hora de transacción:</p>
              <p class="info-value">{{ transaccion.date }}</p>
            </div>
          </div>

          <v-divider class="my-4"></v-divider>

          <p class="note">
            Ten en cuenta que en adelante se realizarán de forma automática, desde
            esta tarjeta, los pagos de tus cuotas.
          </p>
        </v-card-text>
      </v-card>
    </transition>

  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import confetti from 'canvas-confetti'
import { useLoaderStore } from '@/stores/loaderStore'
import { useScreenCapture } from "@/composables/useScreenCapture";
import { getBrandCompleto } from "@/utils/helpers";

const loaderStore = useLoaderStore()
const screenCapture = useScreenCapture()

const cliente = ref({})
const transaccion = ref({})
const animaciones = ref(false)

const pasarela = ref("");
const tarjeta = ref("")

onMounted(() => {
  loaderStore.mostrarLoader('Estamos procesando su afiliación, esto solo tomará un momento.')

  const storedCliente = localStorage.getItem("cliente")
  if (storedCliente) {
    cliente.value = JSON.parse(storedCliente)
  }

  const storedTransaccion = localStorage.getItem("transaccion")
  if (storedTransaccion) {
    transaccion.value = JSON.parse(storedTransaccion)
  }

  tarjeta.value = transaccion.value.cardbrand;
  const pasarelaActual = localStorage.getItem("pasarelaActual")
  if (pasarelaActual) {
    pasarela.value = pasarelaActual
    if (pasarelaActual === "IZIPAY") {
      tarjeta.value = getBrandCompleto(transaccion.value.cardbrand)
    }
  }

  loaderStore.ocultarLoader()

  setTimeout(() => {
    animaciones.value = true
    launchRealisticConfetti()
    setTimeout(() => {
      screenCapture.captureScreen("AFILIAR");
    }, 1000)
  }, 200)
})

function launchRealisticConfetti() {
  const colors = ["#0855c4", "#ffffff", "#439e46"]

  function fire(particleRatio, opts) {
    confetti(
      Object.assign({
        colors: colors,
        origin: { y: 0.6 },
        spread: 90,
        startVelocity: 55,
        ticks: 150,
        gravity: 1.2,
        decay: 0.9,
        scalar: 0.6,
      }, opts)
    )
  }

  fire(0.25, { particleCount: 40 })
  fire(0.2, { particleCount: 30 })
  fire(0.35, { particleCount: 50 })
  fire(0.1, { particleCount: 20 })
  fire(0.15, { particleCount: 25 })

  setTimeout(() => {
    fire(0.3, { particleCount: 60 })
    fire(0.2, { particleCount: 40 })
  }, 500)
}
</script>


<style scoped>
.center-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #fff;
  padding: 20px;
}

.success-card {
  max-width: 500px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0px 5px 15px #00000026 !important;
  background-color: #fff;
  transition: all 0.3s ease-in-out;
}

.title {
  font-family: "Omnes", sans-serif !important;
  font-size: 25px;
  font-weight: 600;
}

.info-section {
  font-size: 14px;
  color: #212121;
  line-height: 1.6;
  margin-top: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.centered-row {
  justify-content: center;
  text-align: center;
}

.info-label {
  font-weight: normal;
  color: #616161;
  text-align: left;
  font-family: "Omnes", sans-serif !important;
}

.info-value {
  font-weight: bold;
  color: #212121;
  text-align: right;
  font-family: "Omnes", sans-serif !important;
}

.note {
  font-size: 14px;
  color: #616161;
  text-align: center;
  margin-top: 10px;
  font-family: "Omnes", sans-serif !important;
}

.main-container {
  align-items: center !important;
}

.text-success {
  color: #285ae2 !important;
  font-family: "Omnes", sans-serif !important;
}

.text-secondary {
  color: #6c757d !important;
  font-family: "Omnes", sans-serif !important;
}
</style>
