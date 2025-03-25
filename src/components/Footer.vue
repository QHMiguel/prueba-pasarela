<template>
  <footer class="footer-interseguro">
    <p class="texto-interseguro">
      Conoce nuestros canales de atención en
      <a
        href="https://www.interseguro.pe"
        target="_blank"
        class="enlace-interseguro"
      >
        www.interseguro.pe
      </a>
    </p>
  </footer>
</template>

<script>
export default {
  name: "FooterComponent",
};
</script>

<style scoped>
.footer-interseguro {
  background-color: #285ae2;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 40px;
  width: 100%;
  color: white;
  height: 50px;
  position: relative;
}

.texto-interseguro {
  margin: 0;
  font-size: 16px;
}

.enlace-interseguro {
  color: #ffffff;
  text-decoration: underline;
}

.enlace-interseguro:hover {
  color: #cccccc;
}
</style>
