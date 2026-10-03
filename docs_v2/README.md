# Documentação v2 — Identidade Soberana Systekna

> **Versão da documentação:** v2 · 03/10/2026 · Autor: Celso de Almeida Leite Filho (Systekna)
> **Código de referência:** branch `main`, versão **0.17.0**, publicada no GitHub Pages: Carteira, Governança Systekna e Serviços Systekna (a 0.13.0 é o commit `c979c1c`).
> **Substitui:** `docs/` (v0, base 0.6) e `docs_v1/` (v1, alvo de 3 apps). As duas pastas ficam como histórico.

## Como esta versão está organizada

Cada documento separa duas camadas:

| Camada | O que é | Como aparece |
|---|---|---|
| **Atual** | O que a versão 0.13.0 faz hoje, conferido no código e nos testes | Status ✅ ou 🟡 |
| **Alvo** | O ecossistema de 3 aplicativos (Carteira, Governança, App Serviço) descrito em `docs_v1/` | Status ⬜ |

Quando o atual e o alvo se contradizem, o ponto vira uma **decisão pendente** (`DP-nn`), registrada no [documento 11](11-decisoes-pendentes-e-roteiro.md). Nenhuma regra do alvo vale para o código antes de a decisão ser tomada.

### Legenda de status (usada em todos os documentos)

| Símbolo | Significado |
|---|---|
| ✅ | Implementado na 0.13.0 **e** coberto por teste automatizado |
| 🟡 | Implementado na 0.13.0, **sem** teste automatizado |
| ⬜ | Alvo: ainda não construído |
| ❓ | Dependia de uma decisão (indicada). **Todas foram tomadas em 03/10/2026: ver doc 11 §1** |
| ⏸ | Descartado por decisão do responsável |
| 📦 | Existe só em branch de backup (`bkp/avancado` ou `bkp/cracha`), fora da main |

## Documentos

| # | Documento | Conteúdo | Para quem |
|---|---|---|---|
| 00 | [Apresentação](00-apresentacao.md) | O produto em uma página: problema, solução, onde estamos | Todos, parceiros |
| 01 | [Arquitetura](01-arquitetura.md) | Arquitetura atual (2 apps), arquitetura-alvo (3 apps), transição, ADRs | Arquitetura, devs |
| 02 | [Requisitos funcionais](02-requisitos-funcionais.md) | Requisitos por app, atuais e alvo, com status | Produto, devs, QA |
| 03 | [Requisitos não funcionais](03-requisitos-nao-funcionais.md) | Segurança, privacidade, desempenho, offline, usabilidade, manutenção | Arquitetura, QA |
| 04 | [Regras de negócio](04-regras-de-negocio.md) | Regras de emissão, verificação, revogação, livro, acesso local, dados pessoais | Produto, jurídico |
| 05 | [Regras técnicas](05-regras-tecnicas.md) | Build, CSP, criptografia, tokens, armazenamento, PIN, interface | Devs |
| 06 | [Critérios de aceite](06-criterios-de-aceite.md) | Dado/Quando/Então mapeados aos testes E2E existentes e ao alvo | QA, produto |
| 07 | [Estratégia de testes](07-estrategia-de-testes.md) | Regras dos testes E2E atuais e dos testes unitários do alvo | Devs, QA |
| 08 | [Glossário](08-glossario.md) | Termos de SSI, criptografia e do domínio | Todos |
| 09 | [Legislação](09-legislacao.md) | Brasil e internacional, consolidado e atualizado com o boletim de 01/10/2026 | Jurídico, produto |
| 10 | [Cenários de uso](10-cenarios-de-uso.md) | O que dá para fazer hoje e o que depende do alvo | Produto, vendas |
| 11 | [Decisões e roteiro](11-decisoes-pendentes-e-roteiro.md) | As 13 decisões de 03/10/2026, o que elas mudam, fases, branches | Responsável pelo produto |

### Ordem de leitura sugerida

- **Visão rápida:** 00 → 10 → 08
- **Construir ou corrigir:** 01 → 05 → 02 → 04 → 06 → 07
- **Decidir o próximo passo:** 11 → 01 (seção 3) → 09

## Mapa de rastreabilidade (resumo)

| Tema | Requisitos | Regras | Critérios | Código | Testes E2E |
|---|---|---|---|---|---|
| Criar e recuperar identidade | RF-CM-01…06 | RT-10…13, RN-40 | CA-23…31, CA-46 | `src/shared/nucleo.js` | `vetores-oficiais`, `biometria` |
| PIN e tentativas | RF-CM-04, 07, 19 | RN-30…33, RT-35…39 | CA-13…15, CA-73…75 | `nucleo.js` (`unlockWithPin`, `weakPin`) | `fase1-correcoes` |
| Biometria | RF-CM-10…17 | RN-34, RN-35, RT-17, RT-18 | CA-40…59 | `nucleo.js` (`enableBio`, `unlockWithBio`) | `biometria` |
| Pedido e emissão | RF-CT-01, RF-EM-04…08 | RN-01…09, RN-50, RN-51 | CA-02, CA-03, CA-66…70, CA-83, CA-87…89 | `carteira/app.js` `askCred`; `emissor/app.js` `issue` | `criterios-de-aceite`, `dados-pessoais` |
| Recebimento | RF-CT-02 | RN-10…13 | CA-03, CA-18…20 | `carteira/app.js` `receiveCred` | `criterios-de-aceite`, `fase1-correcoes` |
| Verificação | RF-CT-06, RF-EM-09…11 | RN-14…21 | CA-04…08, CA-16, CA-17, CA-21 | `carteira/app.js` `present`; `emissor/app.js` `checkVP` | `criterios-de-aceite`, `fase1-correcoes` |
| Revogação e confiança | RF-EM-12…17 | RN-22…26 | CA-08, CA-82 | `emissor/app.js` (governança) | `criterios-de-aceite` |
| Livro de registros | RF-EM-01…03 | RN-27…29, RT-21 | CA-01, CA-11, CA-12 | `emissor/app.js` `ato`, `checkBook` | `criterios-de-aceite` |
| Backup | RF-CM-20, 21 | RN-41…44, RT-20 | CA-22, CA-76…79 | `nucleo.js` `CS.export/import` | `fase1-correcoes` |
| Dados pessoais | RF-EM-07 | RN-50…52 | CA-63…70 | `nucleo.js` `piiProblem`, `cpfOk` | `dados-pessoais` |
| Segurança da página | — | RT-03, RT-04, RT-40 | CA-32…35 | `scripts/build.js`, `pagina.html` | `seguranca` |
| PWA, offline e versão | RF-CM-24, 25, 30 | RT-07, RT-07a | CA-36…39, CA-71, CA-72 | `sw.js`, manifestos, `build.js` | `pwa`, `versao` |
| Nome do serviço | RF-CM-29 | RN-60, RT-30 | CA-60…62 | `cartorio-systekna.html` | `nome-emissor` |
| Alvo: 3 apps, QR, crachás | RF-GV-*, RF-SV-*, RF-TR-* | RN-A* | CA-A* | — | — (TU-* propostos) |

## Como manter esta documentação

1. Mudou uma regra no código → atualizar a regra (RN/RT) e o critério correspondente **no mesmo commit**.
2. Novo requisito ou regra → novo ID, sem reaproveitar números removidos.
3. Item ⬜ (alvo) só vira ✅ quando o código entrar na `main` com teste.
4. Decisão pendente resolvida → registrar a data e a escolha no documento 11 e ajustar os documentos afetados.
5. Subir a versão do `package.json` a cada publicação no Pages e citar a versão nova no cabeçalho deste README.

## Controle de versões da documentação

| Versão | Pasta | Data | Base | Mudança |
|---|---|---|---|---|
| v0 | `docs/` | 01–02/10/2026 | Código 0.6.0 + F1.1 e regras da 0.9–0.12 | Primeira documentação completa (requisitos, regras, critérios, arquitetura, legislação, cenários) |
| v1 | `docs_v1/` | 03/10/2026 | Protótipo unificado `identidade-simples.html` | Ecossistema separado em 3 aplicativos, QR, Cartão do serviço, portaria, testes unitários (numerada internamente 1.0 a 2.0) |
| **v2** | **`docs_v2/`** | **03/10/2026** | **Código 0.13.0 (`c979c1c`)** | **Consolida v0 e v1: separa atual e alvo, corrige o que não existe mais no código, registra os conflitos como decisões pendentes** |

### O que mudou da v0 e da v1 para a v2

- **Saíram do "atual"** (não estão na 0.13.0): cofre, documentos registrados, grupos, convite, agenda, conferir pessoa (📦 `bkp/avancado`); acesso, credenciamento, vários emissores, crachá CV:KEY (📦 `bkp/cracha`).
- **Corrigido:** a credencial Identidade na 0.13.0 leva `nome` **e** `kycValidado` (booleano). A regra de 02/10 que retirava o `kycValidado` está na `bkp/cracha` e voltou a ser decisão (DP-03).
- **Corrigido:** o cache do service worker agora acompanha a versão (`systekna-0.13.0`), e não mais `systekna-v3`.
- **Corrigido:** o encarregado de dados não é obrigatório para agente de pequeno porte (Res. CD/ANPD 2/2022), ao contrário do que dizia `docs_v1/10`.
- **Atualizado:** legislação com o boletim de 01/10/2026 (Decreto 12.880/2026, Lei 15.352/2026, Decreto 12.975/2026, Utah SB 275, e-ID suíça em 01/12/2026, WebAuthn L3, RFC 9901).
- **Mantido como alvo:** os 3 aplicativos da v1, com o transporte por QR, o Cartão do serviço e a portaria, todos com status ⬜.
