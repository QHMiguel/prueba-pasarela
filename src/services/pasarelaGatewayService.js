import { pasarelaGatewayClient } from "./apiService";
import authService from "./pasarelaAuthService";

export default {
    async generarPago(request) {
        try {
            const { token: bearerToken } = await authService.crearTokenAuth();
            const headers = {
                Authorization: `Bearer ${bearerToken}`,
            }
            const response = await pasarelaGatewayClient.post(
                "/generar-pago",
                request, { headers }
            );
            console.log("generarPago response", response);
            return response;
        } catch (error) {
            console.error("Error generarPago:", error);
            throw error;
        }
    },

    async crearSesionPasarela(request) {
        try {
            const { token: bearerToken } = await authService.crearTokenAuth();
            const headers = {
                Authorization: `Bearer ${bearerToken}`,
            }
            const response = await pasarelaGatewayClient.post(
                "/crear-sesion-pasarela",
                request, { headers }
            );
            console.log("crearSesionPasarela response", response);
            return response;
        } catch (error) {
            console.error("Error crearSesionPasarela:", error);
            throw error;
        }
    },

    async obtenerViaCobro() {
        try {
            const { token: bearerToken } = await authService.crearTokenAuth();
            const headers = {
                Authorization: `Bearer ${bearerToken}`,
            }
            const response = await pasarelaGatewayClient.get(`/viasCobro`, { headers });
            console.log("getViaCobro response", response);
            return response;
        } catch (error) {
            console.error("Error obtenerViaCobro:", error);
            throw error;
        }
    },

    async crearOrdenPagoEfectivo(request) {
        try {
            const { token: bearerToken } = await authService.crearTokenAuth();
            const headers = {
                Authorization: `Bearer ${bearerToken}`,
            };
            const response = await pasarelaGatewayClient.post(
                "/crear-orden-pago-efectivo",
                request,
                { headers }
            );
            console.log("crearOrdenPagoEfectivo response", response);
            return response;
        } catch (error) {
            console.error("Error crearOrdenPagoEfectivo:", error);
            throw error;
        }
    },

    async buscarCliente(token, documento, propuesta) {
        try {
            const { token: bearerToken } = await authService.crearTokenAuth();
            const headers = {
                Authorization: `Bearer ${bearerToken}`,
            }
            const response = await pasarelaGatewayClient.get(
                `/buscar-cliente/${token}/${propuesta}/${documento}`, { headers }
            );
            console.log("Cliente encontrado:", response);
            return response;
        } catch (error) {
            console.error("Error obteniendo clientes:", error);
            throw error;
        }
    },

    async buscarClienteV2(token, documento, propuesta) {
        try {            
            const { token: bearerToken } = await authService.crearTokenAuth();
            const headers = {
                Authorization: `Bearer ${bearerToken}`,
            }
            let response = await pasarelaGatewayClient.get(
                `/v2/buscar-cliente/${token}/${propuesta}/${documento}`, { headers }
            );
            console.log("Cliente encontrado:", response);
            return response;
        } catch (error) {
            console.error("Error obteniendo clientes:", error);
            throw error;
        }
    },

    async guardarComprobante(request) {
        try {
            const { token: bearerToken } = await authService.crearTokenAuth();
            const headers = {
                Authorization: `Bearer ${bearerToken}`,
            }
            const response = await pasarelaGatewayClient.post(
                "/guardar-archivo-b64",
                request, { headers }
            );
            console.log("guardarComprobante response", response);
            return response;
        } catch (error) {
            console.error("Error guardarComprobante:", error);
            throw error;
        }
    },
};
