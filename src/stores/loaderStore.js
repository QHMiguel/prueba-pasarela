import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLoaderStore = defineStore('loader', () => {
    const isLoading = ref(false)
    const mensaje = ref("Estamos verificando sus datos, esto solo tomará un momento.")

    function mostrarLoader(msg) {
        if (msg) {
            mensaje.value = msg
        }
        if (isLoading.value) return
        isLoading.value = true
    }

    function ocultarLoader() {
        isLoading.value = false
        mensaje.value = "Estamos verificando sus datos, esto solo tomará un momento."
    }

    return { isLoading, mensaje, mostrarLoader, ocultarLoader }
}, {
    persist: {
        enabled: true,
        strategies: [
            {
                key: 'loader',
                storage: localStorage,
            },
        ],
    },
})
