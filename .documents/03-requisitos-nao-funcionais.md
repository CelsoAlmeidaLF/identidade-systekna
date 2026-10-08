# 03 · Requisitos Não Funcionais

## 1. Segurança

| ID | Requisito | Como é verificado |
|---|---|---|
| RNF-01 | Sem servidor: nenhuma requisição para fora do site | `seguranca.spec.js` (nos 3 apps) |
| RNF-02 | CSP: só o script inline cujo SHA-256 está na política; nada externo; `base-uri` e `form-action` bloqueados | `seguranca.spec.js`; todo fluxo testado termina sem violação de CSP |
| RNF-03 | Dados em repouso cifrados com AES-256-GCM, IV aleatório, AAD por contexto | Inspeção; backup e estado não abrem com outra chave |
| RNF-04 | Entropia em duas camadas: chave do aparelho não exportável + PIN (PBKDF2-SHA256 600 mil) ou segredo PRF | `biometria.spec.js` |
| RNF-05 | Tentativa de PIN gravada antes de conferir (fechar a aba não devolve a tentativa) | `fase1-correcoes.spec.js` |
| RNF-06 | Biometria só com PRF entregue pelo hardware | `biometria.spec.js` |
| RNF-07 | Todo texto vindo de token ou usuário passa por `esc()` antes do HTML | Inspeção + CSP |
| RNF-08 | Desafios de uso único (10 min) e provas de 5 min com `aud` | `criterios-de-aceite`, `servicos`, `acesso` |
| RNF-09 | Pacote com tipo trocado ou alterado é recusado (envelope + `typ` + assinatura) | `governanca.spec.js` |
| RNF-10 | Livro encadeado e assinado; backup com livro adulterado é recusado | `criterios-de-aceite`, `cobertura` |

## 2. Privacidade

| ID | Requisito |
|---|---|
| RNF-20 | Identidade leva **só o nome**; crachá, **só serviço e app** |
| RNF-21 | CPF, RG, CNH, foto, endereço, filiação e afins são recusados em qualquer credencial (pelo nome do campo e por CPF válido no valor) |
| RNF-22 | Nenhum cadastro em servidor; a Governança e os Serviços guardam só o registro do que emitiram, cifrado no aparelho deles |
| RNF-23 | DIDs das várias identidades e dos apps não têm ligação entre si |

## 3. Padrões

| ID | Requisito | Verificação |
|---|---|---|
| RNF-30 | BIP39 (listas oficiais EN/PT, vetores Trezor) | `vetores-oficiais.spec.js` |
| RNF-31 | HKDF RFC 5869; Ed25519 RFC 8032; X25519 RFC 7748 | `vetores-oficiais.spec.js` |
| RNF-32 | `did:key` (multicodec `0xed01`), base58btc | `vetores-oficiais.spec.js` |
| RNF-33 | DID de cada app confere com implementação independente em Node | `vetores-oficiais.spec.js` |
| RNF-34 | W3C Verifiable Credentials 1.1 em JWT EdDSA | Inspeção |
| RNF-35 | WebAuthn Level 3 com PRF | `biometria.spec.js` |

## 4. Desempenho e portabilidade

| ID | Requisito |
|---|---|
| RNF-40 | Um HTML por app (~140 KB), sem dependências em tempo de execução |
| RNF-41 | Desbloqueio pelo PIN em segundos (custo proposital do PBKDF2) |
| RNF-42 | PWA instalável, funciona offline, cada versão chega ao celular (cache com o número da versão) — `pwa.spec.js`, `versao.spec.js` |
| RNF-43 | Navegadores com Ed25519/X25519 no WebCrypto (Chrome/Brave 137+, Safari 17+, Firefox 130+); aviso se faltar |

## 5. Usabilidade

| ID | Requisito |
|---|---|
| RNF-50 | Português do Brasil, mensagens que dizem o que fazer |
| RNF-51 | Mobile-first, uso com uma mão, rodapé com o + no centro nos apps que têm menu de ações |
| RNF-52 | Design Systekna Aero 2.0, claro e escuro; cores por perfil nos cartões |
| RNF-53 | Ações destrutivas sempre com confirmação |
| RNF-54 | Teclado de PIN aceita teclado físico; `aria-live`, `aria-label`, `prefers-reduced-motion` |

## 6. Qualidade

| ID | Requisito |
|---|---|
| RNF-60 | Código só em `src/`; HTML gerados pelo build e conferidos (`build:check`) |
| RNF-61 | Cada entrega com teste do que mudou; merge só com teste aprovado |
| RNF-62 | Testes podem rodar contra o site publicado (`BASE_URL`) |
| RNF-63 | Única dependência de desenvolvimento: `@playwright/test` |

## 7. Restrições aceitas (ambiente de demonstração)

- Origem compartilhada no GitHub Pages: não usar para identidades reais.
- PIN sem hardware seguro: um código malicioso no navegador pode testar os PINs fora do contador. Mitigação: "usar só biometria".
- Revogação só visível para quem revogou.
- Uso comercial exige termos de uso, política de privacidade e canal com o titular (ver [09](09-legislacao.md)).
