# 03 · Requisitos Não Funcionais

> Convenção: **RNF-nn**. Cada requisito diz como é **verificado** hoje e o status (legenda no [README](README.md)).
> Origem: `d:` = `docs/`, `v1:` = `docs_v1/`.

## 1. Segurança

| ID | Requisito | Verificação | Status | Origem |
|---|---|---|---|---|
| RNF-01 | **Sem servidor**: nenhum dado do usuário sai do navegador; nenhuma requisição para fora da origem do site. | `seguranca.spec.js` | ✅ | d:RNF-01 · v1:RNF-PRI02 |
| RNF-02 | **CSP restritiva** em cada app: `default-src 'none'`, só o script inline cujo SHA-256 está na política, `connect/font/img/manifest/worker-src 'self'`, `base-uri 'none'`, `form-action 'none'`. | `seguranca.spec.js` (script injetado não roda, hash exato) e todos os fluxos sem violação | ✅ | d:RNF-02 |
| RNF-03 | Dados em repouso **sempre cifrados** com AES-256-GCM e IV aleatório por cifragem (credenciais, estado do emissor, backup); itens da carteira com AAD = `id`. | Inspeção de código; o registro guardado não abre sem a chave | 🟡 | d:RNF-03 · v1:RNF-SEG02 |
| RNF-04 | A entropia guardada exige **duas camadas**: chave do aparelho não exportável + PIN (PBKDF2-SHA256, 600.000 iterações) ou segredo PRF da biometria. Copiar o armazenamento para outro aparelho não abre nada. | `biometria.spec.js` ("o registro guardado não abre sem o segredo do autenticador") | ✅ | d:RNF-04 · v1:RNF-SEG03, SEG04 |
| RNF-05 | Limite de tentativas do PIN **à prova de fechar a aba**: a tentativa é gravada antes de conferir. | `fase1-correcoes.spec.js` 1.1 | ✅ | d:RNF-05 |
| RNF-06 | Material sensível (entropia, sementes, segredos compartilhados) é **zerado** (`fill(0)`) após o uso e ao bloquear; chaves privadas importadas como não extraíveis. | Inspeção de código | 🟡 | d:RNF-06 · v1:RNF-SEG05 |
| RNF-07 | Biometria só com **PRF entregue pelo hardware**; sem PRF a opção não é ativada. | `biometria.spec.js` ("aparelho sem PRF") | ✅ | d:RNF-07 |
| RNF-08 | Todo texto de usuário, token ou arquivo passa por `esc()` antes de ir para o HTML. | Inspeção de código; CSP como segunda barreira | 🟡 | d:RNF-08 |
| RNF-09 | Fonte servida localmente (`fonts/`): abrir o app não contata terceiros. | `seguranca.spec.js` | ✅ | d:RNF-09 |
| RNF-10 | Pedir armazenamento persistente (`navigator.storage.persist`) ao criar ou recuperar a identidade. | Inspeção de código | 🟡 | d:RNF-10 |
| RNF-11 | Desafios de uso único, válidos por minutos; a mesma apresentação reenviada é recusada. | `criterios-de-aceite.spec.js` 05 | ✅ | v1:RNF-SEG06 |
| RNF-12 | Execução só em contexto seguro (HTTPS ou localhost). | Tela "não suportado" | 🟡 | v1:RNF-SEG07 |
| RNF-13 | Em produção: chave do emissor (e da Governança e dos serviços, no alvo) em HSM e PIN conferido por hardware seguro. | Auditoria de implantação | ⬜ | v1:RNF-SEG08 |

## 2. Privacidade

| ID | Requisito | Verificação | Status | Origem |
|---|---|---|---|---|
| RNF-14 | Credencial, livro e registros **nunca** levam CPF, RG, foto e afins (trava `piiProblem`). | `dados-pessoais.spec.js` | ✅ | d:RN59 |
| RNF-15 | Nenhum servidor guarda cadastro de pessoas. O emissor guarda só o que emitiu, cifrado no aparelho dele. | Arquitetura | ✅ | v1:RNF-PRI02 |
| RNF-16 | Privacidade desde a concepção e por padrão (LGPD, art. 46, § 2º). | Revisão de arquitetura | 🟡 | v1:RNF-PRI03 |
| RNF-17 | O usuário pode apagar tudo do próprio aparelho a qualquer momento. | "Apagar tudo deste aparelho" | 🟡 | v1:RNF-PRI04 |
| RNF-18 | **Alvo:** nenhum dado pessoal trafega entre carteira, Governança e serviços; só DID e assinaturas. | Inspeção de todos os payloads | ⬜ ❓DP-03 | v1:RNF-PRI01 |

## 3. Conformidade com padrões

| ID | Requisito | Verificação | Status | Origem |
|---|---|---|---|---|
| RNF-19 | BIP39: listas oficiais EN e PT, entropia ↔ palavras, semente PBKDF2-SHA512 com 2048 iterações. | `vetores-oficiais.spec.js` (vetores Trezor) | ✅ | d:RNF-11 · v1:RNF-INT03 |
| RNF-20 | HKDF-SHA256 conforme RFC 5869. | Casos 1 a 3 da RFC | ✅ | d:RNF-12 |
| RNF-21 | Ed25519 conforme RFC 8032; X25519 conforme RFC 7748. | Vetores das RFCs | ✅ | d:RNF-13 |
| RNF-22 | base58btc e `did:key` (multicodec `0xed01` e `0xec01`). | Exemplos da especificação | ✅ | d:RNF-14 · v1:RNF-INT01 |
| RNF-23 | W3C VC/VP 1.1 (`https://www.w3.org/2018/credentials/v1`) em JWT EdDSA. Evolução para VC 2.0 ❓DP-10. | Inspeção e critérios de aceite | 🟡 | d:RNF-15 · v1:RNF-INT02 |
| RNF-24 | Identidade derivada confere com uma implementação independente em Node. | `vetores-oficiais.spec.js` | ✅ | d:RNF-16 |
| RNF-25 | Biometria sobre WebAuthn Level 3 com PRF (W3C Recommendation de 25/08/2026). | `biometria.spec.js` | ✅ | boletim 01/10/2026 |

## 4. Desempenho

| ID | Requisito | Meta / observação | Status | Origem |
|---|---|---|---|---|
| RNF-26 | Desbloqueio por PIN em segundos (custo deliberado do PBKDF2 com 600 mil iterações). | Meta do alvo: < 2 s em celular intermediário. Testes usam 120 s de limite por teste | 🟡 | d:RNF-17 · v1:RNF-DES02 |
| RNF-27 | Assinar ou verificar um token. | < 50 ms em celular intermediário | 🟡 (não medido) | v1:RNF-DES01 |
| RNF-28 | Página única por app (~130–140 KB, inclui as duas listas BIP39), sem dependências em tempo de execução. | Meta do alvo: < 200 KB, < 2 s em 4G | ✅ | d:RNF-19 · v1:RNF-DES03 |

## 5. Disponibilidade e portabilidade

| ID | Requisito | Verificação | Status | Origem |
|---|---|---|---|---|
| RNF-29 | **PWA instalável** por app, com escopo no próprio HTML; os dois podem ser instalados lado a lado. | `pwa.spec.js` | ✅ | d:RNF-20 |
| RNF-30 | **Offline** depois da primeira visita (service worker, rede primeiro com `no-cache`, cópia guardada como reserva). | `pwa.spec.js` ("abre sem internet") | ✅ | d:RNF-21 · v1:RNF-DIS01 |
| RNF-31 | Cada publicação chega ao celular: o cache do service worker tem o nome da versão e é trocado a cada versão. | `versao.spec.js` e `build:check` | ✅ | — |
| RNF-32 | Mudança de nome ou endereço não quebra quem já usa: o endereço antigo redireciona e o banco local é o mesmo. | `nome-emissor.spec.js` | ✅ | d:RNF-20a |
| RNF-33 | Navegadores com Ed25519 e X25519 no WebCrypto e contexto seguro. Referência: Chrome/Brave 137+, Safari 17+, Firefox 130+; os testes usam o Chrome do sistema. | Tela "não suportado" | 🟡 | d:RNF-22 · v1:RNF-COM01, COM02 |
| RNF-34 | Perda do aparelho é recuperável pelas 12 palavras e por backup. | `fase1-correcoes.spec.js` 1.6 (backup) | ✅ | v1:RNF-DIS03 |
| RNF-35 | **Alvo:** a indisponibilidade da Governança não impede emitir nem usar crachás. | — | ⬜ | v1:RNF-DIS02 |

## 6. Usabilidade e acessibilidade

| ID | Requisito | Status | Origem |
|---|---|---|---|
| RNF-36 | Interface em português do Brasil, linguagem simples, mensagens de erro que dizem o que fazer. | 🟡 | d:RNF-24 · v1:RNF-USA03, USA04 |
| RNF-37 | Mobile-first a partir de 360 px, uso com uma mão (dock inferior, folhas deslizantes), áreas de toque de ao menos 44 px, `safe-area-inset`. | 🟡 | d:RNF-25 · v1:RNF-USA02, USA06 |
| RNF-38 | Design Systekna Aero 2.0, temas claro e escuro. | 🟡 | d:RNF-26 · v1:RNF-USA01 |
| RNF-39 | Teclado de PIN aceita teclado físico (dígitos e Backspace); mensagens em `aria-live`. | 🟡 | d:RNF-27 |
| RNF-40 | Respeita `prefers-reduced-motion`. | 🟡 | d:RNF-28 · v1:RNF-USA05 |
| RNF-41 | Ícones decorativos com `aria-hidden`; botões só com ícone têm `aria-label`; foco visível; contraste WCAG 2.1 AA. | 🟡 (contraste não auditado) | d:RNF-29 · v1:RNF-USA05 |

## 7. Manutenibilidade e qualidade

| ID | Requisito | Status | Origem |
|---|---|---|---|
| RNF-42 | Código-fonte único em `src/`; os HTML da raiz são gerados e nunca editados à mão. | ✅ | d:RNF-30 · v1:RNF-MAN01 |
| RNF-43 | `npm test` falha se os HTML ou o `sw.js` estiverem desatualizados em relação a `src/` e ao `package.json`. | ✅ | d:RNF-31 |
| RNF-44 | Cada correção ganha um teste E2E que falharia na versão anterior. | ✅ (prática) | d:RNF-32 |
| RNF-45 | Testes E2E podem rodar contra o site publicado (`BASE_URL`). | ✅ | d:RNF-33 |
| RNF-46 | Sem dependências de produção; única dependência de desenvolvimento: `@playwright/test`. Sem biblioteca criptográfica externa: só WebCrypto. | ✅ | d:RNF-34 · v1:RNF-MAN03 |
| RNF-47 | Núcleo criptográfico compartilhado entre os apps. | ✅ | v1:RNF-MAN02 |
| RNF-48 | Apps independentes: instalar, atualizar ou apagar um não afeta o outro. | ✅ | v1:RNF-MAN01a |
| RNF-49 | **Alvo:** núcleo em módulos ES testáveis em Node, com testes unitários e cobertura mínima (doc 07). | ⬜ | v1:12 |
| RNF-50 | Documentação em arquivos `.md` separados, atualizada no mesmo commit da regra. | ✅ | v1:RNF-MAN04 |

## 8. Transporte por QR (alvo)

| ID | Requisito | Status | Origem |
|---|---|---|---|
| RNF-51 | Ler um QR em menos de 2 s com câmera de celular comum. | ⬜ ❓DP-04 | v1:RNF-QR01 |
| RNF-52 | Pedir permissão de câmera só na hora da leitura e funcionar sem ela (texto). | ⬜ ❓DP-04 | v1:RNF-QR02 |
| RNF-53 | QR legível nos dois temas (fundo branco fixo). | ⬜ ❓DP-04 | v1:RNF-QR03 |
| RNF-54 | Leitor e gerador de QR **sem** script de terceiros (respeitando RNF-01 e RNF-02). | ⬜ ❓DP-11 | — |

## 9. Auditabilidade e conformidade

| ID | Requisito | Status | Origem |
|---|---|---|---|
| RNF-55 | Livro de registros do emissor encadeado e assinado, com conferência de integridade. | ✅ ❓DP-02 | d:RN31 |
| RNF-56 | Conformidade com LGPD, Marco Civil e ECA Digital (doc 09). | 🟡 | v1:RNF-AUD02 |
| RNF-57 | Arquitetura compatível com eIDAS 2.0 e GDPR, para expansão (doc 09). | 🟡 | v1:RNF-AUD03 |
| RNF-58 | **Alvo:** histórico de eventos na carteira, sem dados pessoais. | ⬜ | v1:RNF-AUD01 |

## 10. Restrições conhecidas (aceitas para o ambiente de demonstração)

- Origem `celsoalmeidalf.github.io` compartilhada com outros sites Pages da conta → **não usar para identidades reais**.
- PIN sem hardware seguro: código rodando no navegador pode testar o milhão de PINs fora do contador (modelo de ameaças em `identidade-soberana-systekna-arquitetura.md`). Mitigação disponível: "Usar só biometria".
- A revogação só é visível ao próprio emissor (RN-26).
- Chave do emissor no navegador, fora de HSM.
- Uso comercial exige, antes do primeiro cliente: termos de uso, política de privacidade e canal com o titular (doc 09).
