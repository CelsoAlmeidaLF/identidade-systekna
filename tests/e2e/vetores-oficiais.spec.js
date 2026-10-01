// @ts-check
// Núcleo criptográfico conferido contra vetores oficiais (fontes em tests/fixtures/vetores-oficiais.json)
// e contra uma segunda implementação independente (o módulo crypto do Node).
// Roda nas duas páginas: enquanto o núcleo estiver copiado nas duas, as duas cópias são conferidas.
const { test, expect } = require('@playwright/test');
const nodeCrypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FIX = path.join(__dirname, '..', 'fixtures');
const V = JSON.parse(fs.readFileSync(path.join(FIX, 'vetores-oficiais.json'), 'utf8'));
const lista = nome => fs.readFileSync(path.join(FIX, `bip39-${nome}.txt`), 'utf8').split('\n').filter(Boolean);

// Identidade de teste usada nos outros testes E2E.
const PALAVRAS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
// Regressão: se a derivação mudar, quem já tem identidade perde o acesso a ela com as mesmas 12 palavras.
const DID_ESPERADO = 'did:key:z6MkuKwMejuU5tavPVP5ZVWg9W1z28SY62DNXp3aBzyMsLXr';

const PKCS8 = { ed: '302e020100300506032b657004220420', x: '302e020100300506032b656e04220420' };

for (const arquivo of ['carteira-systekna.html', 'cartorio-systekna.html']) {
  test.describe(arquivo, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(arquivo);
      await expect(page.locator('#sWelcome')).toBeVisible();
    });

    test('listas de palavras BIP39 idênticas às oficiais (inglês e português)', async ({ page }) => {
      const doSite = await page.evaluate(() => ({ en: WORDS.en, pt: WORDS.pt }));
      expect(doSite.en).toEqual(lista('english'));
      expect(doSite.pt).toEqual(lista('portuguese'));
      for (const nome of ['english', 'portuguese']) {
        const sha = nodeCrypto.createHash('sha256').update(fs.readFileSync(path.join(FIX, `bip39-${nome}.txt`))).digest('hex');
        expect(sha, `fixture ${nome}.txt alterada`).toBe(V.wordlists_sha256[`${nome}.txt`]);
      }
    });

    test('BIP39: entropia ↔ 12 palavras e semente (vetores Trezor)', async ({ page }) => {
      for (const v of V.bip39) {
        // A referência só é válida se reproduzir a semente oficial (senha "TREZOR").
        const ref = nodeCrypto.pbkdf2Sync(v.mnemonic.normalize('NFKD'), 'mnemonicTREZOR', 2048, 64, 'sha512').toString('hex');
        expect(ref).toBe(v.seed_trezor);
        // A carteira não usa senha extra: sal "mnemonic".
        const semSenha = nodeCrypto.pbkdf2Sync(v.mnemonic.normalize('NFKD'), 'mnemonic', 2048, 64, 'sha512').toString('hex');

        const r = await page.evaluate(async ({ entropy, mnemonic }) => {
          const ent = hexB(entropy);
          const words = await entropyToWords(ent, 'en');
          const volta = await wordsToEntropy(mnemonic.split(' '));
          return { words: words.join(' '), ent: hex(volta.ent), seed: hex(await wordsToSeed(mnemonic.split(' '))) };
        }, v);
        expect(r.words).toBe(v.mnemonic);
        expect(r.ent).toBe(v.entropy);
        expect(r.seed).toBe(semSenha);
      }
    });

    test('BIP39: checksum errado é recusado', async ({ page }) => {
      const codigo = await page.evaluate(async () => {
        try { await wordsToEntropy('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'.split(' ')); return 'aceitou'; }
        catch (e) { return e.code; }
      });
      expect(codigo).toBe('checksum');
    });

    test('HKDF-SHA256 (RFC 5869, casos 1 a 3)', async ({ page }) => {
      for (const c of V.hkdf) {
        const okm = await page.evaluate(async ({ ikm, salt, info, L }) => {
          const b = h => (h ? hexB(h) : new Uint8Array(0));
          return hex(await hkdf(b(ikm), b(info), b(salt), L * 8));
        }, c);
        expect(okm, `caso ${c.caso}`).toBe(c.okm);
      }
    });

    test('Ed25519 (RFC 8032, seção 7.1): chave pública, assinatura e verificação', async ({ page }) => {
      for (const t of V.ed25519) {
        const r = await page.evaluate(async ({ secret, message, signature }) => {
          const der = cat(PK8.ed, hexB(secret));
          const priv = await S.importKey('pkcs8', der, { name: 'Ed25519' }, true, ['sign']);
          const pub = b64u.dec((await S.exportKey('jwk', priv)).x);
          const msg = message ? hexB(message) : new Uint8Array(0);
          const sig = new Uint8Array(await S.sign({ name: 'Ed25519' }, priv, msg));
          const pubKey = await S.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify']);
          return { pub: hex(pub), sig: hex(sig), ok: await S.verify({ name: 'Ed25519' }, pubKey, hexB(signature), msg) };
        }, t);
        expect(r.pub, t.teste).toBe(t.public);
        expect(r.sig, t.teste).toBe(t.signature);
        expect(r.ok, t.teste).toBe(true);
      }
    });

    test('X25519 (RFC 7748, seção 6.1): chaves públicas e segredo compartilhado', async ({ page }) => {
      const r = await page.evaluate(async x => {
        const priv = async h => S.importKey('pkcs8', cat(PK8.x, hexB(h)), { name: 'X25519' }, true, ['deriveBits']);
        const pubDe = async k => hex(b64u.dec((await S.exportKey('jwk', k)).x));
        const a = await priv(x.alice_priv), b = await priv(x.bob_priv);
        const bobPub = await S.importKey('raw', hexB(x.bob_pub), { name: 'X25519' }, false, []);
        const shared = hex(await S.deriveBits({ name: 'X25519', public: bobPub }, a, 256));
        return { a: await pubDe(a), b: await pubDe(b), shared };
      }, V.x25519);
      expect(r).toEqual({ a: V.x25519.alice_pub, b: V.x25519.bob_pub, shared: V.x25519.shared });
    });

    test('base58btc (draft-msporny-base58): codifica e decodifica', async ({ page }) => {
      for (const v of V.base58) {
        const r = await page.evaluate(({ hex: h, b58 }) => ({ enc: b58enc(hexB(h)), dec: hex(b58dec(b58)) }), v);
        expect(r).toEqual({ enc: v.b58, dec: v.hex });
      }
    });

    test('did:key Ed25519 (exemplos da especificação): lê a chave e reconstrói o mesmo DID', async ({ page }) => {
      for (const did of V.did_key) {
        const r = await page.evaluate(async d => {
          const k = await didToEdKey(d); // importa como chave Ed25519 (não exportável, de propósito)
          if (k.algorithm.name !== 'Ed25519') return 'algoritmo ' + k.algorithm.name;
          const bytes = b58dec(d.slice('did:key:z'.length)); // 0xed 0x01 + 32 bytes da chave
          return 'did:key:' + multibase([0xed, 0x01], bytes.slice(2));
        }, did);
        expect(r).toBe(did);
      }
    });

    test('identidade derivada das 12 palavras confere com uma implementação independente (Node)', async ({ page }) => {
      // Referência: PBKDF2 → HKDF → chaves, tudo com o crypto do Node.
      const seed = nodeCrypto.pbkdf2Sync(PALAVRAS, 'mnemonic', 2048, 64, 'sha512');
      const hk = info => Buffer.from(nodeCrypto.hkdfSync('sha256', seed, 'systekna-cofre-v1', info, 32));
      const pubDe = (prefixo, s) => nodeCrypto.createPublicKey(nodeCrypto.createPrivateKey({ key: Buffer.concat([Buffer.from(prefixo, 'hex'), s]), format: 'der', type: 'pkcs8' }))
        .export({ format: 'jwk' }).x;
      const edPub = Buffer.from(/** @type {string} */ (pubDe(PKCS8.ed, hk('ssi/ed25519'))), 'base64url').toString('hex');
      const xPub = Buffer.from(/** @type {string} */ (pubDe(PKCS8.x, hk('ssi/x25519'))), 'base64url').toString('hex');
      const iv = Buffer.alloc(12, 7), texto = Buffer.from('teste do cofre');
      const c = nodeCrypto.createCipheriv('aes-256-gcm', hk('vault/aes-256-gcm'), iv);
      const cifrado = Buffer.concat([c.update(texto), c.final(), c.getAuthTag()]).toString('hex');

      const r = await page.evaluate(async ({ palavras, iv, texto }) => {
        const id = await deriveIdentity(await wordsToSeed(palavras.split(' ')));
        const ct = await S.encrypt({ name: 'AES-GCM', iv: hexB(iv) }, id.vaultKey, hexB(texto));
        return { did: id.did, edPub: hex(id.edPub), xPub: hex(id.xPub), cifrado: hex(ct) };
      }, { palavras: PALAVRAS, iv: iv.toString('hex'), texto: texto.toString('hex') });

      expect(r.edPub).toBe(edPub);
      expect(r.xPub).toBe(xPub);
      expect(r.cifrado).toBe(cifrado);
      expect(r.did).toBe(DID_ESPERADO);
    });
  });
}
