import { createRouter, createWebHistory } from "vue-router";

import BuscarClienteView from "../views/BuscarClienteView.vue";

import PagoView from "../views/primera/PagoView.vue";
import ConfirmationView from "../views/ConfirmacionView.vue";
import AfiliationInviteView from "../views/InvitacionAfiliacionView.vue";
import AfiliacionView from "../views/AfiliacionView.vue";
import ConfirmacionAfiliacionView from "../views/ConfirmacionAfiliacionView.vue";

import NotFound from "@/views/NotFound.vue";
import SessionCaducadaView from "@/views/SessionCaducada.vue";

import CuotasView from "@/views/cuotas/CuotasView.vue";
import PagoEfectivoView from "@/views/cuotas/PagoEfectivoView.vue";
import PagoCuotasView from "@/views/cuotas/PagoCuotasView.vue";

const base = '/';

const routes = [
  {
    path: `${base}cliente`,
    name: "BuscarCliente",
    component: BuscarClienteView,
  },
  {
    path: `${base}pago`,
    name: "Pago",
    component: PagoView,
  },
  {
    path: `${base}confirmacion-pago`,
    name: "Confirmation",
    component: ConfirmationView,
  },
  {
    path: `${base}invitacion-afiliacion`,
    name: "AfiliationInvite",
    component: AfiliationInviteView,
  },
  {
    path: `${base}afiliacion`,
    name: "Afiliacion",
    component: AfiliacionView,
  },
  {
    path: `${base}confirmacio-afiliacion`,
    name: "AfiliacionConfirmacion",
    component: ConfirmacionAfiliacionView,
  },
  {
    path: `${base}cuotas`,
    name: "Cuotas",
    component: CuotasView,
  },
  {
    path: `${base}confirmacion-pago-efectivo`,
    name: "PagoEfectivo",
    component: PagoEfectivoView,
  },
  {
    path: `${base}pago-cuotas`,
    name: "PagoCuotas",
    component: PagoCuotasView,
  },
  {
    path: `${base}sesion-caducada`,
    name: "SessionCaducada",
    component: SessionCaducadaView,
  },
  { path: "/:pathMatch(.*)*", component: NotFound },
];

const router = createRouter({
  history: createWebHistory('/pasarela/'),
  routes,
});

router.beforeEach((to, from, next) => {  
  const rutasConRecarga = [
    "/pago",
    "/afiliacion",
    "/pago-cuotas",
  ];
  if (
    rutasConRecarga.includes(to.path) &&
    "/pasarela" + to.fullPath !== window.location.pathname
  ) {
    window.location.href = "/pasarela" + to.fullPath;
  } else {
    next();
  }
});

export default router;
