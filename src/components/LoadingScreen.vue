<template>
  <transition name="fade-center" @after-leave="onAfterLeave">
    <div v-if="showLoader" class="loading-screen">
      <img src="@/assets/loading-bird.gif" alt="Cargando" class="loading-image" />
      <p class="loading-text">{{ loaderStore.mensaje }}</p>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from "vue";
import { useLoaderStore } from "@/stores/loaderStore";

const loaderStore = useLoaderStore();
const showLoader = ref(loaderStore.isLoading);

watch(
  () => loaderStore.isLoading,
  (newValue) => {
    if (newValue) {
      showLoader.value = true;
    } else {
      setTimeout(() => {
        showLoader.value = false;
      }, 500);
    }
  }
);

const onAfterLeave = () => {
  //console.log("Loader completamente oculto");
};
</script>

<style scoped>
.fade-center-enter-active {
  animation: fadeFromCenter 0.8s ease-in-out;
}

.fade-center-leave-active {
  animation: fadeFromCenter 0.8s ease-in-out reverse;
}

@keyframes fadeFromCenter {
  0% {
    opacity: 0;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  opacity: 1;
  transition: opacity 0.8s ease-in-out;
}

.loading-image {
  width: 300px;
  height: auto;
  margin-bottom: 20px;
}

.loading-text {
  color: #1e52e2;
  font-size: 30px;
  text-align: center;
  font-family: "Omnes", sans-serif;
  font-weight: 500;
}
</style>
