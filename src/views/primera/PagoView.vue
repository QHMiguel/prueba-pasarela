<script>
import { EnumProduct } from "@/utils/enums";
import TerminosCondiciones from "@/components/TerminosCondiciones.vue";
import gatewayService from "@/services/pasarelaGatewayService";
import { stringToBool, getBrand, getBrandText, generarMerchantBuyerId } from "@/utils/helpers";
import { useLoaderStore } from '@/stores/loaderStore'
import { useSessionTimerStore } from "@/stores/sessionTimerStore";
import { useUiStore } from "@/stores/useUiStore";
import niubizLogo from "@/assets/niubiz_logo.png";
import culqiLogo from "@/assets/culqi_logo.png";
import izipayLogo from "@/assets/izipay_logo.png";

export default {
  name: "PagoView",
  components: {
    TerminosCondiciones,
  },
  data() {
    return {
      // variables pasarelas
      pasarela: "NIUBIZ",
      configNiubiz: {
        sessionkey: "",
        channel: "paycard",
        merchantid: "",
        purchasenumber: "",
        amount: 1,
        callbackurl: "",
        language: "es",
        font: "https://fonts.googleapis.com/css?family=Montserrat:400&display=swap",
        recurrentmaxamount: 1000.0,
        buttonColor: '#ff4081'
      },
      configCulqi: {
        publicKey: "",
        buttonColor: '#ff4081'
      },
      configIzipay: {
        tokenSesion: "",
        transaccionId: "",
        codigoComercio: "",
        nroOrden: "",
        delay: 3,
        merchantBuyerId: "",
        buttonColor: '#ff4081'
      },
      pagador: {},
      verCheckAfiliacion: true,
      textoBoton: "PAGAR Y AFILIAR",
      montoBoton: '0',
      logoPasarela: null,
      //variables de pago
      ipNiubiz: "",
      contractor: {},
      session: "",
      transactionToken: "",
      tokenStorage: "",
      propuestaStorage: "",
      purchaseNumberStorage: "",
      pagoSesionStorage: {},
      bin: "",
      channel: "",
      cuentaTarjeta: "",
      proveedores: [],
      idTransaccion: "",
      numeroOrden: "",
      //variables errores
      errores: [],
      //variables de control
      selectCheckAfiliacion: true,
      showModalTyC: false,
      tyc: "",
    };
  },
  setup() {
    const sessionTimerStore = useSessionTimerStore();
    const loaderStore = useLoaderStore();
    const uiStore = useUiStore();
    return { sessionTimerStore, loaderStore, uiStore };
  },
  computed: {
    erroresPasarela() {
      const providerData = this.errores.find((item) => item.provider === this.pasarela);
      return providerData ? providerData.errors : [];
    }
  },
  async created() {
    this.loaderStore.mostrarLoader("Estamos verificando sus datos, esto solo tomará un momento.")
    this.uiStore.setRender(false);
    this.uiStore.setAnimaciones(false);
    this.uiStore.setSwitch(false);
    this.uiStore.resetError();
    localStorage.removeItem("errorNoSwitch");

    this.pasarela = localStorage.getItem("pasarelaActual");
    this.tokenStorage = localStorage.getItem("token");
    this.contractor = JSON.parse(localStorage.getItem("cliente"));
    this.propuestaStorage = localStorage.getItem("propuesta");

    await this.cargarEventos();

    const linkValido = await this.validarCliente(this.contractor.docNumber, this.propuestaStorage);
    if (linkValido) {
      await this.actualizarDatosSession();
    }
  },
  methods: {
    goBack() {
      this.$router.push({ name: "BuscarCliente", query: { propuesta: this.propuestaStorage, token: this.tokenStorage } });
    },
    openModal() { this.showModalTyC = true; },
    closeModal() { this.showModalTyC = false; },
    cargarEventos() {
      this.$emitter.on("mostrar-loader", () => {
        this.loaderStore.mostrarLoader("Estamos procesando su pago, esto solo tomará un momento.")
      });
      this.$emitter.on("ocultar-loader", () => {
        this.loaderStore.ocultarLoader()
        this.sessionTimerStore.startTimer();
      });
      this.$emitter.on("ckeck-afiliar", (a) => {
        this.selectCheckAfiliacion = a.checked;
        this.textoBoton = a.checked ? "PAGAR Y AFILIAR" : "PAGAR";
      });
      this.$emitter.on("abrir-tyc", () => {
        this.openModal();
      });
      this.$emitter.on("error-libreria", (err) => {
        console.log("Ocurrió un error en libreria: " + err);
        this.mensajeError = 'Ocurrio un error al implementar el formulario de pago.';
        setTimeout(() => { this.mostrarMsjError = true; }, 1000);
      });
      this.$emitter.on("error-formulario", (err) => {
        console.log("Ocurrió un error: " + err);
        let error = "";
        try {
          error = JSON.parse(err).errorMessage;
        } catch (e) {
          error = err;
        }
        console.log("Ocurrió un error: " + error);
        this.mensajeError = error;
        setTimeout(() => { this.mostrarMsjError = true; }, 1000);
      });
      this.$emitter.on("pago-exitoso", async (a) => {
        console.log("pago-exitoso", a);
        this.uiStore.resetError();
        if (this.pasarela == "NIUBIZ") {
          this.transactionToken = a.transactionToken;
          this.bin = a.bin;
        } else if (this.pasarela == "CULQI") {
          this.transactionToken = a.id;
          this.bin = a.iin.bin;
          this.cuentaTarjeta = a.card_number;
          this.contractor.email = a.email;
        } else if (this.pasarela == "IZIPAY") {
          if (a.code != "00") {
            await this.procesarErrorBackend(a.code, a.message);
            return;
          }
          this.transactionToken = a.response.token.cardToken;
          this.bin = a.response.card.pan.split("*")[0];
          this.cuentaTarjeta = a.response.card.pan;
          this.configIzipay.transaccionId = a.transactionId
          this.configIzipay.nroOrden = a.response.order[0].orderNumber;
        }
        this.sessionTimerStore.stopTimer();
        this.procesarDatosPago();
      });
      this.$emitter.on("error-pago", (err) => {
        this.sessionTimerStore.stopTimer();
        console.log("Ocurrió un error: " + err);
        let error = "";
        try {
          error = JSON.parse(err).errorMessage;
        } catch (e) {
          error = err;
        }
        console.log("Ocurrió un error: " + error);
        this.mensajeError = error;
        this.uiStore.setError("", error);
      });
    },
    validaProductAplicacionWeb(product, application) {
      const isValidProduct = Object.values(EnumProduct).includes(product);
      const isValidApplication = application === "Grecia";
      return isValidProduct && isValidApplication;
    },
    async validarCliente(docNumber, policy) {
      try {
        const response = await gatewayService.buscarClienteV2(this.tokenStorage, docNumber, policy);
        if (response.status == 200) {
          if (response.data.codigoRespuesta == '99') {
            const mensajesError = {
              PAGADO: {
                titulo: "Este pago ya ha sido realizado",
                mensaje: "Si no has realizado este pago o tienes dudas al respecto, por favor contacta a Interseguro para más información.",
              },
              CADUCADO: {
                titulo: "Link de pago caducado",
                mensaje: "El link de pago ha caducado, por favor contacta a Interseguro para más información.",
              },
              ELIMINADO: {
                titulo: "Link de pago eliminado",
                mensaje: "El link de pago ha sido eliminado, por favor contacta a Interseguro para más información.",
              }
            };
            const mensajeUpper = response.data.mensajeRespuesta.toUpperCase();
            const errorEncontrado = Object.keys(mensajesError).find(key => mensajeUpper.includes(key));
            if (errorEncontrado) {
              const { titulo, mensaje } = mensajesError[errorEncontrado];
              this.uiStore.setError(titulo, mensaje);
            } else {
              this.uiStore.setError("Error", response.data.mensajeRespuesta);
            }
            this.loaderStore.ocultarLoader()
            this.uiStore.setAnimaciones(true);
            return false;
          }
          if (response.data.data?.transactions?.some((x) => x.action == "PAGAR")) {
            this.$router.push({ name: "Afiliacion" });
            return false;
          }
          const savedPasarela = localStorage.getItem("pasarelaActual") || "";
          if (savedPasarela) {
            this.pasarela = savedPasarela;
          } else {
            this.pasarela = response.data.providersPriority.find((x) => x.priority == 1).provider;
          }
          localStorage.setItem("pasarelaActual", this.pasarela);
          this.proveedores = response.data.providersPriority;
          this.tyc = response.data.tycPrimeraPrima;
          this.errores = response.data.errors;
          return true;
        } else if (response.status == 204) {
          this.$router.push({ name: "BuscarCliente" });
          return false;
        } else {
          this.uiStore.setError("Error", "Error al validar datos de la persona, contacte al administrador.");
          this.loaderStore.ocultarLoader()
          this.uiStore.setAnimaciones(true);
          return false;
        }
      } catch (error) {
        console.log(error);
        this.uiStore.setError("Error", "Error al validar datos de la persona, contacte al administrador.");
        this.loaderStore.ocultarLoader();
        this.uiStore.setAnimaciones(true);
        return false
      }
    },
    async actualizarDatosSession() {
      try {
        let crearSesionRequest = JSON.parse(localStorage.getItem("crearSesionRequest"));
        crearSesionRequest.amount = this.contractor.amount;
        crearSesionRequest.provider = this.pasarela;
        const timestamp = Date.now();
        this.idTransaccion = timestamp.toString().slice(0, 14);
        this.numeroOrden = timestamp.toString().slice(0, 10);
        crearSesionRequest.transactionId = this.idTransaccion;
        crearSesionRequest.orderNumber = this.numeroOrden;

        const response = await gatewayService.crearSesionPasarela(crearSesionRequest);
        if (response.status == 200) {
          if (response.data.code == "01") {
            this.purchaseNumberStorage = `${Math.floor(Math.random() * 8999 + 1000)}${this.contractor.docNumber}`.substring(0, 11);
            this.pagoSesionStorage = response.data.data;
            this.montoBoton = this.contractor.amount;
            this.ipNiubiz = localStorage.getItem("ip");
            this.pagador = {
              nombre: this.contractor.name,
              apellido: this.contractor.lastName1,
              correo: this.contractor.email,
              alias: this.contractor.name,
              documento: this.contractor.docNumber,
              telefono: this.contractor.telephone,
              direccion: 'Av. Javier Prado Este 492',
              ciudad: 'Lima',
              departamento: 'Lima',
              pais: 'PE',
              codigoPostal: '15073',
              tipoDocumento: this.contractor.docType,
            };
            this.verCheckAfiliacion = JSON.parse(localStorage.getItem("checkAfiliacion")) || false;
            if (!this.verCheckAfiliacion && this.validaProductAplicacionWeb(this.contractor.productAcsele, this.contractor.aplicacion)) {
              this.textoBoton = "PAGAR";
            }
            if (this.contractor.esRecargo) this.textoBoton = "PAGAR";

            if (this.pasarela == "NIUBIZ") {
              this.configNiubiz.merchantid = this.pagoSesionStorage.merchant;
              this.configNiubiz.sessionkey = this.pagoSesionStorage.sesionKey;
              this.configNiubiz.purchasenumber = this.purchaseNumberStorage;
              this.configNiubiz.amount = this.montoBoton;
              this.logoPasarela = niubizLogo;
              this.configNiubiz.channel = localStorage.getItem("niubizChannel");
            } else if (this.pasarela == "CULQI") {
              this.configCulqi.publicKey = this.pagoSesionStorage.publicKey;
              this.logoPasarela = culqiLogo;
              this.selectCheckAfiliacion = false;
              this.textoBoton = "PAGAR";
            } else if (this.pasarela == "IZIPAY") {
              this.configIzipay.tokenSesion = this.pagoSesionStorage.sesionKey;
              this.configIzipay.transaccionId = this.idTransaccion;
              this.configIzipay.codigoComercio = this.pagoSesionStorage.merchant;
              this.configIzipay.nroOrden = this.numeroOrden;
              this.configIzipay.merchantBuyerId = generarMerchantBuyerId();
              this.logoPasarela = izipayLogo;
            }

            this.sessionTimerStore.resetTimer();
            this.uiStore.setRender(true);
            this.uiStore.setSwitch(false);
            localStorage.getItem("errorNoSwitch") ? this.uiStore.setError("", localStorage.getItem("errorNoSwitch")) : this.uiStore.resetError();
            this.uiStore.setAnimaciones(true);
          } else {
            this.uiStore.setError("Error al cargar pasarela de pago", "Por favor intente más tarde.");
            this.loaderStore.ocultarLoader();
            this.uiStore.setAnimaciones(true);
          }
        } else {
          this.uiStore.setError("Error al cargar pasarela de pago", "Por favor intente más tarde.");
          this.loaderStore.ocultarLoader();
          this.uiStore.setAnimaciones(true);
        }
      } catch (error) {
        console.log(error);
        this.uiStore.setError("Error", "Problemas de red. Por favor intente más tarde.");
        this.loaderStore.ocultarLoader()
        this.uiStore.setAnimaciones(true);
      }
    },
    async procesarDatosPago() {
      this.loaderStore.mostrarLoader("Estamos procesando su pago, esto solo tomará un momento.")
      this.uiStore.setRender(false);
      this.uiStore.setAnimaciones(false);
      let transaction = {};
      let operationId = this.contractor.trace ? this.contractor.trace : "";
      transaction.transactionToken = this.transactionToken;
      transaction.tokenId = this.tokenStorage;
      transaction.operationId = operationId;
      transaction.amount = this.montoBoton;
      transaction.date = new Date().toLocaleString("es-ES");
      transaction.providerId = this.pasarela;

      switch (this.pasarela) {
        case "CULQI":
          transaction.cuentaTarjeta = this.cuentaTarjeta;
          break;
        case "NIUBIZ": break;
        case "IZIPAY":
          transaction.cuentaTarjeta = this.cuentaTarjeta;
          break;
      }

      let checkAfiliacion = this.contractor.firstPremium;
      checkAfiliacion = stringToBool(localStorage.getItem("checkAfiliacion"));
      if (this.verCheckAfiliacion) { checkAfiliacion = stringToBool(localStorage.getItem("checkAfiliacion")); }

      if (this.selectCheckAfiliacion) {
        transaction.action = "PAGAR Y AFILIAR";
        transaction.operation = "CVC";
      } else {
        transaction.action = "PAGAR";
        transaction.operation = "TOKENIZE";
      }

      const response = await this.generarPago(transaction);
      if (response.status == 200) {
        if (response.data.code == "01" && response.data.data) {
          transaction.cardbrand = response.data.data.card.brand?.toUpperCase();
          transaction.paycard = response.data.data.card.number;
          if (!this.contractor.firstPremium) { checkAfiliacion = true; }
          localStorage.setItem("tipoPago", 1);
          localStorage.setItem("transaccion", JSON.stringify(transaction));
          (checkAfiliacion && this.selectCheckAfiliacion) ? this.$router.push({ name: "Confirmation" }) : this.$router.push({ name: "AfiliationInvite" });

        } else if (response.data.code == "99") {
          const errorCode = response.data.data?.error_code;
          await this.procesarErrorBackend(errorCode, response.data?.data?.message);
        } else {
          this.loaderStore.ocultarLoader();
          this.uiStore.setError("Error", response.data.data.message);
          this.setAnimaciones(true);
        }
      } else {
        this.loaderStore.ocultarLoader()
        this.uiStore.setError("Error", "Hemos encontrado un problema al procesar tu pago. No te preocupes, inténtalo más tarde o contacta con Interseguro.");
        this.setAnimaciones(true);
      }
    },
    async generarPago(transaction) {
      let purchaseNumberGenerator = `${Math.floor(Math.random() * 8999 + 1000)}${this.contractor.docNumber}`.substring(0, 11);
      const requestPago = {
        transactionToken: transaction.transactionToken,
        tokenId: transaction.tokenId,
        currency: this.contractor.coin,
        amount: Number.parseFloat(this.contractor.amount),
        email: this.contractor.email,
        documentType: this.contractor.docType,
        documentNumber: this.contractor.docNumber,
        name: this.contractor.name,
        lastName: this.contractor.lastName1,
        motherLastName: this.contractor.lastName2,
        phone: this.contractor.telephone,
        proposalNumber: this.contractor.policy,
        policy: this.contractor.aplicacion == "Whatsapp" ? this.contractor.policy : "",
        frequency: this.contractor.frequency,
        ip: this.ipNiubiz,
        provider: transaction.providerId,
        product: this.contractor.productAcsele,
        trace: this.contractor.trace,
        brand: this.bin ? getBrand(this.bin) : "0",
        brandText: this.bin ? getBrandText(this.bin) : "NN",
        operationId: transaction.operationId,
        purchaseNumber: this.purchaseNumberStorage || purchaseNumberGenerator,
        operation: transaction.operation,
        culqiToken: transaction.culqiToken,
        aplicacion: this.contractor.aplicacion,
        firstPremium: this.contractor.firstPremium,
        estadoPropuesta: this.contractor.estadoPropuesta,
        esRecargo: this.contractor.esRecargo,
        viaCobro: transaction.viaCobro,
        tipoCuenta: transaction.tipoCuenta,
        moneda: transaction.moneda,
        cuentaTarjeta: transaction.cuentaTarjeta,
        flagAfiliacion: this.selectCheckAfiliacion
      };
      if (this.pasarela == 'IZIPAY') {
        requestPago.transactionId = this.configIzipay.transaccionId;
        requestPago.orderNumber = this.configIzipay.nroOrden;
        requestPago.merchantBuyerId = this.configIzipay.merchantBuyerId
      }
      try {
        const response = await gatewayService.generarPago(requestPago);
        return response;
      } catch (error) {
        this.loaderStore.ocultarLoader()
        this.uiStore.setError("Error", "Problemas de red. Por favor intente más tarde.");
        this.setAnimaciones(true);
      }
    },
    async procesarErrorBackend(errorCode, msgTransaccion) {
      localStorage.removeItem("errorNoSwitch");
      const err = this.erroresPasarela.find(e => e.code === errorCode);
      if (!err) {
        this.uiStore.setError("", msgTransaccion || "Ha ocurrido un error inesperado. Contacte a Inserseguro o inténtelo más tarde.");
        localStorage.setItem("errorNoSwitch", this.uiStore.mensajeError);
        await this.actualizarDatosSession();
        this.uiStore.setRender(false);
        this.uiStore.setRender(true);
        this.uiStore.setAnimaciones(true);
        return;
      }
      if (err.retry) {
        const actual = this.pasarela;
        const next = this.getNextPasarela();
        if (!next) {
          this.uiStore.setError("", err.message || "Ha ocurrido un error inesperado. Contacte a Inserseguro o inténtelo más tarde.");
          this.uiStore.setSwitch(false);
          this.loaderStore.ocultarLoader()
          return;
        }
        this.uiStore.setError(`Error en la pasarela ${actual}`, `¿Deseas intentar con la pasarela ${next}?`);
        this.uiStore.setRender(false);
        this.uiStore.setSwitch(true);
        localStorage.setItem("siguientePasarela", next);
      } else {
        this.uiStore.setError("", err?.message || "Ha ocurrido un error inesperado. Contacte a Inserseguro o inténtelo más tarde.");
        localStorage.setItem("errorNoSwitch", this.uiStore.mensajeError);
        await this.actualizarDatosSession();
        this.uiStore.setRender(true);
      }
      this.loaderStore.ocultarLoader()
      this.uiStore.setAnimaciones(true);
    },
    getNextPasarela() {
      const sorted = [...this.proveedores].sort((a, b) => a.priority - b.priority);
      const currentIndex = sorted.findIndex((p) => p.provider === this.pasarela);
      const nextProvider = sorted[currentIndex + 1];
      this.pasarela = nextProvider.provider;
      localStorage.setItem("pasarelaActual", nextProvider.provider);
      return nextProvider ? nextProvider.provider : null;
    },
    cambiarPasarela() {
      const nueva = localStorage.getItem("siguientePasarela");
      this.loaderStore.mostrarLoader("Estamos verificando sus datos, esto solo tomará un momento.")
      this.pasarela = nueva;
      localStorage.setItem("pasarelaActual", nueva);
      this.uiStore.setSwitch(false);
      this.uiStore.resetError();
      this.actualizarDatosSession();
    },
  },
};
</script>

<template>

  <v-container class="pa-4">
    <div class="contenido" v-if="uiStore.render && !uiStore.mostrarSwitch">

      <div class="pasarela form-container">
        <h2 class="title-pasarela">Ingrese datos de la tarjeta</h2>

        <div class="formulario-pagos" v-if="uiStore.render">
          <is-pasarela-compoment :pasarela="pasarela" :configNiubiz="configNiubiz" :configCulqi="configCulqi"
            :configIzipay="configIzipay" :cliente="pagador" :verCheckAfiliacion="verCheckAfiliacion" :verTyC="true"
            :textoBoton="textoBoton" :monedaBoton="contractor.coinSymbol" :montoBoton="montoBoton"
            :logoPasarela="logoPasarela" />
        </div>

        <transition enter-active-class="animate__animated animate__bounceInUp"
          leave-active-class="animate__animated animate__hinge">
          <div class="alerta-afiliacion" v-if="selectCheckAfiliacion">
            <v-icon>mdi-credit-card-sync</v-icon>
            <span class="alerta-texto">
              Al continuar con el pago, se cobrará de manera automática las cuotas del seguro a la tarjeta declarada.
            </span>
          </div>
        </transition>

        <transition enter-active-class="animate__animated animate__wobble ">
          <div class="mensaje-error" v-if="uiStore.mostrarMsjError">
            <v-icon class="mr-2">mdi-alert-circle</v-icon><span>{{ uiStore.mensajeError }}</span>
          </div>
        </transition>

      </div>

      <div class="cuotas">
        <div class="summary-section">
          <h3>Monto a pagar:</h3>
          <div class="summary-item">
            <div class="summary-details">
              <strong></strong>
              <p>
                Monto: {{ contractor.coinSymbol }}
                {{ contractor.amount }}
              </p>
            </div>
            <v-icon color="success">mdi-check-circle</v-icon>
          </div>
        </div>
      </div>

    </div>

    <div class="contenido" v-else-if="!uiStore.render && !uiStore.mostrarSwitch">
      <transition enter-active-class="animate__animated animate__tada">
        <v-card class="text-center pa-6 error-card" v-if="uiStore.animaciones">
          <v-icon size="48" color="#f44336">mdi-alert-circle-outline</v-icon>
          <h2 class="text-h5 font-weight-bold mt-3">{{ uiStore.tituloError }}</h2>
          <p class="text-body-1">
            {{ uiStore.mensajeError }}
          </p>
          <v-btn class="btn-inicio mt-4" @click="goBack()">
            Regresar al inicio
          </v-btn>
        </v-card>
      </transition>
    </div>

    <div class="contenido" v-else-if="uiStore.mostrarSwitch">
      <transition enter-active-class="animate__animated animate__tada">
        <v-card class="text-center pa-6 swicth-card" v-if="uiStore.animaciones">
          <v-icon size="48" color="#f44336">mdi-alert-circle-outline</v-icon>
          <h2 class="error-title2">{{ uiStore.tituloError }}</h2>
          <p class="error-message2">{{ uiStore.mensajeError }}</p>
          <div class="error-actions">
            <v-btn class="btn-back" @click="goBack">
              Rechazar
            </v-btn>
            <v-btn class="btn-switch" @click="cambiarPasarela">
              Aceptar
            </v-btn>
          </div>
        </v-card>
      </transition>
    </div>

  </v-container>

  <v-dialog v-model="showModalTyC" max-width="800px" style="z-index: 9999999;">
    <v-card>
      <v-card-title class="title">
        Términos y condiciones
        <v-btn icon @click="closeModal" class="close-button">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div class="terms-content">
          <TerminosCondiciones :contenido="tyc" />
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.close-button {
  width: 25px !important;
  height: 25px !important;
  background-color: #285ae2;
  border-color: #285ae2;
  color: #fff;
}

.title-pasarela {
  color: #285ae2;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  padding: 10px 0 0 0;
}

.title {
  display: flex;
  justify-content: space-between;
}

.contenido {
  display: flex;
  flex-wrap: wrap;
  min-height: auto;
  max-width: 100%;
  justify-content: center;
  gap: 30px;
}

.pasarela {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
  box-shadow: 0px 5px 15px #00000026 !important;
  border-radius: 10px;
  flex-direction: column;
  padding: 7px;
  height: 540px !important;
}

.cuotas {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 355px;
  height: 450px;
}

.summary-section {
  flex: 1;
  background: #ffffff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0px 5px 15px #00000026 !important;
  color: #285ae2;
  width: 400px;
}

.summary-section h3 {
  font-family: "Omnes";
  font-style: normal;
  font-weight: 600;
  margin-bottom: 10px;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  color: #212121 !important;
  margin-top: 10px;
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.summary-details strong {
  font-size: 14px;
}

.alerta-afiliacion {
  color: #285ae2;
  font-weight: 500;
  font-size: 12px;
  display: block;
  max-width: 270px;
  white-space: normal;
  text-align: center;
  margin-bottom: 10px;
}

.mensaje-error {
  color: #f44336;
  margin-bottom: 10px;
  border: 1px solid #f44336;
  padding: 5px;
  border-radius: 5px;
  text-align: center;
  font-size: 13px;
  display: block;
  width: 270px;
  white-space: normal;
  font-weight: 500;
}

.error-card {
  border-radius: 12px;
  box-shadow: 0px 5px 15px #00000026;
  transition: all 0.3s ease-in-out;
  max-width: 420px;
  padding: 35px !important;
}

.btn-inicio {
  background-color: #ff4081;
  color: #ffffff;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 600;
}

.btn-inicio:hover {
  box-shadow: 0px 4px 10px #00000026;
  transform: translateY(-2px);
}

.swicth-card {
  max-width: 400px;
  margin: 0 auto;
  border-radius: 14px;
  box-shadow: 0px 5px 15px #00000026;
  transition: all 0.3s ease-in-out;
  background-color: #fff;
  padding: 35px !important;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  color: #f44336;
  margin-bottom: 10px;
}

.error-title2 {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin-bottom: 10px;
}

.error-message2 {
  font-size: 16px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 20px;
}

.error-actions {
  display: flex;
  flex-direction: row;
  gap: 10px;
  margin-top: 10px;
  justify-content: center;
}

.btn-back {
  background-color: #285ae2 !important;
  color: #fff !important;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.btn-switch {
  background-color: #ff4081 !important;
  color: #fff !important;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.btn-back:hover,
.btn-switch:hover {
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .contenido {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .cuotas {
    width: 100%;
    max-width: 355px;
    height: auto;
  }
}
</style>
