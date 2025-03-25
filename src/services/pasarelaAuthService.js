import { pasarelaAuthClient } from "./apiService";
import config from "../config/envConfig";

export default {
    async crearTokenAuth() {
        try {
            let request = {
                clientId: config.VITE_AUTH_CLIENT,
                clientSecret: config.VITE_AUTH_SECRET,
            };
            const response = await pasarelaAuthClient.post(
                "/auth/token",
                request
            );
            console.log("crearTokenAuth response", response);
            return response.data;
        } catch (error) {
            console.error("Error crearTokenAuth:", error);
            throw error;
        }
    },
};
