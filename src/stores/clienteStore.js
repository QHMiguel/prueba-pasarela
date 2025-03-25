import { defineStore } from "pinia";

export const useClienteStore = defineStore("clienteStore", {
  state: () => ({
    propuesta: "",
    numeroDocumento: "",
    token: "",
    dataPago: {},
    primeraPrima: true,
    afiliacion: true,
    proveedorPrimario: null,
    proveedorSecundario: null,
    errores: [],
    cliente: {},
    pago: {},
    bin: "",
    purchasenumber: "",
    checkAfiliacion: true,
    transactionToken: "",
    transaction: {},
    ipNiubiz: "",
    channel: "",
  }),

  actions: {
    setPropuesta(value) {
      this.propuesta = value;
    },
    setNumeroDocumento(value) {
      this.numeroDocumento = value;
    },
    setToken(value) {
      this.token = value;
    },
    setDataPago(value) {
      this.dataPago = value;
    },
    setAfiliacion(value) {
      this.afiliacion = value;
    },
    setProveedorPrimario(value) {
      this.proveedorPrimario = value;
    },
    setProveedorSecundario(value) {
      this.proveedorSecundario = value;
    },
    setErrores(value) {
      this.errores = value;
    },
    setCliente(value) {
      this.cliente = value;
    },
    setPago(value) {
      this.pago = value;
    },
    setBin(value) {
      this.bin = value;
    },
    setPurchaseNumber(value) {
      this.purchasenumber = value;
    },
    setCheckAfiliacion(value) {
      this.checkAfiliacion = value;
    },
    setTransactionToken(value) {
      this.transactionToken = value;
    },
    setTransaction(value) {
      this.transaction = value;
    },
    setIpNiubiz(value) {
      this.ipNiubiz = value;
    },
    setChannel(value) {
      this.channel = value;
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'cliente',
        storage: localStorage
      }
    ]
  }
});
