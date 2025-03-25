import axios from "axios";
import config from "../config/envConfig";

export const niubizClient = axios.create({
  baseURL: config.VITE_NIUBIZ_IP,
  headers: {
    "Content-Type": "application/json",
  },
});

export const pasarelaAuthClient = axios.create({
  baseURL: config.VITE_PASARELA_AUTH,
  headers: {
    "Content-Type": "application/json",
  },
});

export const pasarelaGatewayClient = axios.create({
  baseURL: config.VITE_PASARELA_GATEWAY,
  headers: {
    "Content-Type": "application/json",
  },
});