# 14 · Planejamento e Scrum — Gestão, relatórios e cofre

> **Versão de referência:** 0.23.0 · 08/10/2026 · Responsável (Product Owner): Celso de Almeida Leite Filho (Systekna)
> **Situação:** Sprint 2 **entregue** (0.24.0 e 0.25.0). Sprint 3: **US-22.1, 22.2, 22.3, 22.6 e 22.7 entregues na 0.26.0** (aguardando homologação). Próximo: documentos com anexo (US-22.4) e backup com anexos (US-22.5) na 0.27.0.
> **Finalidade:** os 3 apps continuam sendo de **teste** (prova de conceito), como na [13](13-sprint-primeira-entrega.md).

## 1. Objetivo

Dar à organização e à Governança **visão e prestação de contas** do que acontece nos apps, e dar à pessoa um **cofre** na carteira para guardar senhas, notas e documentos, sem servidor e sem nada sair do aparelho.

| Item | Melhoria | App | Versão prevista |
|---|---|---|---|
| 20 | Painel de uso no Serviços | Serviços | 0.24.0 |
| 21 | Exportar o livro em PDF ou planilha | Governança e Serviços | 0.25.0 |
| 22 | Cofre (senhas, notas e documentos) | Carteira | 0.26.0 e 0.27.0 |

## 2. Como trabalhamos (Scrum adaptado)

| Papel ou rito | Como funciona aqui |
|---|---|
| **Product Owner** | O responsável: descreve o cenário ("Eu como / quero"), aprova o plano e homologa no celular |
| **Time de desenvolvimento** | Claude: planeja, implementa, testa e publica |
| **Sprint** | Por escopo, não por calendário: termina quando as histórias dela são homologadas |
| **Planning** | Este documento. Nada é implementado antes de o PO aprovar o plano da sprint |
| **Incremento** | Cada história fechada vira uma **versão nova** no GitHub Pages (PR + merge), com o número no rodapé |
| **Review** | O PO testa a versão no celular e responde "aprovado" ou o que mudar |
| **Retrospectiva** | Ao fim de cada sprint: o que funcionou, o que mudar no processo; vira decisão na [11](11-decisoes-e-roteiro.md) |
| **Daily** | Não se aplica (time de uma pessoa); o status vai em cada resposta |

### Definition of Ready (história pronta para começar)
- Cenário escrito e entendido; dúvidas da §7 respondidas; critérios de aceite definidos; plano aprovado pelo PO.

### Definition of Done (história pronta para homologar)
1. Código em `stk-*/src` ou `compartilhado/src`; `npm run build:check` em dia.
2. Teste E2E novo do que mudou, passando; testes afetados rodados (só a falha antiga conhecida é aceita).
3. Nenhuma violação de CSP; nada carregado de fora; nenhum dado pessoal novo em credencial.
4. Versão nova no `package.json`, PR, merge e Pages conferido (os 3 apps com o número novo).
5. Documentação atualizada no mesmo PR: requisitos (02), regras (04/05), critérios (06), manual (10), versões (11), homologação (12).

### Estimativa
Pontos de história em Fibonacci (1, 2, 3, 5, 8, 13). Referência: a recuperação com código e PDF (0.23.0) valeu **8**.

## 3. Product Backlog

| ID | História | Item | Pontos | Prioridade |
|---|---|---|---|---|
| US-20.1 | Como **serviço**, quero ver quantos acessos foram **liberados e negados por dia** para acompanhar o uso | 20 | 3 | 1 |
| US-20.2 | Como **serviço**, quero ver os acessos **por app e por funcionalidade** para saber o que é mais usado | 20 | 3 | 2 |
| US-20.3 | Como **serviço**, quero ver **por que** os acessos foram negados (crachá revogado, app errado, funcionalidade não liberada…) | 20 | 2 | 3 |
| US-20.4 | Como **serviço**, quero ver no mesmo período a **gestão**: crachás emitidos, pedidos recusados e crachás revogados (relatório de log) | 20 | 1 | 3 |
| US-21.1 | Como **Governança ou serviço**, quero **exportar o livro em Excel (.xlsx)** para auditar fora do app | 21 | 3 | 4 |
| US-21.2 | Como **Governança ou serviço**, quero **exportar o livro em PDF**, com a conferência de integridade, para prestar contas | 21 | 5 | 5 |
| US-21.3 | Como **auditor**, quero escolher o **período** do que é exportado | 21 | 1 | 6 |
| US-22.1 | Como **pessoa**, quero **guardar senhas** na carteira (site, usuário, senha, nota), cifradas | 22 | 3 | 7 |
| US-22.2 | Como **pessoa**, quero **guardar anotações** cifradas | 22 | 2 | 8 |
| US-22.6 | Como **pessoa**, quero **guardar cartões** (tipo a confirmar em D-7) | 22 | 3 | 12 |
| US-22.7 | Como **pessoa**, quero **guardar outros tipos** de item (lista a confirmar em D-8) | 22 | 3 | 13 |
| US-22.3 | Como **pessoa**, quero **buscar** no cofre e **copiar** uma senha sem mostrá-la na tela | 22 | 2 | 9 |
| US-22.4 | Como **pessoa**, quero **guardar documentos** (tipo, número, titular, validade, foto ou PDF) com **aviso de vencimento** | 22 | 8 | 10 |
| US-22.5 | Como **pessoa**, quero que o cofre volte pelo **backup cifrado** e pelas 12 palavras + backup em outro aparelho | 22 | 2 | 11 |

**Total:** 41 pontos.

## 4. Sprints

### Sprint 2 — Gestão e relatórios (0.24.0 e 0.25.0) · 18 pontos

**Meta:** o serviço enxerga o uso dos apps e a Governança e o serviço prestam contas do livro.

| História | Tarefas | Pontos |
|---|---|---|
| **US-20.1** Acessos por dia | T1. Guardar cada conferência da Portaria de forma estruturada em `st.acessos` ({quando, app, funcionalidade, liberado, motivo}), além do ato no livro · T2. Ler as conferências antigas a partir do texto do livro (atos `verificacao`), para o painel não começar vazio · T3. Seção **Uso** no Painel: 7 e 30 dias, barras por dia (liberados e negados), sem biblioteca externa · T4. Teste E2E: 3 liberados e 2 negados aparecem no dia certo | 3 |
| **US-20.2** Por app e funcionalidade | T5. Ranking por app e por funcionalidade (contagem e %) · T6. Filtro por app · T7. Teste E2E com 2 apps e funcionalidades | 3 |
| **US-20.4** Gestão no período | T10a. Contar emissões, recusas e revogações do período a partir do livro · T10b. Linha de resumo no painel · T10c. Teste E2E | 1 |
| **US-20.3** Motivos de negação | T8. Guardar o primeiro ponto que falhou na conferência · T9. Lista "Por que negou" com contagem · T10. Teste E2E: crachá revogado e funcionalidade não liberada aparecem como motivo | 2 |
| *Incremento 0.24.0* | T11. Versão, build, PR, merge, Pages; docs 02, 04, 06, 10, 11, 12 | — |
| **US-21.1** Livro em planilha | T12. Ajustes → **Exportar livro** (Governança e Serviços), pede PIN, escolha **PDF ou Excel** · T13. Arquivo **.xlsx** escrito no aparelho, sem biblioteca (planilha com cabeçalho fixo e colunas: nº, data e hora, ato, texto, referência, hash, assinatura) · T14. Teste E2E: o Excel abre, tem todas as linhas e confere com o livro | 3 |
| **US-21.2** Livro em PDF | T15. Generalizar o escritor de PDF da 0.23 para **várias páginas** e quebra de linha · T16. Capa: nome e DID do emissor, período, total de atos e **resultado da conferência de integridade** · T17. Tabela dos atos, com o hash curto · T18. Teste E2E: PDF válido, com todas as páginas, e o livro adulterado sai marcado como "não confere" | 5 |
| **US-21.3** Período | T19. Escolher período (tudo, 30 dias, mês, intervalo) para o CSV e o PDF · T20. Teste E2E | 1 |
| *Incremento 0.25.0* | T21. Versão, build, PR, merge, Pages; docs | — |

**Riscos da Sprint 2:** conferências feitas antes da 0.24 só têm o texto do livro (sem o motivo da negação); o painel mostra essas como "motivo não registrado".

### Sprint 3 — Cofre da carteira (0.26.0 e 0.27.0) · 23 pontos

**Meta:** a pessoa guarda senhas, notas e documentos na carteira, cifrados, e recupera tudo pelo backup.

**Base:** o cofre da branch `bkp/avancado` (versão 0.6), que será **reaproveitado como referência**, não copiado: a carteira atual tem outra estrutura (identidades, crachás, menu +).

| História | Tarefas | Pontos |
|---|---|---|
| **US-22.1** Senhas | T1. Tipo de item `senha` em `items` (cada item cifrado com AAD = id, como as credenciais) · T2. Seção **Cofre** na aba Identidade (D-3) com lista e **+ Novo item** · T3. ~~Gerador de senha~~ (D-6: só guardar) · T4. Teste E2E: criar, editar, apagar com confirmação, bloquear e reabrir | 5 |
| **US-22.2** Notas | T5. Tipo `nota` (título e texto) · T6. Teste E2E | 2 |
| **US-22.3** Buscar e copiar | T7. Busca por título e site · T8. Senha velada; **Copiar** sem mostrar e área de transferência limpa depois de 30 s · T9. Teste E2E | 2 |
| **US-22.6 / 22.7** Cartões e outros tipos | T10a. Tipos definidos em D-7 e D-8, com os campos de cada um · T10b. Teste E2E | 6 |
| *Incremento 0.26.0* | T10. Versão, build, PR, merge, Pages; docs | — |
| **US-22.4** Documentos | T11. Tipo `documento`: tipo (RG, CNH, passaporte, outro), número, titular, emissão, validade · T12. Anexo de **foto ou PDF** (até 2 MB, cifrado no aparelho) · T13. Aviso de vencimento (30 dias antes) na tela Credenciais · T14. Teste E2E: anexo abre igual depois de bloquear e reabrir | 8 |
| **US-22.5** Backup | T15. O backup cifrado leva o cofre, inclusive os anexos; restaurar em outro aparelho traz tudo · T16. Teste E2E com 12 palavras + backup | 2 |
| *Incremento 0.27.0* | T17. Versão, build, PR, merge, Pages; docs | — |

**Riscos da Sprint 3:** anexos aumentam o tamanho do backup (texto para copiar e colar fica grande); se for o caso, o backup passa a ser **baixado como arquivo**. Documentos com CPF e RG ficam **só no cofre da pessoa**, nunca em credencial (RN-70 continua valendo).

## 5. Critérios de aceite (resumo)

| CA | Critério |
|---|---|
| CA-100 | **Dado** conferências na Portaria, **quando** abre o Painel, **então** vê liberados e negados por dia (7 e 30 dias), por app, por funcionalidade e os motivos de negação |
| CA-101 | O painel conta também as conferências antigas, lidas do livro |
| CA-102 | **Quando** exporta o livro (com PIN), **então** recebe o PDF ou o Excel (.xlsx) com todos os atos do período, e o PDF mostra se o livro confere |
| CA-103 | Livro adulterado sai no PDF como "não confere", com o primeiro ato que falhou |
| CA-104 | Senhas, notas e documentos ficam cifrados; sem PIN ou biometria nada aparece |
| CA-105 | A senha é copiada sem aparecer na tela; a área de transferência é limpa |
| CA-106 | Documento perto de vencer gera aviso; o anexo abre igual ao original |
| CA-107 | O backup restaurado em outro aparelho (12 palavras + backup) traz todo o cofre |

## 6. Ordem e marcos

| Ordem | Entrega | Versão | Depende de |
|---|---|---|---|
| 1 | Painel de uso (US-20.1 a 20.3) | 0.24.0 | Aprovação deste plano |
| 2 | Exportar livro (US-21.1 a 21.3) | 0.25.0 | — (reaproveita o PDF da 0.23) |
| 3 | Cofre: senhas, anotações, cartões e outros (US-22.1 a 22.3, 22.6, 22.7) | 0.26.0 | Respostas D-7 e D-8 |
| 4 | Cofre: documentos e backup (US-22.4, 22.5) | 0.27.0 | 0.26.0 homologada |

## 7. Decisões que o PO precisa tomar antes de começar

| # | Pergunta | Sugestão |
|---|---|---|
| D-1 | O painel conta só os **acessos da Portaria** ou também emissões, recusas e revogações? | ✅ **Decidido:** os dois, como **relatório de log**: acessos (liberados, negados, motivos) e gestão (emissões, recusas, revogações) no período |
| D-2 | Exportar o livro: **CSV, PDF ou os dois**? Na Governança e no Serviços? | ✅ **Decidido:** nos dois apps, em **PDF ou Excel (.xlsx)**, à escolha na hora de exportar |
| D-3 | Onde fica o **cofre** na Carteira? (o rodapé já tem 5 botões) | ✅ **Decidido:** dentro da aba **Identidade** (o rodapé não muda) |
| D-4 | O cofre aceita **anexos** (foto/PDF)? | ✅ **Decidido:** sim, até 2 MB por documento |
| D-5 | O cofre fica **só na Carteira** ou também na Governança e no Serviços? | ✅ **Decidido:** só na Carteira |
| D-6 | Senhas: só guardar ou também **gerar**? | ✅ **Decidido:** só **guardar** (sem gerador). Tipos: senhas, anotações, documentos, cartões e outros |
| D-7 | **Cartões** são de pagamento (crédito/débito)? A decisão de 01/10/2026 foi "cofre sem cartão de pagamento" | ✅ **Decidido:** sim, crédito e débito, e também outros cartões |
| D-8 | Quais são os **outros** tipos ("…")? | ✅ **Decidido:** conta bancária e textos ou anotações |
