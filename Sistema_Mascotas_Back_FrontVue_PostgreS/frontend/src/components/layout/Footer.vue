<template>
  <footer class="footer">
    <p>&copy; {{ currentYear }} SPA Mascotas</p>
    <span class="footer-version">v1.0.0</span>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear()
</script>

<style scoped>
.footer {
  padding: 0.75rem 1.5rem;
  text-align: center;
  background: white;
  border-top: 1px solid #e3e6f0;
  font-size: 0.8rem;
  color: #858796;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.footer p { margin: 0; }
.footer-version { opacity: 0.5; font-size: 0.7rem; }

@media (max-width: 480px) {
  .footer { flex-direction: column; text-align: center; }
}
</style>