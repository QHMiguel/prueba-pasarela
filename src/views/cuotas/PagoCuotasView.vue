<script>
import { EnumProduct } from "@/utils/enums";
import TerminosCondiciones from "@/components/TerminosCondiciones.vue";
import gatewayService from "@/services/pasarelaGatewayService";
import { stringToBool, getBrandText, getBrand, generarMerchantBuyerId } from "@/utils/helpers";
import moment from "moment";
import { useLoaderStore } from '@/stores/loaderStore'
import { useSessionTimerStore } from "@/stores/sessionTimerStore";

export default {
  name: "PagoView",
  components: {
    TerminosCondiciones,
  },
  data() {
    return {
      animaciones: false,
      mensajeLoader: "Estamos verificando sus datos, esto solo tomará un momento.",
      duesSelected: [],
      ipNiubiz: "",
      showModalTyC: false,
      tyc: "",
      render: true,
      mensajeError: "",
      mostrarMsjError: false,
      amount: 0,
      contractor: {},
      session: "",
      oi: "",
      pagador: {},
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
      checkRecurrente: true,
      botonTexto: "PAGAR Y AFILIAR",
      transactionToken: "",
      selectCheckAfiliacion: true,
      pasarela: 'NIUBIZ',
      tokenStorage: "",
      polizaStorage: "",
      pagoSesionStorage: {},
      bin: "",
      channel: "",
      proveedores: [],
      idTransaccion: "",
      numeroOrden: "",
      cuentaTarjeta: "",
    };
  },
  setup() {
    const sessionTimerStore = useSessionTimerStore();
    const loaderStore = useLoaderStore();
    return { sessionTimerStore,loaderStore };
  },
  async created() {
    this.loaderStore.mostrarLoader(this.mensajeLoader)
    this.render = false;
    this.cargarEventos();

    this.contractor = JSON.parse(localStorage.getItem("cliente"));
    this.contractor.amount = this.amount;
    this.tokenStorage = localStorage.getItem("token");
    this.polizaStorage = localStorage.getItem("propuesta");
    this.duesSelected = JSON.parse(localStorage.getItem("cuotasSeleccionadas"));
    this.calculate();

    const linkValido = await this.validarCliente(this.contractor.docNumber, this.polizaStorage);
    if (linkValido) {
      await this.actualizarDatosSession();
    }

    setTimeout(() => {
      this.loaderStore.ocultarLoader()
      this.animaciones = true;
    }, 3000);
  },
  computed: {
    erroresPasarela() {
      const providerData = this.errores.find(
        (item) => item.provider === this.pasarela
      );
      return providerData ? providerData.errors : [];
    }
  },
  methods: {
    goBack() {
      let propuesta = this.polizaStorage;
      let token = this.tokenStorage;
      this.$router.push({ name: "BuscarCliente", query: { propuesta, token } });
    },
    openModal() { this.showModalTyC = true; },
    closeModal() { this.showModalTyC = false; },
    cargarEventos() {
      this.$emitter.on("mostrar-loader", () => {
        this.mensajeLoader = "Estamos procesando su pago, esto solo tomará un momento.";
        this.loaderStore.mostrarLoader(this.mensajeLoader)
      });
      this.$emitter.on("ocultar-loader", () => {
        this.loaderStore.ocultarLoader()
        try {
          const el = this.$refs.animacionPasarela;
          el.classList.remove("animate__slideInLeft");
          void el.offsetWidth;
          el.classList.add("animate__slideInLeft");
        } catch (e) {
          console.log(e);
        }
        this.animaciones = true;
        this.sessionTimerStore.startTimer();
      });
      this.$emitter.on("ckeck-afiliar", (a) => {
        this.selectCheckAfiliacion = a.checked;
        this.botonTexto = a.checked ? "PAGAR Y AFILIAR" : "PAGAR";
      });
      this.$emitter.on("abrir-tyc", () => {
        this.openModal();
      });
      this.$emitter.on("error-libreria", (err) => {
        console.log("Ocurrió un error en libreria: " + err);
        this.mensajeError = 'Ocurrio un error al implementar el formulario de pago.';
        setTimeout(() => {
          this.mostrarMsjError = true;
        }, 1000);
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
        setTimeout(() => {
          this.mostrarMsjError = true;
        }, 1000);
      });
      this.$emitter.on("pago-exitoso", (a) => {
        console.log("pago-exitoso", a);
        this.mostrarMsjError = false;
        this.mensajeError = "";
        this.channel = "paycard";
        if (this.pasarela == "NIUBIZ") {
          this.transactionToken = a.transactionToken;
          this.bin = a.bin;
          this.channel = a.channel;
        } else if (this.pasarela == "CULQI") {
          this.transactionToken = a.id;
          this.bin = a.iin.bin;
          this.cuentaTarjeta = a.card_number;
          this.contractor.email = a.email;
        } else if (this.pasarela == "IZIPAY") {
          this.transactionToken = a.response.order[0].uniqueId;
          this.bin = a.response.card.pan.split("*")[0];
          this.cuentaTarjeta = a.response.card.pan;
          this.configIzipay.transaccionId = a.transactionId
          this.configIzipay.nroOrden = a.response.order[0].orderNumber;
        }
        this.sessionTimerStore.stopTimer();
        this.procesarDatosPago();
      });
      this.$emitter.on("error-pago", (err) => {
        console.log("Ocurrió un error: " + err);
        let error = "";
        try {
          error = JSON.parse(err).errorMessage;
        } catch (e) {
          error = err;
        }
        console.log("Ocurrió un error: " + error);
        this.mensajeError = error;
        setTimeout(() => {
          this.mostrarMsjError = true;
        }, 1000);
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
            if (response.data.mensajeRespuesta.toUpperCase().includes('PAGADO')) {
              this.tituloError = 'Este pago ya ha sido realizado';
              this.mensajeError = 'Si no has realizado este pago o tienes dudas al respecto, por favor contacta a Interseguro para más información.';
            } else if (response.data.mensajeRespuesta.toUpperCase().includes('CADUCADO')) {
              this.tituloError = 'Link de pago cuotas caducado';
              this.mensajeError = 'El link de pago cuotas ha caducado, por favor contacta a Interseguro para más información.';
            } else if (response.data.mensajeRespuesta.toUpperCase().includes('ELIMINADO')) {
              this.tituloError = 'Link de pago cuotas eliminado';
              this.mensajeError = 'El link de pago cuotas ha sido eliminado, por favor contacta a Interseguro para más información.';
            } else {
              this.tituloError = 'ERROR';
              this.mensajeError = response.data.mensajeRespuesta;
            }
            setTimeout(() => { this.mostrarMsjError = true; }, 1000);
            return false;
          }

          if (response.data.data?.transactions?.some((x) => x.action == "PAGAR")) {
            this.$router.push({ name: "Afiliacion" });
            return false;
          }

          this.pasarela = response.data.providersPriority.find((x) => x.priority == 1).provider;
          this.proveedores = response.data.providersPriority;
          this.tyc = response.data.tycPagoCuotas;
          this.errores = response.data.errors;

          return true;
        } else if (response.status == 204) {
          this.$router.push({ name: "BuscarCliente" });
          return false;
        } else {
          this.tituloError = 'Error';
          this.mensajeError = "Error al validar datos de la persona, contacte al administrador.";
          setTimeout(() => { this.mostrarMsjError = true; }, 1000);
          return false;
        }

      } catch (error) {
        console.log(error);
        this.tituloError = 'Error';
        this.mensajeError = "Error al validar datos de la persona, contacte al administrador.";
        this.loaderStore.ocultarLoader()
        setTimeout(() => { this.mostrarMsjError = true; }, 1000);
        return false
      }
    },
    async procesarDatosPago() {
      this.loaderStore.mostrarLoader(this.mensajeLoader)
      this.render = false;
      let transaction = {};

      let operationId = this.contractor.trace ? this.contractor.trace + "," + this.oi.join(",") : "";
      transaction.transactionToken = this.transactionToken;
      transaction.tokenId = this.tokenStorage;
      transaction.operationId = operationId;
      transaction.amount = this.amount;
      transaction.date = moment(String(new Date())).format("DD/MM/YYYY hh:mm:ss");
      transaction.providerId = this.pasarela;

      switch (this.pasarela) {
        case "CULQI":
          transaction.cuentaTarjeta = this.cuentaTarjeta;
          break;
        case "NIUBIZ":
        case "IZIPAY":
          break;
      }

      let checkAfiliacion = this.contractor.firstPremium;
      checkAfiliacion = stringToBool(localStorage.getItem("checkAfiliacion"));
      if (this.checkRecurrente) { checkAfiliacion = stringToBool(localStorage.getItem("checkAfiliacion")); }

      if (this.selectCheckAfiliacion) {
        transaction.action = "PAGAR Y AFILIAR";
        transaction.operation = "CVC";
      } else {
        transaction.action = "PAGAR";
        transaction.operation = "TOKENIZE";
      }

      const response = await this.generarPago(transaction);

      if (response.status == 200) {

        if (response.data.code == '01' && response.data.data) {
          transaction.cardbrand = response.data.data.card.brand?.toUpperCase();
          transaction.paycard = response.data.data.card.number;
          transaction.status = "ACEPTADO";
          transaction.openItems = this.oi;

          localStorage.setItem("tipoPago", 2);
          localStorage.setItem("transaccion", JSON.stringify(transaction));

          (checkAfiliacion && this.selectCheckAfiliacion) ? this.$router.push({ name: "Confirmation" }) : this.$router.push({ name: "AfiliationInvite" });

        } else if (response.data.code == '99') {
          transaction.status = "ERROR";
          if (response.data.message.includes("credenciales")) {
            this.mensajeError = "Ocurrió un error al procesar tu pago. Por favor, intenta nuevamente o contacta con Interseguro.";
          } else {
            this.mensajeError = response.data.message;
          }
          transaction.message = this.mensajeError;
          await this.actualizarDatosSession();
          this.loaderStore.ocultarLoader()
          this.render = true;
          setTimeout(() => { this.mostrarMsjError = true; }, 1000);
        } else {
          transaction.status = "ERROR";
          this.mensajeError = response.data.data.message
          transaction.message = this.mensajeError;
          await this.actualizarDatosSession();
          this.loaderStore.ocultarLoader()
          this.render = true;
          setTimeout(() => { this.mostrarMsjError = true; }, 1000);
        }

      } else {
        this.loaderStore.ocultarLoader()
        this.mensajeError = "Hemos encontrado un problema al procesar tu pago. No te preocupes, inténtalo más tarde o contacta con Interseguro.";
        this.render = true;
        setTimeout(() => { this.mostrarMsjError = true; }, 1000);
      }
    },
    async generarPago(transaction) {
      let purchaseNumberGenerator = `${Math.floor(Math.random() * 8999 + 1000)}${this.contractor.docNumber}`.substring(0, 12);
      const requestPago = {
        transactionToken: transaction.transactionToken,
        tokenId: transaction.tokenId,
        currency: this.contractor.coin,
        amount: Number.parseFloat(this.amount),
        email: this.contractor.email,
        documentType: this.contractor.docType,
        documentNumber: this.contractor.docNumber,
        name: this.contractor.name,
        lastName: this.contractor.lastName1,
        motherLastName: this.contractor.lastName2,
        phone: this.contractor.telephone,
        proposalNumber: this.contractor.policy,
        policy: this.contractor.policy,
        frequency: this.contractor.frequency,
        ip: this.ipNiubiz,
        provider: transaction.providerId,
        product: this.contractor.productAcsele,
        trace: this.contractor.trace,
        brand: this.bin ? getBrand(this.bin) : "0",
        brandText: this.bin ? getBrandText(this.bin) : "NN",
        operationId: transaction.operationId,
        purchaseNumber: purchaseNumberGenerator,
        operation: transaction.operation,
        aplicacion: this.contractor.aplicacion,
      };
      if (this.pasarela == 'IZIPAY') {
        requestPago.transactionId = this.configIzipay.transaccionId;
        requestPago.orderNumber = this.configIzipay.nroOrden;
        requestPago.merchantBuyerId = this.configIzipay.merchantBuyerId
      }

      try {
        console.log("Pago request:", requestPago);
        const response = await gatewayService.generarPago(requestPago);
        return response;
      } catch (error) {
        this.loaderStore.ocultarLoader()
        this.tituloError = 'Error';
        this.mensajeError = "Problemas al registrar pago. Por favor intente más tarde.";
        this.render = true;
        setTimeout(() => { this.mostrarMsjError = true; }, 1000);
      }
    },
    async actualizarDatosSession() {
      try {
        const crearSesionRequest = JSON.parse(localStorage.getItem("crearSesionRequest"));
        crearSesionRequest.provider = this.pasarela;
        this.calculate();
        crearSesionRequest.amount = this.amount;
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
            this.ipNiubiz = localStorage.getItem("ip");

            this.pagador = {
              nombre: this.contractor.name,
              apellido: this.contractor.lastName1,
              correo: this.contractor.email,
              alias: this.contractor.name,
              documento: this.contractor.docNumber,
              telefono: this.contractor.telephone,
              direccion: 'Av. Lima 123',
              ciudad: 'Lima',
              departamento: 'Lima',
              pais: 'PE',
              codigoPostal: '00001',
              tipoDocumento: this.contractor.docType,
            };

            if (this.pasarela == "NIUBIZ") {
              this.configNiubiz.merchantid = this.pagoSesionStorage.merchant;
              this.configNiubiz.sessionkey = this.pagoSesionStorage.sesionKey;
              this.configNiubiz.purchasenumber = this.purchaseNumberStorage;
              this.configNiubiz.amount = this.amount;
            } else if (this.pasarela == "CULQI") {
              this.configCulqi.publicKey = this.pagoSesionStorage.publicKey;
            } else if (this.pasarela == "IZIPAY") {
              this.configIzipay.tokenSesion = this.pagoSesionStorage.sesionKey;
              this.configIzipay.transaccionId = this.idTransaccion;
              this.configIzipay.codigoComercio = this.pagoSesionStorage.merchant;
              this.configIzipay.nroOrden = this.numeroOrden;
              this.configIzipay.merchantBuyerId = generarMerchantBuyerId();
            }

            this.checkRecurrente = JSON.parse(localStorage.getItem("checkAfiliacion")) || false;
            if (!this.checkRecurrente && this.validaProductAplicacionWeb(this.contractor.productAcsele, this.contractor.aplicacion)) {
              this.botonTexto = "PAGAR";
              this.configNiubiz.channel = "web";
            }
            if (this.contractor.esRecargo) this.botonTexto = "PAGAR";

            this.render = true;
            return true;
          } else {
            this.tituloError = 'Error al cargar pasarela de pago';
            this.mensajeError = response.data.message || "Problemas de red. Por favor intente más tarde";
            this.loaderStore.ocultarLoader()
            setTimeout(() => { this.mostrarMsjError = true; }, 1000);
          }
        } else {
          this.tituloError = 'Error al cargar pasarela de pago';
          this.mensajeError = "Por favor intente más tarde.";
          this.loaderStore.ocultarLoader()
          setTimeout(() => { this.mostrarMsjError = true; }, 1000);
        }
      } catch (error) {
        console.log(error);
        this.tituloError = 'Error';
        this.mensajeError = "Problemas de red. Por favor intente más tarde.";
        this.loaderStore.ocultarLoader()
        setTimeout(() => { this.mostrarMsjError = true; }, 1000);
        return false;
      }
    },
    calculate() {
      this.amount = 0.0;
      this.oi = [];
      if (this.duesSelected != null) {
        this.duesSelected.forEach((element) => {
          if (element.seleccionado) {
            this.amount += Number.parseFloat("" + element.amount);
            this.oi.push("" + element.openItem);
          }
        });
      }
      this.amount = Number.parseFloat(this.amount.toFixed(2));
    },
    borrarCuota(cuota) {
      const estadoCuota = cuota.state;
      const cuotasDisponibles = this.duesSelected.filter((c) => c.state?.toUpperCase() == "DISPONIBLE" && c.seleccionado);
      const cuotasVencidas = this.duesSelected.filter((c) => c.state?.toUpperCase() == "VENCIDA" && c.seleccionado);
      const existeVencida = cuotasVencidas.length > 0;
      const existeDisponible = cuotasDisponibles.length > 0;
      const primeraDisponible = existeDisponible
        ? cuotasDisponibles[cuotasDisponibles.length - 1].order
        : "0";
      const primeraVencida = existeVencida
        ? cuotasVencidas[cuotasVencidas.length - 1].order
        : "0";
      let flag = false;

      if (estadoCuota.toUpperCase() === "VENCIDA") {
        if (existeDisponible) {
          this.mensajeError =
            "No es posible pagar una cuota adelantada antes que una vencida.";
          this.mostrarMsjError = true;
        } else {
          if (cuota.order === primeraVencida) {
            flag = true;
            this.mostrarMsjError = false;
          } else {
            this.mensajeError =
              "Solo se puede eliminar cuotas desde la menos antigua.";
            this.mostrarMsjError = true;
          }
        }
      } else {
        if (cuota.order === primeraDisponible) {
          flag = true;
          this.mostrarMsjError = false;
        } else {
          this.mensajeError =
            "Solo se puede eliminar cuotas desde la menos antigua.";
          this.mostrarMsjError = true;
        }
      }

      if (flag) {
        if (this.duesSelected != null) {
          this.duesSelected.forEach((element) => {
            if (element.order == cuota.order) {
              element.seleccionado = false;
            }
          });
        }
      }

      this.calculate();
      if (this.amount == 0.0) {
        this.$router.push({ name: "Cuotas" });
      } else {
        localStorage.setItem("cuotasSeleccionadas", JSON.stringify(this.duesSelected));
      }
    },
  },
};
</script>

<template>
  <v-container class="pa-4">

    <div class="contenido" v-if="render">
      <div class="pasarela">
        <h2 class="title-pasarela">Ingrese datos de la tarjeta</h2>

        <div class="formulario-pagos" v-if="render">
          <is-pasarela-compoment v-if="render" :pasarela="pasarela" :configNiubiz="configNiubiz"
            :configCulqi="configCulqi" :configIzipay="configIzipay" :cliente="pagador"
            :verCheckAfiliacion="checkRecurrente" :verTyC="true" :textoBoton="botonTexto"
            :monedaBoton="contractor.coinSymbol" :montoBoton="amount" />
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
          <div class="mensaje-error" v-if="mostrarMsjError">
            <v-icon class="mr-2">mdi-alert-circle</v-icon><span>{{ mensajeError }}</span>
          </div>
        </transition>

      </div>

      <div class="cuotas">
        <div class="summary-section">
          <h3>Cuotas a pagar:</h3>
          <div class="summary-item" key="cuota.order" v-for="(cuota, index) in duesSelected">
            <div class="summary-details" v-if="cuota.seleccionado">
              <strong>{{ cuota.period }}</strong>
              <p>Monto: {{ contractor.coinSymbol }} {{ cuota.amount }}</p>
            </div>
            <v-icon color="error" v-if="cuota.seleccionado" class="delete-due"
              @click="borrarCuota(cuota)">mdi-delete-circle</v-icon>
          </div>
        </div>
      </div>
    </div>

    <div class="contenido" v-else>
      <transition enter-active-class="animate__animated animate__tada">
        <v-card class="text-center pa-6 error-card" v-if="animaciones">
          <v-icon size="48" color="red">mdi-alert-circle-outline</v-icon>
          <h2 class="text-h5 font-weight-bold mt-3">{{ tituloError }}</h2>
          <p class="text-body-1">
            {{ mensajeError }}
          </p>
          <v-btn style="background-color: #eb39a4; color:#ffffff" class="mt-4" @click="goBack()">
            Regresar al inicio
          </v-btn>
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
.error-cuota {
  color: #ec2b2b;
}

.operacion-segura {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #0847a5;
  padding: 10px;
  background-color: #f1f5f9;
  border-radius: 1px 1px 10px 10px;
  width: 100%;
}

.icono-seguro {
  font-size: 16px;
  margin-right: 5px;
}

.close-button {
  width: 25px !important;
  height: 25px !important;
  background-color: #0f5fcf;
  color: #ffffff;
}

.title-pasarela {
  color: #0847a5ef;
  font-size: 18px;
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
  gap: 20px;
}

.pasarela {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  flex-direction: column;
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
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  color: #0855c4;
  width: 400px;
}

.summary-section h3 {
  font-family: "Omnes";
  font-style: normal;
  font-weight: 500;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  color: #212121 !important;
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.summary-details strong {
  font-size: 14px;
}

.delete-due {
  cursor: pointer !important;
  border-radius: 50%;
}

.delete-due:hover {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.alerta-afiliacion {
  color: #0855c4;
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
