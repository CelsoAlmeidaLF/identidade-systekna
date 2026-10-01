// @ts-check
const { defineConfig } = require('@playwright/test');

const PORT = 4173;
// BASE_URL roda os testes contra um site já publicado, por exemplo o GitHub Pages.
// A barra final faz os caminhos relativos ficarem dentro da pasta do site.
const BASE_URL = process.env.BASE_URL && process.env.BASE_URL.replace(/\/?$/, '/');

module.exports = defineConfig({
  testDir: './tests/e2e',
  // O fluxo é uma história só (pedido → emissão → apresentação → revogação),
  // então os testes rodam em série e num único worker.
  fullyParallel: false,
  workers: 1,
  // O PIN usa PBKDF2 com 600.000 iterações: cada desbloqueio leva alguns segundos.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL || `http://127.0.0.1:${PORT}/`,
    // Usa o Chrome instalado no sistema (WebCrypto com Ed25519 e X25519).
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: BASE_URL ? undefined : {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/carteira-systekna.html`,
    reuseExistingServer: !process.env.CI,
  },
});
