<template>
  <div v-html="contenido" class="tyc-container"></div>
</template>

<script>
export default {
  name: "TerminosCondiciones",
  props: {
    contenido: {
      type: String,
      required: true,
    },
  },
};
</script>

<style scoped>

.tyc-container{
  max-height: 300px !important;
  font-size: 12px !important;
  line-height: 1.2;
  margin: 5px;
}
</style>
