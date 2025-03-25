<template>
  <div class="buscar-cliente-container">

    <transition enter-active-class="animate__animated animate__slideInLeft animate__fast ">
      <div class="info-container" v-if="animaciones">
        <h2>
          <span class="highlight">Realiza el pago</span>
          <br />
          <span class="normal">de tu seguro sin salir de casa. </span>
        </h2>
      </div>
    </transition>

    <transition enter-active-class="animate__animated animate__slideInRight animate__fast ">
      <div class="form-container" v-if="animaciones">
        <h2>Ingresa tus datos</h2>
        <v-form @submit.prevent="handleSubmit">
          <v-text-field label="Ingresa tu DNI/CE/RUC" v-model="numeroDocumento" variant="outlined" class="custom-input"
            @input="soloNumeros" />
          <v-btn color="primary" :disabled="!numeroDocumento" class="continue-button" @click="buscarCliente">
            CONTINUAR
          </v-btn>
          <div v-if="mostrarAlerta" class="custom-alert">
            <span>{{ alertaMensaje }}</span>
          </div>
        </v-form>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import gatewayService from '@/services/pasarelaGatewayService'
import { ipNiubiz } from '@/utils/helpers'
import { useLoaderStore } from '@/stores/loaderStore'
import { useUiStore } from "@/stores/useUiStore";

const animaciones = ref(false)
const numeroDocumento = ref("")
const mostrarAlerta = ref(false)
const alertaMensaje = ref("")
const tokenUrl = ref("")
const propuestaUrl = ref("")
const cliente = ref({})
const proveedorPrincipal = ref("")

const router = useRouter()
const loaderStore = useLoaderStore()
const uiStore = useUiStore()


onMounted(() => {
  animaciones.value = true
  obtenerParametrosURL()
  loaderStore.ocultarLoader()
})

function handleSubmit() {
  if (!numeroDocumento.value) {
    alertaMensaje.value = "Número de documento es necesario"
    mostrarAlerta.value = true
    return
  }
  buscarCliente()
}

function soloNumeros(event) {
  numeroDocumento.value = event.target.value.replace(/[^0-9]/g, "")
  if (!numeroDocumento.value) {
    mostrarAlerta.value = false
  }
}

function obtenerParametrosURL() {
  const urlParams = new URLSearchParams(window.location.search)
  const propuesta = urlParams.get("propuesta") || urlParams.get("poliza")
  const token = urlParams.get("token")
  if (token && propuesta) {
    localStorage.setItem("propuesta", propuesta)
    localStorage.setItem("token", token)
    tokenUrl.value = token
    propuestaUrl.value = propuesta
  } else {
    alertaMensaje.value = "La URL no contiene token o propuesta/póliza"
    mostrarAlerta.value = true
  }
}

async function buscarCliente() {  
  loaderStore.mostrarLoader("Estamos verificando sus datos, esto solo tomará un momento.")
  mostrarAlerta.value = false

  try {    
    if (!tokenUrl.value) {
      alertaMensaje.value = "La URL no contiene ningún token"
      mostrarAlerta.value = true
      loaderStore.ocultarLoader()
      return
    }
    if (!propuestaUrl.value) {
      alertaMensaje.value = "La URL no contiene ninguna propuesta o póliza"
      mostrarAlerta.value = true
      loaderStore.ocultarLoader()
      return
    }
    if (!numeroDocumento.value) {
      alertaMensaje.value = "Número de documento es necesario"
      mostrarAlerta.value = true
      loaderStore.ocultarLoader()
      return
    }

    localStorage.setItem("numeroDocumento", numeroDocumento.value)

    const response = await gatewayService.buscarClienteV2(tokenUrl.value, numeroDocumento.value, propuestaUrl.value)

    if (response.status === 200) {
      if (response.data.codigoRespuesta !== "01") {
        if (response.data.mensajeRespuesta.toUpperCase().includes('PAGADO')) {
          alertaMensaje.value = 'El pago ya ha sido realizado. Si no has realizado este pago o tienes dudas al respecto, por favor contacta a Interseguro para más información.';
        } else if (response.data.mensajeRespuesta.toUpperCase().includes('CADUCADO')) {
          alertaMensaje.value = 'El link de pago ha caducado, por favor contacta a Interseguro para más información.';
        } else if (response.data.mensajeRespuesta.toUpperCase().includes('ELIMINADO')) {
          alertaMensaje.value = 'El link de pago ha sido eliminado, por favor contacta a Interseguro para más información.';
        } else {
          alertaMensaje.value = response.data.mensajeRespuesta;
        }
        mostrarAlerta.value = true
        loaderStore.ocultarLoader()
        return
      }
      const datosCliente = response.data

      localStorage.setItem("pasarelaActual", datosCliente.providersPriority.find((x) => x.priority == 1).provider);
      localStorage.setItem("niubizChannel", datosCliente.niubizChannel);

      if (datosCliente.formPremium) {
        const datosProcesados = await procesarDatosCliente(datosCliente)
        if (!datosProcesados.name) {
          alertaMensaje.value = "No se encuentra cliente asociado al documento ingresado"
          mostrarAlerta.value = true
          return
        }
        localStorage.setItem("cliente", JSON.stringify(datosProcesados))
        cliente.value = datosProcesados

        const hasTransactions = datosProcesados.transactions && datosProcesados.transactions.length > 0
        const hasPaymentAction = datosProcesados.transactions && datosProcesados.transactions.some(x => x.action === "PAGAR")
        const canAffiliate = datosProcesados.afiliate && !datosProcesados.esRecargo

        let soloCvc = false
        if (hasTransactions && hasPaymentAction && canAffiliate) {
          soloCvc = true
        }
        localStorage.setItem("tipoPago", "1")
        await actualizarDatosPago()
        router.push({ name: soloCvc ? "Afiliacion" : "Pago" })
      } else {
        const datosProcesados = await procesarDatosClienteCuotas(datosCliente)
        if (!datosProcesados.name) {
          alertaMensaje.value = "No se encuentra cliente asociado al documento ingresado"
          mostrarAlerta.value = true
          return
        }
        if (!datosProcesados.dues) {
          alertaMensaje.value = "El token no es válido, por favor solicite uno nuevo"
          mostrarAlerta.value = true
          return
        }
        localStorage.setItem("cliente", JSON.stringify(datosProcesados))
        localStorage.setItem("tipoPago", "2")
        router.push({ name: "Cuotas" })
      }
    } else if (response.status === 204) {
      loaderStore.ocultarLoader()
      alertaMensaje.value = "Cliente no encontrado. Por favor, verifica los datos ingresados e intenta nuevamente."
      mostrarAlerta.value = true
      return
    } else {
      loaderStore.ocultarLoader()
      alertaMensaje.value = "Ocurrió un error al buscar el cliente. Por favor, contacte a Interseguro."
      mostrarAlerta.value = true
      return
    }
  } catch (error) {
    console.error("Error al buscar cliente:", error)
    loaderStore.ocultarLoader()
    alertaMensaje.value = "Ocurrió un error al buscar el cliente. Por favor, contacte a Interseguro."
    mostrarAlerta.value = true
  }
}

async function procesarDatosCliente(data) {
  const afiliacion = await validarAfiliacionAplicacion(data.affiliateAnother, data.data)
  localStorage.setItem("checkAfiliacion", String(afiliacion))
  localStorage.setItem("errores", JSON.stringify(data.errors || {}))
  proveedorPrincipal.value = 'NIUBIZ'
  return {
    ...extraerDatosComunes(data),
    transactions: data.data.transactions || [],
    afiliate: afiliacion,
    firstPremium: data.formPremium,
    estadoPropuesta: data.data.estadoPropuesta,
    esRecargo: data.data.esRecargo,
  }
}

async function procesarDatosClienteCuotas(data) {
  const dues = data.data.dues
    ? data.data.dues.map(model => ({
      order: model.order,
      openItem: model.openItem,
      period: model.period,
      state: model.type,
      amount: model.amount,
      flag: model.flag,
      collectionsProcess: model.collectionsProcess,
    }))
    : []

  localStorage.setItem("errors", JSON.stringify(data.errors || {}))
  proveedorPrincipal.value = 'NIUBIZ'
  return {
    ...extraerDatosComunes(data),
    dues: dues,
    trace: data.data ? data.data.trace : undefined,
    debtCode: data.data ? data.data.debtCode : undefined,
    pagoEfectivoOn: data.pagoEfectivoOn || false,
  }
}

function extraerDatosComunes(data) {
  const clienteData = data.data.customer || {}
  const coin = data.data.coin || {}
  return {
    docType: clienteData.documentType || "",
    docNumber: clienteData.documentNumber || "",
    name: clienteData.firstname || "",
    lastName1: clienteData.lastname1 || "",
    lastName2: clienteData.lastname2 || "",
    telephone: clienteData.phone || "",
    email: clienteData.email || "",
    department: clienteData.departament || "",
    province: clienteData.province || "",
    district: clienteData.district || "",
    policy: data.data ? data.data.policy : "",
    quotation: data.data ? data.data.quotation : "",
    product: data.data ? data.data.product : "",
    productAcsele: data.data ? data.data.productAcsele : "",
    frequency: data.data ? data.data.frequency : "",
    coinSymbol: coin.symbol || "",
    coin: coin.id || (coin.symbol && coin.symbol.includes("S/") ? "PEN" : "USD"),
    amount: data.data ? data.data.amount : 0,
    aplicacion: data.data ? data.data.application : "",
  }
}

async function validarAfiliacionAplicacion(afiliarOtro, data) {
  if (data.application === "Grecia" || data.esRecargo) {
    return false
  }
  return afiliarOtro
}

async function actualizarDatosPago() {
  const crearSesionRequest = {
    amount: "",
    currency: cliente.value.coin,
    email: cliente.value.email,
    identityNumber: cliente.value.docNumber,
    saleNumber: cliente.value.policy,
    recurrenceMaxAmount: 0,
    product: cliente.value.productAcsele,
    provider: proveedorPrincipal.value,
    clientIP: await ipNiubiz(),
    application: cliente.value.aplicacion,
    transactionId: "",
    orderNumber: "",
    requestSource: "ECOMMERCE"
  }
  localStorage.setItem("crearSesionRequest", JSON.stringify(crearSesionRequest))
}
</script>


<style scoped>
.buscar-cliente-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: calc(100vh - 120px);
  gap: 50px;
  overflow: hidden;
}

.info-container {
  text-align: left;
  max-width: 260px;
  color: #285ae2;
}

.info-container h2 {
  font-size: 30px;
  line-height: 1.4;
  margin: 0;
}

.form-container {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0px 5px 15px #00000026;
  padding: 35px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  color: #285ae2;
  transition: all 0.3s ease-in-out;
}

.form-container h2 {
  font-size: 20px;
  margin-bottom: 20px;
  font-weight: 600;
}

.highlight {
  font-weight: 700;
}

.normal {
  font-weight: 400;
}

.continue-button {
  background-color: #ff4081 !important;
  color: #fff;
  font-weight: normal;
  margin-top: 10px;
  width: 100%;
  color: #fff;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 600;
}

.continue-button:hover {
  box-shadow: 0px 4px 10px #00000026;
  transform: translateY(-2px);
}

.continue-button:disabled {
  background-color: #bbb !important;
  color: white !important;
  cursor: not-allowed !important;
  opacity: 1;
}

.custom-alert {
  max-width: 100%;
  width: 100%;
  padding: 10px 15px;
  color: #f44336 !important;
  font-size: 15px;
  position: relative;
  font-weight: 420;
  margin-top: 15px;
}

.custom-input {
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
}

.custom-input:focus-within {
  border-color: #235cf9 !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .buscar-cliente-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .info-container {
    max-width: 100%;
    text-align: center;
    margin-bottom: 20px;
  }

  .info-container h2 {
    font-size: 24px;
  }

  .form-container {
    width: 100%;
    max-width: 320px;
  }
}

@media (max-width: 480px) {
  .info-container h2 {
    font-size: 20px;
  }

  .form-container {
    padding: 25px;
    max-width: 100%;
  }
}
</style>
