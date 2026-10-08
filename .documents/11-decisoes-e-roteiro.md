# 11 · Decisões e Roteiro

## 1. Decisões tomadas

| Data | Decisão |
|---|---|
| 01/10/2026 | "Cartório Digital" passa a "Emissor de Credenciais" (sem vocabulário de fé pública) |
| 01/10/2026 | Domínio próprio adiado: GitHub Pages só como demonstração |
| 01/10/2026 | Sem recuperação por guardiões: só as 12 palavras, anotadas em papel |
| 01/10/2026 | Cofre sem cartão de pagamento |
| 02/10/2026 | "A identidade define o usuário"; toda publicação sobe a versão |
| 03/10/2026 | Main volta à versão básica (0.13.0); acesso/crachá antigos guardados em `bkp/cracha` |
| 03/10/2026 | **DP-01** Registro de emissões guardado, com nome |
| 03/10/2026 | **DP-02** Livro e revogação mantidos; validade opcional |
| 03/10/2026 | **DP-03** Identidade aprovada leva só o nome |
| 03/10/2026 | **DP-04** Só copiar e colar; QR adiado |
| 03/10/2026 | **DP-05** Envelope `SYSTEKNA:<TIPO>:<JWT>` em todo pacote |
| 03/10/2026 | **DP-06** Três apps separados |
| 03/10/2026 | **DP-07** Validade do crachá escolhida pelo serviço, limitada à aprovação |
| 03/10/2026 | **DP-08** DID da Governança pré-carregado (aguarda a STK de produção) |
| 03/10/2026 | **DP-09** Troca de chave da STK implementada |
| 03/10/2026 | **DP-10** W3C VC 1.1; os 3 apps sairiam como 1.0.0. Durante os testes as versões seguiram em 0.x; a 1.0.0 fica para o fim da homologação |
| 03/10/2026 | **DP-11** Nada externo (CSP fechada) |
| 03/10/2026 | **DP-12** Cofre em fase própria, depois |
| 03/10/2026 | **DP-13** Nomes: Carteira de Identidades Soberanas, Governança Systekna, Serviços Systekna |
| 03/10/2026 | Cada app gera o próprio DID das mesmas 12 palavras (separação de domínio); a Carteira mantém o DID de sempre |
| 03/10/2026 | Identidades: nome + perfil (Identidade, Profissional, Personalizada com nome editável), quantas quiser, todas da semente; gestão pelo menu +, não na aba Identidade |
| 03/10/2026 | Pedido de identidade leva nome e perfil; aprovação só o nome; recusa da STK só no livro; validade escolhida pela STK (padrão 1 ano) |
| 03/10/2026 | Cartão de identidade: perfil · nome · did:key com copiar · emissora + validade; cor por perfil |
| 03/10/2026 | Rodapé com o + no centro (Carteira: Credenciais · Identidade · + · Apresentar · Ajustes) |
| 03/10/2026 | Aprovação de emissão: STK pode aprovar parte dos apps; app novo pede só ele (várias aprovações ativas); pedido só com nome e apps |
| 03/10/2026 | Serviços: um cartão por app, agrupados sob a organização aprovada pela Governança |
| 03/10/2026 | Acesso a apps: pedido pela carteira a partir do Cartão do serviço, com a identidade aprovada escolhida; recusa **assinada** para o cliente; itens próprios no menu +; cartão próprio do crachá com **cv:key** |

## 2. Versões publicadas

| Versão | O que trouxe |
|---|---|
| 0.13.0 | Volta à versão básica |
| 0.14.0 | Pedido endereçado ao emissor, backup do emissor conferido, testes que faltavam |
| 0.15.0 | Governança Systekna e Serviços Systekna (credenciamento, crachá, portaria, troca de chave) |
| 0.16.0 | Um DID por app a partir das mesmas 12 palavras |
| 0.17.0 | Identidades na aba Identidade (**reprovado** e substituído) |
| 0.18.0 | Identidades com nome e perfil pelo menu + |
| 0.18.1–0.18.3 | Cartão da identidade, did:key com copiar e cores, rodapé com 5 botões |
| 0.19.0–0.19.1 | Aprovação de emissão (cenário 2) e cartão por app |
| 0.20.0 | Acesso a apps: pedir, aprovar ou recusar e usar o crachá CV:KEY |
| 0.21.0 | Cartão por app: o Serviços gera o cartão de um app só |
| 0.22.0 | Serviço › Apps › Funcionalidades: a Governança aprova só o serviço |
| **0.22.1** | **Pastas reorganizadas por projeto (`stk-*`, `compartilhado/`, `.documents/`); sem mudança nas telas** |

## 3. Branches

| Branch | Conteúdo |
|---|---|
| `main` | Versão vigente (0.22.1) |
| `bkp/avancado` | Cofre, contatos, grupos, registro de documentos (antigo) |
| `bkp/cracha` | Primeira tentativa de acesso/crachá (0.9–0.12.3), substituída |

## 4. Próximos passos

| Prioridade | Item |
|---|---|
| 1 | **Homologação** dos 3 apps pelo responsável ([12](12-homologacao.md)) |
| 2 | Atualizar os testes antigos que ainda usam telas substituídas ([07](07-testes.md) §4) |
| 3 | Criar a Governança Systekna de produção e pré-carregar o DID dela nos apps (DP-08) |
| 4 | "Entrar com a carteira": os apps das organizações aceitarem o crachá direto |
| 5 | Lista pública de revogação |
| — | Adiados: QR Code, cofre, divulgação seletiva (SD-JWT), domínio próprio |
