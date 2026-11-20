<div class="sk" aria-busy="true" role="status">
  <span class="sr">Scarico le previsioni…</span>
  <div class="block hero"></div>
  <div class="row"><div class="block"></div><div class="block"></div><div class="block"></div></div>
  <div class="block card"></div>
  <div class="block card short"></div>
</div>

<style>
  .sk { display: grid; gap: 12px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .block { border-radius: 24px; background: linear-gradient(100deg, #fff0c4 30%, #fff9e6 50%, #fff0c4 70%); background-size: 220% 100%; animation: shimmer 1.4s linear infinite; }
  .hero { height: 300px; border-radius: 28px; }
  .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .row .block { height: 92px; border-radius: 20px; }
  .card { height: 130px; }
  .short { height: 90px; }
  @keyframes shimmer { to { background-position: -220% 0; } }
</style>
