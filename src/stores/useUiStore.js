import { defineStore } from "pinia";

export const useUiStore = defineStore("ui", {
    state: () => ({
        tituloError: "",
        mensajeError: "",
        mostrarMsjError: false,
        animaciones: false,
        render: false,
        mostrarSwitch: false,
    }),
    actions: {
        setError(titulo, mensaje) {
            this.tituloError = titulo;
            this.mensajeError = mensaje;
            this.mostrarMsjError = true;
        },
        resetError() {
            this.tituloError = "";
            this.mensajeError = "";
            this.mostrarMsjError = false;
        },
        setAnimaciones(value) {
            if (value) {
                setTimeout(() => { this.animaciones = value }, 1000);
            } else {
                this.animaciones = value;
            }
        },
        setRender(value) {
            setTimeout(() => { this.render = value; }, 1000);

        },
        setSwitch(value) {
            this.mostrarSwitch = value;
        },
    },
});
