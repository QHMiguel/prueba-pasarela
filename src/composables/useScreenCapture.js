import { ref } from "vue";
import html2canvas from "html2canvas";
import gatewayService from "@/services/pasarelaGatewayService";


export function useScreenCapture() {
    const base64Image = ref(null);
    const isCapturing = ref(false);

    const captureScreen = async (evento) => {
        isCapturing.value = true;
        const tokenStorage = localStorage.getItem("token");
        const contractor = JSON.parse(localStorage.getItem("cliente"));
        const propuestaStorage = localStorage.getItem("propuesta");
        const identificador = `${evento}_${contractor.docNumber}_${propuestaStorage}_${tokenStorage}`;

        const identificadorStorage = localStorage.getItem("comprobante_pago");
        if (identificadorStorage == identificador) {
            isCapturing.value = false;
            return;
        }

        try {
            const element = document.body;
            const canvas = await html2canvas(element, {
                useCORS: true,
                scale: 1,
            });
            base64Image.value = canvas.toDataURL("image/png");
            const request = {
                "token": tokenStorage,
                "documento": contractor.docNumber,
                "poliza": propuestaStorage,
                "documentos": [{
                    "tipo": evento,
                    "nombre": identificador,
                    "archivoB64": base64Image.value
                }]
            };
            //console.log("Request:", request);            
            const res = await gatewayService.guardarComprobante(request);
            if (res.status === 201 && res.data?.codigoRespuesta == "01") {
                localStorage.setItem("comprobante_pago", identificador);
            }
            console.log("Response:", res);
        } catch (error) {
            console.error("Error al capturar la pantalla:", error);
        } finally {
            isCapturing.value = false;
        }
    };


    return {
        base64Image,
        isCapturing,
        captureScreen,
    };
}
