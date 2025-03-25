<template>
  <v-container fluid class="pa-4">

    <transition enter-active-class="animate__animated animate__bounceIn animate__fast ">
      <v-card class="mx-auto pa-4 form-cuotas" max-width="600" elevation="2" v-if="animaciones">
        <v-card-title class="justify-center text-h5 text-center title">
          Selecciona las cuotas pendientes que deseas pagar:
        </v-card-title>

        <v-alert v-model="mostrarMsjError" type="info" dismissible class="mensajeError-alert"
          style="max-width: 400px; margin-left: auto; margin-right: auto" @input="show = $event">
          <div v-for="(line, index) in mensajeError.split('\n')" :key="index">
            {{ line }}
          </div>
        </v-alert>

        <v-card-title class="text-center font-weight-bold text-primary producto">{{ cliente.product }}</v-card-title>
        <v-card-title class="text-center policy">Nº de póliza: &nbsp;{{ cliente.policy }}</v-card-title>

        <v-data-table :headers="headers" :items="cuotas" item-value="period" hide-default-footer>
          <template #item.status="{ item }">
            <v-chip color="green" text-color="white" outlined v-if="item.state.toUpperCase() == 'DISPONIBLE'">{{
              item.state.toUpperCase() }}</v-chip>
            <v-chip color="red" text-color="white" outlined v-else>{{
              item.state.toUpperCase()
            }}</v-chip>
          </template>

          <template #item.amount="{ item }">
            <div>{{ cliente.coinSymbol }} {{ item.amount }}</div>
          </template>

          <template #item.pagar="{ item, index }">
            <v-checkbox v-model="item.seleccionado" hide-details density="compact"
              @change="actualizarSeleccion(index)"></v-checkbox>
          </template>
        </v-data-table>

        <div class="text-center mt-2">
          <v-btn text small class="text-primary btn-all" @click="seleccionarTodo">Seleccionar todo</v-btn>
        </div>

        <v-row justify="center" class="mt-4">
          <v-col cols="auto">
            <v-btn dark class="ma-2 btn-pagar" @click="pagar()">
              PAGO CON TARJETA
              <span class="ml-2">{{ cliente.coinSymbol }} &nbsp;{{ amount }}</span>
            </v-btn>
          </v-col>
          <v-col cols="auto"  v-if="pagoEfectivoOn">
            <v-btn dark class="ma-2 btn-pagar" @click="pagarEfectivo()">
              PAGO EFECTIVO
              <span class="ml-2">{{ cliente.coinSymbol }} &nbsp;{{ amount }}</span>
            </v-btn>
          </v-col>
        </v-row>

        <v-dialog v-model="showIsCollectionProcess" max-width="400px" persistent>
          <v-card class="pa-4 modal-warning">
            <v-card-title class="justify-end modal-warning-close" @click="showIsCollectionProcess = false">
              <v-icon color="white">mdi-close</v-icon>
            </v-card-title>

            <v-card-text class="modal-warning-text">
              Esta cuota se encuentra en un proceso de cobranza activo, podría
              generar un pago duplicado. Por favor, revisa los cargos en tu
              tarjeta.
            </v-card-text>

            <v-card-actions class="justify-center">
              <v-btn class="btn-modal-warning" @click="showIsCollectionProcess = false">Entendido</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-card>
    </transition>

  </v-container>
</template>

<script>
import gatewayService from "@/services/pasarelaGatewayService";
import moment from "moment";
import { ipNiubiz } from "@/utils/helpers";
import { useLoaderStore } from '@/stores/loaderStore'

export default {
  data() {
    return {
      animaciones: false,
      mensajeLoader: "Estamos verificando sus datos, esto solo tomará un momento.",
      cliente: {},
      headers: [
        { text: "Mes", value: "period" },
        { text: "Estado", value: "status" },
        { text: "Monto", value: "amount" },
        { text: "Pagar", value: "pagar", sortable: false },
      ],
      cuotas: [],
      mostrarMsjError: false,
      mensajeError: "",
      showIsCollectionProcess: false,
      hasActive: false,
      pagoEfectivoOn: false,
      amount: 0.0,
      loaderStore: null,
    };
  },
  async mounted() {
    this.loaderStore = useLoaderStore()    
    this.loaderStore.mostrarLoader(this.mensajeLoader)
    this.cliente = JSON.parse(localStorage.getItem("cliente"));
    this.cuotas = this.cliente.dues;
    if (this.cliente && this.cliente.dues?.length) this.cliente.dues[0].enabled = true;
    this.pagoEfectivoOn = this.cliente.pagoEfectivoOn != undefined ? this.cliente.pagoEfectivoOn : false;
    this.loaderStore.ocultarLoader()
    this.animaciones = true;
  },
  methods: {
    actualizarSeleccion(indexSelected) {
      if (indexSelected !== undefined && indexSelected !== null && indexSelected >= 0 && this.cuotas[indexSelected].collectionsProcess === 1) {
        this.showIsCollectionProcess = true;
      }
      this.amount = 0.0;
      let index = 0;
      let position = 0;
      let size = 0;
      const amountBefore = this.amount;
      if (this.cuotas != null) {
        size = this.cuotas.length;
        this.cuotas.forEach((element) => {
          this.cuotas[index].enabled = false;
          if (element.seleccionado) {
            this.amount += Number.parseFloat(element.amount);
            position = index;
          }
          index++;
        });
        this.cuotas[position].enabled = true;
        if (this.amount > amountBefore) {
          if (position + 1 < size) {
            this.cuotas[position + 1].enabled = true;
          }
        }
      }
      this.amount = Number.parseFloat(this.amount.toFixed(2));
      if (this.amount > 0) {
        this.hasActive = true;
        localStorage.setItem("cuotasSeleccionadas", JSON.stringify(this.cuotas));
      } else {
        this.hasActive = false;
      }
    },
    seleccionarTodo() {
      const seleccionar = !this.cuotas.every((cuota) => cuota.seleccionado);
      this.cuotas.forEach((cuota) => (cuota.seleccionado = seleccionar));
    },
    pagar() {
      this.loaderStore.mostrarLoader(this.mensajeLoader)
      let crearSesionRequest = {
        amount: 1,
        currency: this.cliente.coin,
        email: this.cliente.email,
        identityNumber: this.cliente.docNumber,
        saleNumber: this.cliente.policy,
        recurrenceMaxAmount: 0,
        product: this.cliente.productAcsele,
        provider: '',
        clientIP: this.ipNiubiz,
      };
      localStorage.setItem("crearSesionRequest", JSON.stringify(crearSesionRequest));
      this.$router.push({ name: "PagoCuotas" });
    },
    async pagarEfectivo() {
      this.mensajeLoader = "Estamos generando su orden de pago, esto solo tomará un momento."
      this.loaderStore.mostrarLoader(this.mensajeLoader)
      try {
        const duesSelected = JSON.parse(localStorage.getItem("cuotasSeleccionadas"));
        let amount = 0.0;
        let oi = [];
        duesSelected.forEach((element) => {
          if (element.seleccionado) {
            amount += Number.parseFloat("" + element.amount);
            oi.push("" + element.openItem);
          }
        });
        amount = Number.parseFloat(amount.toFixed(2));
        let date = new Date();
        date.setDate(date.getDate() + 1);
        const request = {
          policy: this.cliente.policy,
          amount: amount,
          currency: this.cliente.coin,
          ip: ipNiubiz(),
          operationId: this.cliente.trace + "," + oi.join(","),
          proposalNumber: "",
          expirationDate: moment(String(date)).format("DD/MM/YYYY[T]HH:mm:ssZZ"),
          email: this.cliente.email,
          documentType: this.cliente.docType,
          documentNumber: this.cliente.docNumber,
          country: "PE",
          name: this.cliente.name,
          lastName: this.cliente.lastName1,
          motherLastName: this.cliente.lastName2,
          phone: this.cliente.telephone,
          address: ",",
          addressCity: "",
          product: this.cliente.productAcsele,
          debtCode: this.cliente.debtCode,
        };
        let response = await gatewayService.crearOrdenPagoEfectivo(request);

        if (response.status == 200) {
          if (response.data.code == '01') {
            localStorage.setItem("transaccionPagoEfectivo", JSON.stringify(response.data));
            this.$router.push({ name: "PagoEfectivo" });
            this.loaderStore.ocultarLoader()
          } else {
            this.loaderStore.ocultarLoader()
            this.mensajeError = "Tuvimos problemas al intentar generar su orden de pago, por favor intente nuevamente.";
            this.mostrarMsjError = true;
          }
        } else {
          this.loaderStore.ocultarLoader()
          this.mostrarMsjError = true;
          this.mensajeError = "Tuvimos problemas al intentar generar su orden de pago, por favor intente nuevamente.";
        }
      } catch (e) {
        console.log(e);
        this.loaderStore.ocultarLoader()
        this.mensajeError = "Tuvimos problemas al intentar generar su orden de pago, por favor intente nuevamente.";
        this.mostrarMsjError = true;
      }
    },
  },
};
</script>

<style scoped>
.text-center {
  text-align: center;
  white-space: normal;
  overflow: visible;
}

.btn-pagar {
  background-color: #ff4081;
  color: #ffffff;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 600;
}

.btn-pagar:hover {
  box-shadow: 0px 4px 10px #00000026;
  transform: translateY(-2px);
}

.btn-all {
  background-color: #285ae2;
  color: #ffffff !important;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 600;
}

.btn-all:hover {
  box-shadow: 0px 4px 10px #00000026;
  transform: translateY(-2px);
}

.form-cuotas {
  box-shadow: 0px 5px 15px #00000026 !important;
  border-radius: 12px !important;
}

.title {
  color: #285ae2;
  font-weight: 500;
  margin-bottom: 20px;
  font-size: 1.4rem !important;
}

.producto {
  color: #285ae2 !important;
  font-size: 1.5rem !important;
  max-height: 30px !important;
}

.policy {
  color: #212121 !important;
  font-size: 1rem !important;
  max-height: 30px !important;
}

.mensajeError-alert {
  font-size: 14px;
  line-height: 1.5;
}

.modal-warning {
  background-color: #ffffff;
  color: #212121;
  border-radius: 10px;
}

.modal-warning-close {
  cursor: pointer;
  position: absolute;
  top: 10px;
  right: 10px;
}

.modal-warning-text {
  text-align: center;
  margin: 20px 0;
}

.btn-modal-warning {
  background-color: #285ae2;
  color: white;
}
</style>
