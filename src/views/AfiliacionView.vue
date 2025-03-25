<script>
import { EnumProduct } from "@/utils/enums";
import moment from "moment";
import TerminosCondiciones from "@/components/TerminosCondiciones.vue";
import gatewayService from "@/services/pasarelaGatewayService";
import { getBrandText, getBrand, describeTipoCuenta, generarMerchantBuyerId } from "@/utils/helpers";
import { useLoaderStore } from '@/stores/loaderStore'
import { useSessionTimerStore } from "@/stores/sessionTimerStore";
import { useUiStore } from "@/stores/useUiStore";
import niubizLogo from "@/assets/niubiz_logo.png";
import culqiLogo from "@/assets/culqi_logo.png";
import izipayLogo from "@/assets/izipay_logo.png";

export default {
  name: "AfiliacionView",
  components: {
    TerminosCondiciones,
  },
  data: () => ({
    // variables pasarelas
    pasarela: 'NIUBIZ',
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
    botonTexto: "Afiliar medio de pago",
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
    numeroOrden: "",
    cuentaTarjeta: "",
    proveedores: [],
    idTransaccion: "",
    //variables de control
    tab: "tarjeta",
    formatoCuenta: "9999-9999-9999-9999",
    showModalTyC: false,
    tyc: "",
    tipoPago: "1",      // 1: Primera prima, 2: Cuotas
    //datos para bancos
    viacobro: {},
    cmbBanco: null,
    cmbTipoCuenta: null,
    cmbMoneda: null,
    bancos: [],
    inputTarjeta: "",
    tipoCuentas: [],
    monedas: [
      { text: "SOLES", value: "2163" },
      { text: "DOLARES", value: "2123" },
    ],
    infoCobro: [],
    //variables errores
    errores: [],
  }),
  setup() {
    const sessionTimerStore = useSessionTimerStore();
    const loaderStore = useLoaderStore();
    const uiStore = useUiStore();
    return { sessionTimerStore, loaderStore, uiStore };
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
    this.tipoPago = localStorage.getItem("tipoPago");
    this.contractor = JSON.parse(localStorage.getItem("cliente"));
    this.propuestaStorage = localStorage.getItem("propuesta");

    await this.cargarEventos();

    const linkValido = await this.validarCliente(this.contractor.docNumber, this.propuestaStorage);
    if (linkValido) {
      await this.actualizarDatosSession();
    }

    this.obtenerViaCobro();

    setTimeout(() => {
      this.loaderStore.ocultarLoader()
      this.animaciones = true;
    }, 1000);
  },
  computed: {
    erroresPasarela() {
      const providerData = this.errores.find((item) => item.provider === this.pasarela);
      return providerData ? providerData.errors : [];
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
        this.loaderStore.mostrarLoader("Estamos procesando su afiliación, esto solo tomará un momento.")
      });
      this.$emitter.on("ocultar-loader", () => {
        this.loaderStore.ocultarLoader()
        this.sessionTimerStore.startTimer();
      });
      this.$emitter.on("abrir-tyc", () => {
        this.openModal();
      });
      this.$emitter.on("error-libreria", (err) => {
        console.log("Ocurrió un error en libreria: " + err);
        this.mensajeError = 'Ocurrio un error al implementar el formulario de pago.';
        setTimeout(() => { this.mostrarMsjError = true; }, 3000);
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
        crearSesionRequest.amount = 1;
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

            if (this.pasarela == "NIUBIZ") {
              this.configNiubiz.merchantid = this.pagoSesionStorage.merchant;
              this.configNiubiz.sessionkey = this.pagoSesionStorage.sesionKey;
              this.configNiubiz.purchasenumber = this.purchaseNumberStorage;
              this.configNiubiz.amount = 1;
              this.logoPasarela = niubizLogo;
              this.configNiubiz.channel = localStorage.getItem("niubizChannel");
            } else if (this.pasarela == "CULQI") {
              this.configCulqi.publicKey = this.pagoSesionStorage.publicKey;
              this.logoPasarela = culqiLogo;
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
      this.loaderStore.mostrarLoader("Estamos procesando su afiliación, esto solo tomará un momento.")
      this.uiStore.resetError();
      this.uiStore.setRender(false);
      this.uiStore.setAnimaciones(false);
      let transaction = {};
      this.tokenStorage = localStorage.getItem("token");
      this.policyStorage = localStorage.getItem("propuesta");
      transaction.transactionToken = this.transactionToken;
      transaction.operation = "ONLYCVC";
      transaction.tokenId = this.tokenStorage;
      transaction.action = "AFILIAR";
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

      const response = await this.generarPago(transaction);
      if (response.status == 200) {
        if (response.data.code == "01" && response.data.data) {
          transaction.cardbrand = response.data.data.card.brand?.toUpperCase();
          transaction.paycard = response.data.data.card.number;
          localStorage.setItem("transaccion", JSON.stringify(transaction));
          this.$router.push({ name: "AfiliacionConfirmacion" });
        } else if (response.data.code == "99") {
          const errorCode = response.data.data?.error_code;
          await this.procesarErrorBackend(errorCode, response.data?.data?.message);
          return;
        } else {
          this.loaderStore.ocultarLoader();
          this.uiStore.setError("Error", response.data.data.message);
          this.setAnimaciones(true);
        }
      } else {
        this.loaderStore.ocultarLoader()
        this.uiStore.setError("Error", "Hemos encontrado un problema al procesar tu afiliación. No te preocupes, inténtalo más tarde o contacta con Interseguro.");
        this.setAnimaciones(true);
      }
    },
    async generarPago(transaction) {
      let purchaseNumberGenerator = `${Math.floor(Math.random() * 8999 + 1000)}${this.contractor.docNumber}`.substring(0, 11);
      let montoTotal = 1;
      const requestPago = {
        transactionToken: transaction.transactionToken,
        tokenId: transaction.tokenId,
        currency: this.contractor.coin,
        amount: Number.parseFloat(montoTotal),
        email: this.contractor.email,
        documentType: this.contractor.docType,
        documentNumber: this.contractor.docNumber,
        name: this.contractor.name,
        lastName: this.contractor.lastName1,
        motherLastName: this.contractor.lastName2,
        phone: this.contractor.telephone,
        proposalNumber: this.contractor.policy,
        policy: this.tipoPago == 1 ? this.contractor.aplicacion == "Whatsapp" ? this.contractor.policy : "" : this.contractor.policy,
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
        this.uiStore.setError("Error", "Problemas al registrar tu afiliación. Por favor intente más tarde.");
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
    async obtenerViaCobro() {
      let response = await gatewayService.obtenerViaCobro();
      if (response.status == 200) {
        this.infoCobro = response.data;
        if (this.infoCobro.code != '01') {
          this.loaderStore.ocultarLoader()
          this.uiStore.setError("", "Error al cargar parametrós bancarios, no se podrá afiliar con cuenta bancaria");
          this.setAnimaciones(true);
          return;
        }
        const viaCuentas = this.infoCobro.data.filter((v) => v.tipoViaCobro == 2 && v.tipoCuenta == 2);
        this.bancos = viaCuentas.map((viaCuenta) => ({
          text: viaCuenta.nombreViaCobro,
          value: viaCuenta.codigoViaCobro,
        }));
        this.bancos = Array.from(new Map(this.bancos.map((item) => [item.value, item])).values());
      } else {
        this.loaderStore.ocultarLoader()
        this.uiStore.setError("", "Error al cargar parametrós bancarios, no se podrá afiliar con cuenta bancaria");
        this.setAnimaciones(true);
      }
    },
    changeBank(val) {
      this.cmbTipoCuenta = null;
      this.cmbMoneda = null;
      this.txtTarget3 = "";
      this.tipoCuentas = [];
      const bancoSeleccionado = this.bancos.find((b) => b.text == val);
      const temp = this.infoCobro.data.filter((v) => v.tipoViaCobro == 2 && v.codigoViaCobro == bancoSeleccionado.value);
      for (let i = 0; i < temp.length; i++) {
        this.tipoCuentas.push({
          value: temp[i].tipoCuenta,
          text: describeTipoCuenta(temp[i].tipoCuenta),
        });
      }
      this.tipoCuentas = [...new Set(this.tipoCuentas)];
    },
    updateFormatoCuenta() {
      const banco = this.cmbBanco;
      const tipoCuenta = this.cmbTipoCuenta;
      if (!banco || !tipoCuenta) {
        this.formatoCuenta = "";
        return;
      }
      const formatos = {
        SCOTIABANK: {
          default: "999-9999999",
        },
        BCP: {
          CORRIENTE: "999-9999999-9-99",
          AHORRO: "999-99999999-9-99",
        },
        BBVA: {
          default: "9999-9999-9999999999",
        },
        INTERBANK: {
          default: "999-9999999999",
        },
      };
      this.formatoCuenta = formatos[banco][tipoCuenta] || formatos[banco].default || "";
    },
    formatearCuenta() {
      if (!this.formatoCuenta) return;
      let soloNumeros = this.inputTarjeta.replace(/\D/g, "");
      let resultado = "";
      let index = 0;
      for (let char of this.formatoCuenta) {
        if (char === "9" && soloNumeros[index]) {
          resultado += soloNumeros[index];
          index++;
        } else if (char === "-" && index < soloNumeros.length) {
          resultado += "-";
        }
      }
      this.inputTarjeta = resultado;
    },
    async afiliarCuenta() {
      this.loaderStore.mostrarLoader("Estamos procesando su afiliación, esto solo tomará un momento.")
      this.uiStore.resetError();
      if (!this.cmbBanco || !this.cmbTipoCuenta || !this.cmbMoneda || !this.inputTarjeta) {
        this.uiStore.setError("Error", "Debe completar todos los campos");
        return;
      }
      const bancoSeleccionado = this.bancos.find((b) => b.text == this.cmbBanco);
      const tipoCuentaSeleccionado = this.tipoCuentas.find((t) => t.text == this.cmbTipoCuenta);
      const monedaSeleccionada = this.monedas.find((m) => m.text == this.cmbMoneda);

      let transaction = {};
      let transactionStorage = JSON.parse(localStorage.getItem("transaccion"));
      this.transactionToken = transactionStorage.transactionToken;
      transaction.viaCobro = bancoSeleccionado.value;
      transaction.tipoCuenta = tipoCuentaSeleccionado.value;
      transaction.moneda = monedaSeleccionada.value;
      transaction.cuentaTarjeta = this.inputTarjeta;
      transaction.providerId = "CUENTA";
      transaction.transactionToken = this.transactionToken;
      transaction.operation = "ONLYCVC";
      transaction.tokenId = this.tokenStorage;
      transaction.action = "AFILIAR";
      const response = await this.generarPago(transaction);

      if (response.status == 200) {
        if (response.data.code == "01" && response.data.data) {
          transaction.cardbrand = !!bancoSeleccionado ? "CUENTA" + " " + this.cmbBanco + " " + this.cmbTipoCuenta + " " + this.cmbMoneda : "";
          transaction.paycard = this.inputTarjeta;
          transaction.status = "ACEPTADO";
          transaction.date = moment(String(new Date())).format("DD/MM/YYYY hh:mm:ss");
          localStorage.setItem("transaccion", JSON.stringify(transaction));
          this.$router.push({ name: "AfiliacionConfirmacion", });
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
        this.uiStore.setError("", "Hemos encontrado un problema al procesar tu afiliación. No te preocupes, inténtalo más tarde o contacta con Interseguro.");
        this.setAnimaciones(true);
      }
    },
  },
};
</script>

<template>

  <transition enter-active-class="animate__animated animate__zoomIn animate__fast "
    v-if="uiStore.render && !uiStore.mostrarSwitch">
    <v-container class="d-flex align-center justify-center fill-height form-afilia" v-if="uiStore.animaciones">
      <h2 class="title-afiliacion">Datos del nuevo medio de pago</h2>

      <v-card class="elevation-3 pa-5 main-form" max-width="400">
        <!-- Tabs -->
        <v-tabs v-model="tab" grow color="#285ae2">
          <v-tab value="tarjeta" class="header">Tarjeta Débito/Crédito</v-tab>
          <v-tab value="cuenta" class="header" v-if="tipoPago == '1'">Cuenta Bancaria</v-tab>
        </v-tabs>

        <v-window v-model="tab" style="max-height: 370px;">
          <!-- tarjeta Form -->
          <v-window-item value="tarjeta">
            <v-card-text>
              <v-form ref="loginForm" v-if="uiStore.render">
                <is-pasarela-compoment :pasarela="pasarela" :configNiubiz="configNiubiz" :configCulqi="configCulqi"
                  :configIzipay="configIzipay" :cliente="pagador" :verCheckAfiliacion="false" :verTyC="true"
                  :textoBoton="botonTexto" :monedaBoton="''" :montoBoton="''" :logoPasarela="logoPasarela" />
              </v-form>

            </v-card-text>

          </v-window-item>

          <!-- cuenta Form -->
          <v-window-item value="cuenta" v-if="tipoPago == '1'">
            <v-card-text>
              <v-form ref="bankForm">
                <v-row>
                  <v-col>
                    <v-select style="height: 40px !important" label="Entidad bancaria"
                      :items="bancos.map((m) => m.text)" v-model="cmbBanco" @update:model-value="changeBank"
                      variant="outlined" density="compact" color="#285ae2" base-color="#212121" />
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <v-select label="Tipo cuenta" style="height: 40px !important"
                      :items="tipoCuentas.map((m) => m.text)" v-model="cmbTipoCuenta"
                      @update:model-value="updateFormatoCuenta" variant="outlined" density="compact" color="#285ae2"
                      base-color="#212121" />
                  </v-col>
                  <v-col>
                    <v-select label="Moneda" style="height: 40px !important" :items="monedas.map((m) => m.text)"
                      v-model="cmbMoneda" variant="outlined" density="compact" color="#285ae2" base-color="#212121" />
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <v-text-field label="Número de cuenta" :placeholder="formatoCuenta" v-model="inputTarjeta"
                      @input="formatearCuenta" maxlength="19" variant="outlined" density="compact" color="#285ae2"
                      base-color="#212121" />
                  </v-col>
                </v-row>

                <p class="autorizacion">
                  Dando clic en ACEPTAR autorizo el cargo recurrente de las
                  primas.
                </p>

                <v-btn block class="mt-3 btn-afiliar" @click="afiliarCuenta">Afiliar medio de pago</v-btn>
              </v-form>
            </v-card-text>
          </v-window-item>

        </v-window>

        <div class="alerta-afiliacion">
          <v-icon>mdi-credit-card-sync</v-icon>
          <span class="alerta-texto">
            Al continuar, se cobrará de manera automática las cuotas del seguro a la tarjeta o cuenta
            declarada.
          </span>
        </div>

        <transition enter-active-class="animate__animated animate__wobble ">
          <div class="mensaje-error" v-if="mostrarMsjError">
            <v-icon class="mr-2">mdi-alert-circle</v-icon><span>{{ mensajeError }}</span>
          </div>
        </transition>

      </v-card>
    </v-container>
  </transition>

  <div class="contenido" v-else-if="!uiStore.render && !uiStore.mostrarSwitch">
    <transition enter-active-class=" animate__animated animate__tada">
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

  <v-dialog v-model="showModalTyC" max-width="800px" style="z-index: 9999999;">
    <template #default>
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
    </template>
  </v-dialog>
</template>

<style scoped>
.header {
  font-size: 0.8em !important;
}

.main-form {
  box-shadow: 0px 5px 15px #00000026 !important;
  border-radius: 12px;
  background-color: #ffffff;
}

.btn-afiliar {
  background-color: #ff4081;
  color: #ffffff;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.btn-afiliar:hover {
  box-shadow: 0px 4px 10px #00000026;
  transform: translateY(-2px);
}

.autorizacion {
  color: #285ae2;
  font-size: 0.8em;
}

.close-button {
  width: 25px !important;
  height: 25px !important;
  background-color: #285ae2;
  color: #ffffff;
}

.title {
  display: flex;
  justify-content: space-between;
}

.error-message {
  color: #f44336;
  font-size: 14px;
  text-align: center;
}

.title-afiliacion {
  color: #285ae2;
  font-weight: 600;
  margin-bottom: 20px;
}

.form-afilia {
  display: flex;
  flex-direction: column;
  align-content: center !important;
}

.alerta-afiliacion {
  color: #285ae2;
  font-weight: 500;
  font-size: 12px;
  display: block;
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
  white-space: normal;
  font-weight: 500;
}

.contenido {
  display: flex;
  flex-wrap: wrap;
  min-height: auto;
  max-width: 100%;
  justify-content: center;
  gap: 20px;
}

.btn-inicio {
  background-color: #ff4081;
  color: #ffffff;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.btn-iniciot:hover {
  box-shadow: 0px 4px 10px #00000026;
  transform: translateY(-2px);
}

.error-card {
  border-radius: 12px;
  box-shadow: 0px 5px 15px #00000026;
  transition: all 0.3s ease-in-out;
  max-width: 420px;
  padding: 35px !important;
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

:deep(.v-field input::placeholder) {
  color: #285ae2 !important;
  opacity: .5;
}
</style>
