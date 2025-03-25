import { niubizClient } from "./apiService";

export default {
  async obtenerIpNiubiz() {
    try {
      const response = await niubizClient.get();
      return response.data;
    } catch (error) {
      console.error("Error obteniendo ip niubiz:", error);
      throw error;
    }
  },
};
