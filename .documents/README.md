# Documentação — Identidade Soberana Systekna

> **Versão da documentação:** v4 · 08/10/2026 · Responsável: Celso de Almeida Leite Filho (Systekna)
> **Código de referência:** branch `main`, versão **1.1.0**, publicada no GitHub Pages.
> **Situação:** os 3 apps foram **homologados (pré-aprovados)** pelo responsável na **1.0.0**.
> **Substitui:** `docs/` (v0), `docs_v1/` (v1) e `docs_v2/` (v2), que ficam no histórico do git.

## O ecossistema

| App | Arquivo | Quem usa | Para quê |
|---|---|---|---|
| **Carteira de Identidades Soberanas** | `carteira-systekna.html` | Qualquer pessoa | Guarda as identidades (DID:KEY) e os crachás (CV:KEY); pede aprovação e acesso; apresenta |
| **Governança Systekna (STK)** | `governanca-systekna.html` | Equipe Systekna | Aprova identidades e aprova os serviços que emitem crachás |
| **Serviços Systekna (SRV)** | `servicos-systekna.html` | Cada organização | Pede aprovação de emissão, cadastra apps e funcionalidades, analisa pedidos de acesso, emite crachás e confere na portaria |

Nos 3 apps, a conta se recupera pelas 12 palavras ou pelo código de recuperação STK1-…, e há um PDF de recuperação com QR code.

Site: <https://celsoalmeidalf.github.io/identidade-systekna/> · Repositório: <https://github.com/CelsoAlmeidaLF/identidade-systekna>

## Documentos

| # | Documento | Conteúdo |
|---|---|---|
| 00 | [Apresentação](00-apresentacao.md) | O produto em uma página |
| 01 | [Arquitetura](01-arquitetura.md) | Apps, módulos, derivação de chaves, artefatos, fluxos, dados, implantação, decisões de arquitetura |
| 02 | [Requisitos funcionais](02-requisitos-funcionais.md) | Tudo o que cada app faz, com situação de aprovação |
| 03 | [Requisitos não funcionais](03-requisitos-nao-funcionais.md) | Segurança, privacidade, padrões, desempenho, offline, usabilidade, qualidade |
| 04 | [Regras de negócio](04-regras-de-negocio.md) | Identidades, aprovação, emissão, acesso, revogação, livro, PIN, backup, dados pessoais |
| 05 | [Regras técnicas](05-regras-tecnicas.md) | Build, CSP, criptografia, derivação, tokens, envelope, cv:key, armazenamento |
| 06 | [Critérios de aceite](06-criterios-de-aceite.md) | Critérios por cenário e os testes automatizados que os cobrem |
| 07 | [Testes](07-testes.md) | Como rodar, arquivos de teste, regras, pendências da suíte |
| 08 | [Glossário](08-glossario.md) | Termos do domínio e técnicos |
| 09 | [Legislação](09-legislacao.md) | Brasil e internacional (sem mudança de conteúdo desde a v2) |
| 10 | [Manual de uso](10-manual-de-uso.md) | Passo a passo de cada cenário nas telas, para uso e homologação |
| 11 | [Decisões e roteiro](11-decisoes-e-roteiro.md) | Todas as decisões tomadas, histórico de versões e próximos passos |
| 12 | [Homologação](12-homologacao.md) | Checklist do que foi aprovado e do que falta homologar |
| 13 | [Sprint da primeira entrega](13-sprint-primeira-entrega.md) | Papéis dos 3 apps, entregas E-01 a E-08, limites aceitos e o que fica para a F5 |
| 14 | [Planejamento e Scrum: gestão, relatórios e cofre](14-sprint-gestao-e-relatorios.md) | Sprints 2 e 3: relatório de uso, exportar o livro, cofre da carteira |
| — | [`plan.md`](plan.md) e [`identidade-soberana-systekna-arquitetura.md`](identidade-soberana-systekna-arquitetura.md) | **Históricos** (plano em fases e arquitetura da época da carteira + emissor); não descrevem a versão atual |

### Ordem de leitura sugerida

- **Visão geral:** 00 → 13 → 10 → 12
- **Desenvolver:** 01 → 05 → 04 → 02 → 06 → 07
- **Decidir:** 11 → 09

## Legenda de situação (todos os documentos)

| Símbolo | Significado |
|---|---|
| ✅ | Implementado, com teste automatizado, **aprovado** pelo responsável nos primeiros testes |
| 🟢 | Implementado e com teste automatizado; ainda não revisado pelo responsável |
| 🟡 | Implementado, sem teste automatizado |
| ⬜ | Planejado, não construído |
| ⏸ | Adiado ou descartado por decisão |
| 📦 | Existe só em branch de backup (`bkp/avancado`, `bkp/cracha`) |

## Como manter

1. Mudou o código → atualizar a regra (RN/RT), o requisito e o critério no mesmo commit.
2. Novo requisito ou regra → novo ID; números removidos não são reaproveitados.
3. Toda publicação no Pages sobe a versão do `package.json`; o cabeçalho deste README cita a versão vigente.
4. Fluxo de entrega combinado com o responsável: plano antes de mudança de desenho → implementar → testar só o que mudou → merge com versão nova se passar → só informar, sem corrigir, se falhar.

## Histórico da documentação

| Versão | Pasta | Data | Base |
|---|---|---|---|
| v0 | `docs/` (só no histórico do git desde a 0.22.1) | 01–02/10/2026 | Código 0.6.0 |
| v1 | `docs_v1/` | 03/10/2026 | Alvo de 3 apps (protótipo) |
| v2 | `docs_v2/` (só no histórico do git desde a 0.22.1) | 03/10/2026 | Código 0.13.0 (atual + alvo) |
| v3 | `.documents/` | 03/10/2026 | Código 0.20.0: os 3 apps construídos e aprovados nos primeiros testes |
| v3.1 | `.documents/` | 08/10/2026 | Código 0.23.0: cartão do app, Serviço › Apps › Funcionalidades, pastas por projeto, recuperação com código e PDF |
| **v4** | **`.documents/`** | **08/10/2026** | **Código 1.0.0: os 3 apps homologados; mensagens cifradas, cofre de anotações, revisão de criptografia** |
