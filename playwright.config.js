// @ts-check
const { defineConfig } = require('@playwright/test');

const PORT = 4173;

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
    baseURL: `http://127.0.0.1:${PORT}`,
    // Usa o Chrome instalado no sistema (WebCrypto com Ed25519 e X25519).
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/carteira-systekna.html`,
    reuseExistingServer: !process.env.CI,
  },
});
