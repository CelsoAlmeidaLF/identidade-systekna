# 13 · Sprint da Primeira Entrega

> **Versão de referência:** 0.23.0 · 08/10/2026 (sprint aberta em 03/10/2026, na 0.20.0) · Responsável: Celso de Almeida Leite Filho (Systekna)
> **Finalidade:** os 3 apps são para **testes** (prova de conceito). **Não serão usados em produção.**
> **Objetivo da sprint:** provar o ciclo completo de confiança entre Governança, Serviços e Carteira, do pedido de identidade até o acesso a um app com crachá.

## 1. Papéis dos 3 apps

| App | Aprova / emite | Também faz |
|---|---|---|
| **Governança (STK)** | Aprova **identidades** (DID:KEY) · aprova a **emissão de crachás** de cada serviço (desde a 0.22, o serviço, sem apps) | Verifica credenciais apresentadas · revoga o que emitiu · livro assinado |
| **Serviços (SRV)** | Cadastra os **apps e funcionalidades** dele · aprova ou recusa **pedidos de acesso** e emite o **crachá (CV:KEY)** de cada app, com as funcionalidades liberadas | Confere o acesso na **Portaria** · revoga crachás · livro assinado |
| **Carteira** | — | Pede identidade · pede crachá de acesso · guarda várias identidades · apresenta identidade ou crachá a quem verifica |

```
Carteira ──pedido de identidade──▶ Governança ──Identidade──▶ Carteira
Serviços ──pedido de emissão────▶ Governança ──aprovação do serviço──▶ Serviços (Serviço › Apps › Funcionalidades)
Carteira ──pedido de acesso (leva a Identidade)──▶ Serviços ──crachá CV:KEY ou recusa──▶ Carteira
Serviços (Portaria) ──desafio──▶ Carteira ──prova assinada──▶ Serviços: Acesso liberado / negado
```

## 2. Entregas da sprint

| # | Entrega | Apps | Requisitos | Homologação | Situação |
|---|---|---|---|---|---|
| E-01 | **Governança aprova identidades:** recebe o pedido assinado, aprova com validade ou recusa com motivo | Carteira + STK | RF-GV-03, 04, 06, 07 · RF-CT-13, 14, 15 | H-04 · R-02, R-03 | ✅ Aprovado (0.18.3) |
| E-02 | **Governança aprova serviços:** na 0.19, por app (aprovação parcial); desde a 0.22, o serviço, que cadastra os próprios apps e funcionalidades | Serviços + STK | RF-GV-05, 07 · RF-SV-03, 04, 05, 13 | H-06, H-07, H-10 · R-05, R-06 | ✅ Aprovado (0.19.0–0.19.1); 0.22 falta homologar |
| E-03 | **Serviços aprova credenciais para os seus apps:** analisa o pedido, emite um crachá por app com as funcionalidades liberadas (validade limitada à aprovação) ou recusa assinada | Serviços | RF-SV-07, 08, 09, 11 | H-08, H-10 · R-08 | ✅ Aprovado (0.20.0); funcionalidades (0.22) falta homologar |
| E-04 | **Carteira solicita uma identidade:** escolhe ou cria a identidade (nome e perfil) e recebe a aprovação no cartão certo | Carteira | RF-CT-10 a 16, 20, 21 | H-03, H-04, H-05 · R-02, R-04 | ✅ Aprovado (0.18.3) |
| E-05 | **Carteira solicita uma credencial de acesso:** lê o Cartão do serviço ou do app, confere a Governança, escolhe apps e identidade; recebe o crachá ou a recusa | Carteira | RF-CT-22, 23, 30, 31, 32, 34 | H-08, H-09 · R-07, R-09 | ✅ Aprovado (0.20.0); Cartão do app (0.21) falta homologar |
| E-06 | **Carteira acessa apps com suas credenciais:** responde ao desafio da Portaria com o crachá; app errado, funcionalidade não liberada ou crachá revogado é negado | Carteira + Serviços | RF-CT-33 · RF-SV-10 | R-10 a R-13 | ✅ Aprovado (0.20.0), **pela Portaria** (ver §3) |
| E-07 | **Carteira utiliza suas identidades:** várias identidades das mesmas 12 palavras, cada uma com DID próprio; apresenta a Identidade a quem verifica | Carteira + STK | RF-CT-10, 33 · RF-GV-08 | H-02, H-03 | ✅ Aprovado (0.18.3) |

| E-08 | **Recuperar pelo código ou pelas 12 palavras, com PDF:** código STK1-…, PDF com QR, código e palavras, leitura do QR pela câmera | Todos | RF-CM-02, 12, 13, 14 | H-12 · R-17, R-18 | ✅ Aprovado (0.23.0) |

Base comum a todas as entregas: 12 palavras, PIN, biometria, backup e um DID por app (RF-CM-01 a 11; H-01, H-02; R-14 a R-16).

## 3. Limites aceitos nesta sprint

| Limite | Por que é aceito |
|---|---|
| "Acessar apps" acontece na **Portaria do App Serviços**, copiando e colando; nenhum app externo lê o crachá | Prova o ciclo de acesso; login direto em apps é a F5 |
| Transporte por copiar e colar, sem QR entre os apps | QR adiado (RF-F-03); o QR existe só no PDF de recuperação |
| Revogação conferida só dentro do App Serviços | Lista pública é a RF-F-04 |
| DID da Governança informado à mão | Não há Governança de produção (RF-F-01) |
| Dados só no aparelho, sem servidor | Apps de teste; não são produção |

## 4. Fora desta sprint: "Entrar com a carteira" (F5)

Ainda **não existe app que use** o login com a carteira. Quando for retomado, para fins de teste, a proposta é:

| Etapa | Entrega | Teste E2E |
|---|---|---|
| F5.1 | Verificador extraído da conferência da Portaria + a **origem** do site dentro da prova | Desafio reutilizado e origem errada são recusados |
| F5.2 | Popup + `postMessage` e um app de exemplo estático no Pages | Login completo; crachá de outro app é negado |
| F5.3 | Lista de revogação assinada, publicada à mão | Crachá revogado é negado |

Lacunas conhecidas que a F5 resolve: a carteira não confere se quem pede a apresentação é credenciado e a prova não leva a origem do site (risco de site intermediário na web). Exigências de produção (Marco Civil art. 15, LGPD, sessão endurecida, vínculo de DID novo à conta) ficam fora, porque os apps não são de produção.

## 5. Critério de encerramento da sprint

A sprint fecha quando o roteiro R-01 a R-18 de [12 · Homologação](12-homologacao.md) estiver marcado e os itens E-01 a E-08 seguirem aprovados na versão homologada.
