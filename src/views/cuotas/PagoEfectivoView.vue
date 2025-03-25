<script setup>
import { ref, onMounted } from 'vue'
import confetti from "canvas-confetti"
import { useLoaderStore } from '@/stores/loaderStore'
import { useScreenCapture } from "@/composables/useScreenCapture";

const animaciones = ref(false)
const cliente = ref({})
const transaccionPagoEfectivo = ref({})

const loaderStore = useLoaderStore()
const screenCapture = useScreenCapture()

onMounted(() => {
  loaderStore.mostrarLoader("Estamos generando su orden de pago, esto solo tomará un momento.")

  const storedCliente = localStorage.getItem("cliente")
  if (storedCliente) {
    cliente.value = JSON.parse(storedCliente)
  }
  const storedTransaccion = localStorage.getItem("transaccionPagoEfectivo")
  if (storedTransaccion) {
    transaccionPagoEfectivo.value = JSON.parse(storedTransaccion).data
  }

  loaderStore.ocultarLoader()

  setTimeout(() => {
    animaciones.value = true
    launchRealisticConfetti()
    setTimeout(() => {
      screenCapture.captureScreen("PAGO EFECTIVO");
    }, 1000)
  }, 500)
})

function launchRealisticConfetti() {
  const colors = ["#0855c4", "#ffffff", "#439e46"]

  function fire(particleRatio, opts) {
    confetti(Object.assign({
      colors: colors,
      origin: { y: 0.6 },
      spread: 90,
      startVelocity: 55,
      ticks: 150,
      gravity: 1.2,
      decay: 0.9,
      scalar: 0.6,
    }, opts))
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

<template>
  <transition enter-active-class="animate__animated animate__rubberBand animate__fast ">
    <v-container class="d-flex justify-center align-center fill-height pago-efectivo-form" v-if="animaciones">
      <!-- Card principal -->
      <v-card class="mx-auto pa-4 success-card" max-width="400" elevation="2">
        <!-- Icono de check grande y centrado -->
        <div class="icon-wrapper">
          <v-icon class="check-icon" large>mdi-check-circle-outline</v-icon>
        </div>

        <!-- Título principal -->
        <v-card-title class="title-success justify-center">
          Creación de Orden Pago Efectivo creada
        </v-card-title>

        <!-- Texto con la información del pago -->
        <v-card-text class="text-center info-text">
          <p><strong>Medio de pago:</strong> Pago Efectivo</p>
          <v-divider class="my-2"></v-divider>

          <p>Número de póliza: {{ cliente.policy }}</p>
          <p>Cliente: {{ cliente.name }} {{ cliente.lastName1 }} {{ cliente.lastName2 }}</p>
          <p>Fecha de expiración pago efectivo: {{ transaccionPagoEfectivo.expirationDate }}</p>
          <p class="text-primary"><strong>Código de pago efectivo:</strong> {{ transaccionPagoEfectivo.paymentCode }}
          </p>
          <p>Monto total de transacción: {{ cliente.coinSymbol }} {{ transaccionPagoEfectivo.amount }}</p>

          <v-divider class="my-2"></v-divider>

          <p>Te hemos enviado a tu mail el código de Pago Efectivo y el detalle de lugares de pago.</p>
          <p><strong>Vigencia del código:</strong> 24 horas</p>
        </v-card-text>
      </v-card>
    </v-container>
  </transition>
</template>

<style scoped>
.pago-efectivo-form {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Omnes", sans-serif !important;
}

.success-card {
  background-color: #fff;
  border-radius: 12px !important;
  box-shadow: 0px 5px 15px #00000026 !important;
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
}

.check-icon {
  font-size: 48px;
  color: #285ae2;
}

.title-success {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  color: #285ae2;
  margin: 0;
}

.info-text p {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.4;
}

.text-primary {
  color: #285ae2 !important;
}
</style>
