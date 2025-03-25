<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ipNiubiz, getBrandCompleto } from "@/utils/helpers";
import confetti from "canvas-confetti";
import { useLoaderStore } from "@/stores/loaderStore";
import { useScreenCapture } from "@/composables/useScreenCapture";

const router = useRouter();
const loaderStore = useLoaderStore();
const screenCapture = useScreenCapture()

const animaciones = ref(false);
const cliente = ref({});
const transaccion = ref({});
const tipoPago = ref("1"); // 1: Primera prima, 2: Cuotas
const tipoPagoText = ref("");
const pasarela = ref("");
const tarjeta = ref("")

onMounted(() => {
  loaderStore.mostrarLoader("Estamos procesando su pago, esto solo tomará un momento.");

  cliente.value = JSON.parse(localStorage.getItem("cliente") || "{}");
  transaccion.value = JSON.parse(localStorage.getItem("transaccion") || "{}");
  tipoPago.value = localStorage.getItem("tipoPago");
  tipoPagoText.value = tipoPago.value === "1" ? "Primer pago exitoso" : "Pago de cuotas exitoso";

  tarjeta.value = transaccion.value.cardbrand;
  const pasarelaActual = localStorage.getItem("pasarelaActual")
  if (pasarelaActual) {
    pasarela.value = pasarelaActual
    if (pasarelaActual === "IZIPAY") {
      tarjeta.value = getBrandCompleto(transaccion.value.cardbrand)
    }
  }

  loaderStore.ocultarLoader();

  setTimeout(() => {
    animaciones.value = true;
    launchRealisticConfetti();
    setTimeout(() => {
      screenCapture.captureScreen("PAGAR");
    }, 1000)
  }, 200);
});

async function toAfiliatiom() {
  await actualizarDatosPago();
  router.push({ name: "Afiliacion" });
}

async function actualizarDatosPago() {
  const customer = cliente.value;
  const currentTimeUnix = Math.floor(Date.now()) * 1000;
  const transactionId = currentTimeUnix.toString().slice(0, 14);
  const orderNumber = currentTimeUnix.toString().slice(0, 10).toString();
  let monto = "1";
  monto = monto ? monto : customer.amount;

  const crearSesionRequest = {
    amount: parseFloat(monto),
    currency: customer.coin,
    email: customer.email,
    identityNumber: customer.docNumber,
    saleNumber: customer.policy,
    recurrenceMaxAmount: 0,
    product: customer.productAcsele,
    provider: "",
    clientIP: await ipNiubiz(),
    application: customer.aplicacion,
    transactionId,
    orderNumber,
    requestSource: "ECOMMERCE",
  };

  localStorage.setItem("crearSesionRequest", JSON.stringify(crearSesionRequest));
}

function launchRealisticConfetti() {
  const colors = ["#0855c4", "#ffffff", "#439e46"];

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
    );
  }

  fire(0.25, { particleCount: 40 });
  fire(0.2, { particleCount: 30 });
  fire(0.35, { particleCount: 50 });
  fire(0.1, { particleCount: 20 });
  fire(0.15, { particleCount: 25 });

  setTimeout(() => {
    fire(0.3, { particleCount: 60 });
    fire(0.2, { particleCount: 40 });
  }, 500);
}
</script>


<template>

  <v-container class="fill-height d-flex align-center justify-center">
    <v-row dense justify="center" align="center" class="w-100" style="gap: 16px;">
      <!-- Primera Tarjeta -->
      <transition enter-active-class="animate__animated animate__rubberBand animate__fast ">
        <v-col cols="12" md="6" lg="5" class="d-flex justify-center shrink" v-if="animaciones">
          <v-card class="div1 elevation-2 pa-4 card-max-width">
            <div class="text-center">
              <v-icon size="64" color="green" class="text-primary">mdi-check-circle-outline</v-icon>
              <h3 class="text-h5 font-weight-bold text-primary mt-3">
                {{ tipoPagoText }}
              </h3>
            </div>
            <v-divider class="my-4"></v-divider>
            <v-row>
              <v-col cols="6" class="text-secondary font-weight-medium">
                Medio de pago:
              </v-col>
              <v-col cols="6" class="text-right font-weight-bold">
                {{ tarjeta }} {{ transaccion.paycard }}
              </v-col>
            </v-row>
            <v-divider></v-divider>
            <v-row class="mt-3">
              <v-col cols="6" class="text-secondary font-weight-medium">
                Número de pedido:
              </v-col>
              <v-col cols="6" class="text-right font-weight-bold">
                {{ cliente.policy }}
              </v-col>
            </v-row>
            <v-row class="mt-3">
              <v-col cols="6" class="text-secondary font-weight-medium">
                Pasarela de Pago:
              </v-col>
              <v-col cols="6" class="text-right font-weight-bold">
                {{ pasarela }}
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6" class="text-secondary font-weight-medium">
                Cliente:
              </v-col>
              <v-col cols="6" class="text-right font-weight-bold">
                {{ cliente.name }} {{ cliente.lastName1 }}
                {{ cliente.lastName2 }}
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6" class="text-secondary font-weight-medium">
                Fecha y hora de transacción:
              </v-col>
              <v-col cols="6" class="text-right font-weight-bold">
                {{ transaccion.date }}
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6" class="text-secondary font-weight-medium">
                Monto total de transacción:
              </v-col>
              <v-col cols="6" class="text-right font-weight-bold text-primary">
                {{ cliente.coinSymbol }} {{ transaccion.amount }}
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </transition>

      <!-- Segunda Tarjeta -->
      <transition enter-active-class="animate__animated animate__rubberBand animate__fast ">
        <v-col cols="12" md="6" lg="4" class="d-flex justify-center shrink" v-if="animaciones">
          <v-card class="div2 elevation-2 pa-4 card-max-width">
            <div class="text-center" v-if="tipoPago == '1'">
              <v-icon size="64" color="#285ae2">mdi-credit-card-outline</v-icon>
              <h3 class="text-h6 font-weight-bold text-primary mt-3">
                Primer pago exitoso
              </h3>
              <p class="text-subtitle-2 text-secondary">
                Pendiente de afiliación para completar su compra. Por favor darle
                clic en el botón <strong>Afiliar medio de pago</strong>.
              </p>
            </div>
            <div class="text-center" v-if="tipoPago == '2'">
              <v-icon size="64" color="#285ae2">mdi-credit-card-outline</v-icon>
              <p class="text-subtitle-2 text-primary">
                Afilia un <strong>medio de pago automático</strong> y mantente al
                día en tus cuotas.
              </p>
              <p class="text-subtitle-2 text-secondary">
                Ahora puedes afiliar una tarjeta de crédito o débito para que tus
                cuotas se paguen de forma automática a través de un cargo
                recurrente.
              </p>
            </div>
            <v-divider class="my-4"></v-divider>
            <div class="text-center">
              <v-btn dark rounded @click="toAfiliatiom" class="btn-afiliar">
                Afiliar medio de pago
              </v-btn>
            </div>
          </v-card>
        </v-col>
      </transition>
    </v-row>
  </v-container>

</template>

<style scoped>
.div1 {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0px 5px 15px #00000026 !important;
  padding: 30px !important;
  max-width: 500px;
  text-align: center;
  transition: all 0.3s ease-in-out;
}

.div2 {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0px 5px 15px #00000026 !important;
  padding: 20px !important;
  text-align: center;
  transition: all 0.3s ease-in-out;
}

.text-primary {
  color: #285ae2 !important;
  font-family: "Omnes", sans-serif !important;
}

.text-secondary {
  color: #6c757d !important;
  font-family: "Omnes", sans-serif !important;
}

.v-row {
  font-size: 0.875rem !important;
}

.btn-afiliar {
  background-color: #ff4081 !important;
  color: #ffffff;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.btn-afiliar:hover {
  box-shadow: 0px 4px 10px #00000026;
  transform: translateY(-2px);
}

.card-max-width {
  max-width: 100%;
}
</style>
