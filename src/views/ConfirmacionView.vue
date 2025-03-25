<script setup>
import { ref, onMounted } from 'vue'
import confetti from 'canvas-confetti'
import { useLoaderStore } from '@/stores/loaderStore'
import { useScreenCapture } from "@/composables/useScreenCapture";
import { getBrandCompleto } from "@/utils/helpers";

const loaderStore = useLoaderStore()
const screenCapture = useScreenCapture()

const animaciones = ref(false)
const title = ref("Pago y afiliación de tarjeta exitosos")
const transaccion = ref({})
const cliente = ref({})
const tipoPago = ref(1) // 1: Primera prima, 2: Cuotas
const pasarela = ref("");
const tarjeta = ref("")

onMounted(() => {
  loaderStore.mostrarLoader('Estamos procesando su pago, esto solo tomará un momento.')

  const storedCliente = localStorage.getItem("cliente")
  if (storedCliente) {
    cliente.value = JSON.parse(storedCliente)
  }

  const storedTransaccion = localStorage.getItem("transaccion")
  if (storedTransaccion) {
    transaccion.value = JSON.parse(storedTransaccion)
  }

  const storedTipoPago = localStorage.getItem("tipoPago")
  if (storedTipoPago) {
    tipoPago.value = storedTipoPago
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
      screenCapture.captureScreen("PAGAR_AFILIAR");
    }, 1000)
  }, 200)
})

function launchRealisticConfetti() {
  const colors = ["#285ae2", "#ffffff", "#ff4081"]

  function fire(particleRatio, opts) {
    confetti(
      Object.assign(
        {
          colors: colors,
          origin: { y: 0.6 },
          spread: 90,
          startVelocity: 55,
          ticks: 150,
          gravity: 1.2,
          decay: 0.9,
          scalar: 0.6,
        },
        opts
      )
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
  }, 1000)
}

</script>


<template>
  <v-container class="d-flex justify-center align-center fill-height">

    <transition enter-active-class="animate__animated animate__rubberBand animate__fast ">
      <v-card class="elevation-3" max-width="500" v-if="animaciones" id="comprobante">
        <v-card-title class="d-flex justify-center mb-4">
          <div class="d-flex justify-center align-center" style="
              border-radius: 50%;
              width: 60px;
              height: 60px;
              margin-top: 20px;
            ">
            <v-icon size="60" class="text-success">mdi-check-circle-outline</v-icon>
          </div>
        </v-card-title>
        <v-card-text>
          <div class="text-center">
            <h2 class="text-h5 font-weight-bold text-success mb-3">
              {{ title }}
            </h2>
            <p class="text-subtitle-2 text-secondary">
              Los detalles de tu transacción se muestran a continuación.
            </p>
          </div>
          <v-divider class="my-4"></v-divider>
          <v-row>
            <v-col cols="6">
              <span class="font-weight-medium text-secondary">Medio de pago:</span>
            </v-col>
            <v-col cols="6" class="text-right">
              <span class="font-weight-bold">{{ tarjeta }} {{
                transaccion.paycard }}</span>
            </v-col>
          </v-row>
          <br>
          <v-divider></v-divider>
          <v-row class="mt-3">
            <v-col cols="6">
              <span class="font-weight-medium text-secondary">Número de pedido:</span>
            </v-col>
            <v-col cols="6" class="text-right">
              <span class="font-weight-bold">{{ cliente.policy }}</span>
            </v-col>
          </v-row>
          <v-row class="mt-3" v-if="pasarela">
            <v-col cols="6">
              <span class="font-weight-medium text-secondary">Pasarela de Pago:</span>
            </v-col>
            <v-col cols="6" class="text-right">
              <span class="font-weight-bold">{{ pasarela }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <span class="font-weight-medium text-secondary">Cliente:</span>
            </v-col>
            <v-col cols="6" class="text-right">
              <span class="font-weight-bold">{{ cliente.name }} {{ cliente.lastName1 }}
                {{ cliente.lastName2 }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <span class="font-weight-medium text-secondary">Fecha y hora:</span>
            </v-col>
            <v-col cols="6" class="text-right">
              <span class="font-weight-bold">{{ transaccion.date }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <span class="font-weight-medium text-secondary">Monto total:</span>
            </v-col>
            <v-col cols="6" class="text-right">
              <span class="font-weight-bold text-success">{{ cliente.coinSymbol }} {{ transaccion.amount }}</span>
            </v-col>
          </v-row>
          <v-divider class="my-4"></v-divider>
          <p class="text-body-2 text-secondary text-justify">
            Ten en cuenta que, en adelante, se realizarán de forma automática,
            desde esta tarjeta, los pagos de tus cuotas.
          </p>
        </v-card-text>
      </v-card>
    </transition>
  </v-container>
</template>


<style scoped>
#comprobante {
  box-shadow: 0px 5px 15px #00000026 !important;
  font-family: "Omnes", sans-serif !important;
  border-radius: 12px;
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
