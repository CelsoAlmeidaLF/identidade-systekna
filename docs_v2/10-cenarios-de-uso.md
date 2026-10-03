# 10 · Cenários de Uso

> O que dá para fazer **hoje** com a versão 0.13.0 e o que depende do alvo ou de fases futuras.
> Legenda: ✅ funciona hoje · 📦 funcionava numa versão que está em branch de backup · ⬜ alvo · 💡 ideia sem plano.
> Em todos os cenários atuais o transporte é manual: copiar o texto assinado e mandar por WhatsApp ou e-mail.

## Resumo

| # | Quem | Cenário | Estado |
|---|---|---|---|
| H1 | Empresa | Dar identidade a um cliente ou colaborador | ✅ |
| H2 | Empresa | Conferir quem é a pessoa antes de uma ação sensível | ✅ |
| H3 | Empresa | Acesso por prazo para equipe e prestadores | ✅ (com limites) |
| H4 | Empresa | Trilha de auditoria do que foi emitido, verificado e revogado | ✅ |
| H5 | Empresa | Aceitar credenciais emitidas por outro emissor | ✅ (com limites) |
| H6 | Usuário | Provar quem é, sem mandar documento | ✅ |
| H7 | Usuário | Mandar um segredo cifrado para alguém | ✅ |
| H8 | Usuário | Trocar de celular sem perder nada | ✅ |
| H9 | Usuário | Desbloquear com digital ou rosto, sem PIN guardado | ✅ |
| B1 | Usuário | Cofre de senhas, notas e documentos | 📦 `bkp/avancado` |
| B2 | Usuário | Contra o golpe do "troquei de número" (agenda e conferir pessoa) | 📦 `bkp/avancado` |
| B3 | Empresa | Registrar contrato ou entrega por hash | 📦 `bkp/avancado` |
| B4 | Empresa | Grupos (Família, Clientes, Equipe) com validade própria | 📦 `bkp/avancado` |
| A1 | Empresa cliente | Portaria com crachá (academia, condomínio, evento, escritório) | ⬜ 📦 `bkp/cracha` |
| A2 | Usuário | Crachás de vários serviços na mesma carteira | ⬜ |
| A3 | Usuário | Conferir que o serviço é credenciado antes de se apresentar | ⬜ |
| A4 | Empresa | Login no portal do cliente sem senha | ⬜ (F5) |
| A5 | Empresa | Acordos, orçamentos e quitações assinados | ⬜ (F2) |

---

## 1. O que funciona hoje

**Pré-requisito da empresa:** um emissor só da empresa, com 12 palavras próprias, separado do emissor pessoal (RN-38). As 12 palavras do emissor são o ativo mais sensível: em papel, em local seguro. Fazer backup cifrado depois de cada sessão de emissões.

### H1. Dar identidade a um cliente ou colaborador ✅

1. A pessoa instala a Carteira, cria a identidade e anota as 12 palavras.
2. Na carteira: **+ → Pedir credencial**, escolhe **Identidade**, informa o nome e copia o pedido.
3. No emissor: **Emitir → Conferir pedido**. O emissor vê "Pedido conferido" (a pessoa controla aquele DID) e emite. Na Identidade, marque `kycValidado` como `true` **só** se você conferiu documentos pessoalmente; nenhum dado do documento entra na credencial.
4. A pessoa cola a credencial em **Receber credencial**.

**O que garante:** a credencial está ligada ao DID de quem pediu; ninguém mais consegue usá-la.
**Cuidado:** a credencial leva o nome (❓DP-03). Nada de CPF, RG, endereço: o emissor recusa.

### H2. Conferir quem é a pessoa antes de uma ação sensível ✅

- **Situação:** "sou o João da empresa X, troque o e-mail de acesso" ou "mande a senha do servidor".
- **Como:** no emissor, **Verificar → Gerar desafio** exigindo **Identidade**. A pessoa cola o desafio em **Apresentar** na carteira e devolve a apresentação. O emissor confere até 11 pontos.
- **O que garante:** quem apresentou é o dono da credencial, agora (cópia antiga não passa), e a credencial não foi revogada por este emissor.
- **Onde usar:** troca de dados bancários, liberação de acesso, cancelamento, envio de backup.

### H3. Acesso por prazo para equipe e prestadores ✅ (com limites)

- **Como:** emitir uma credencial **Personalizada** (ex.: `funcao: prestador`, `projeto: X`) com validade de 30 dias. Antes de passar um acesso, pedir a apresentação (H2). Quando o contrato acabar, **revogar** com o motivo "Fim do vínculo".
- **Limites:** só 30 dias, 1 ano, 5 anos ou sem validade; os sistemas da empresa ainda não leem a credencial (login é F5; crachá é o alvo A1).

### H4. Trilha de auditoria ✅

- **Painel → Ver livro completo → Conferir integridade.** Cada emissão, verificação, revogação, mudança de confiança, nome e política é um ato encadeado e assinado. Se alguém alterar um ato no armazenamento, a conferência aponta qual.
- **Onde usar:** prestação de contas a sócio, resposta a cliente ("quando foi a verificação?"), registro para a LGPD.
- **Limite:** não impede apagar o banco inteiro. Faça backup.

### H5. Aceitar credenciais de outro emissor ✅ (com limites)

- **Como:** **Governança → Emissores confiáveis → Adicionar** com o nome e o DID do outro emissor.
- **Limite:** este emissor não enxerga revogações feitas pelo outro. Por padrão a verificação é recusada; aceitar exige mudar a política **Status não verificável**, assumindo o risco.

### H6. Provar quem é, sem mandar documento ✅

- **Situação:** alguém com um emissor pede "prove que você é a Maria".
- **Como:** cole o desafio em **Apresentar**. A carteira mostra quem pede, para quê e o que exige, e só lista credenciais que servem. Mande a apresentação de volta.
- **O que garante:** vale por 5 minutos e só para aquele desafio. Nenhum documento circula.

### H7. Mandar um segredo cifrado ✅

- **Exemplos:** senha do Wi-Fi para um parente, token de API para um cliente.
- **Como:** peça a chave de cifragem da pessoa (em **Identidade → Chaves públicas**, começa com `z6LS`). Em **Mensagens → Cifrar**, cole a chave e o texto; mande o `smsg1.…` por qualquer canal. Só a carteira dela abre.
- **Limite:** prova o sigilo, não quem enviou (remetente assinado é a F4, `smsg2`).

### H8. Trocar de celular sem perder nada ✅

- **Ajustes → Copiar backup cifrado** (`scb1.…`) e guarde o texto. No aparelho novo, **Recuperar com 12 palavras** e **Restaurar backup**.
- **Sem as 12 palavras, nada se recupera.** Ninguém, nem a Systekna, guarda essas palavras.

### H9. Desbloquear com digital ou rosto ✅

- **Ajustes → Desbloqueio por biometria** (pede o PIN). Em aparelhos com PRF, a biometria abre a identidade sem digitar o PIN.
- **Usar só biometria** apaga o PIN do aparelho: um código malicioso no navegador não tem mais o que testar por força bruta. Se a biometria do aparelho mudar, a entrada é pelas 12 palavras.

---

## 2. O que existia e está guardado (📦)

Estes cenários funcionavam em versões anteriores e estão em branches de backup. **Não voltam para a main sem pedido.** Ficam aqui para registro e para o roteiro (doc 11).

| # | Cenário | Branch | O que fazia |
|---|---|---|---|
| B1 | Cofre | `bkp/avancado` | Senhas (com gerador), notas e documentos da família (titular, tipo, número, validade com aviso de vencimento), cifrados no aparelho. Sem cartão de pagamento. |
| B2 | Golpe do "troquei de número" | `bkp/avancado` | Cartão de contato `contato+jwt`, agenda e "Conferir pessoa" por desafio e resposta. |
| B3 | Registro por hash | `bkp/avancado` | O emissor guardava só o SHA-256 do arquivo e entregava um certificado; conferir dizia se mudou um byte. Prova técnica, **nunca** ata notarial. |
| B4 | Grupos | `bkp/avancado` | Uma credencial `MembroDoGrupo` por grupo, com validade do grupo e convite `emissor+jwt`. |

---

## 3. Alvo (⬜)

### A1. Portaria com crachá

- **Situação:** uma academia, condomínio ou escritório quer liberar a entrada só para quem tem crachá válido, sem guardar cadastro de ninguém.
- **Como seria:** a empresa instala o **App Serviço**, pede credenciamento à **Governança Systekna** e passa a exibir o **Cartão do serviço**. O cliente lê o cartão na carteira, confere que o serviço é credenciado e pede o crachá levando a aprovação da Governança. Na entrada, a portaria mostra um desafio em QR; a carteira responde com a prova.
- **O que garante:** cópia de crachá não funciona; crachá de outro app é negado; o serviço não consulta ninguém para conferir.
- **Experimento:** a `bkp/cracha` (0.9.0 a 0.12.3) testou credenciamento, acesso e crachá CV:KEY no mesmo app do emissor. O código foi considerado errado e retirado da main em 03/10/2026.

### A2. Crachás de vários serviços na mesma carteira

Um mesmo DID com crachá da academia, do condomínio e do trabalho. Crachá vencido é pedido de novo ao próprio serviço, sem voltar à Governança.

### A3. Conferir o serviço antes de se apresentar

A carteira só pede crachá a serviço cujo Cartão traga credenciamento válido assinado pela Governança. Protege contra serviço falso pedindo dados.

### A4. Login sem senha (F5)

"Entrar com a carteira Systekna": o portal gera o desafio, a carteira responde, o servidor confere. Exige guardar registros de acesso (Marco Civil, art. 15).

### A5. Acordos assinados (F2)

Proposta, aceite e quitação assinados pelas carteiras das duas partes, com cláusula de aceite do meio eletrônico. ⚖️

---

## 4. Cuidados em todos os cenários

- **LGPD:** credencial de cliente leva só o necessário. Nunca CPF, RG ou endereço (o emissor recusa).
- **Vocabulário:** "emissor", "credencial", "registro técnico". Nunca "cartório", "autenticação", "fé pública".
- **Ambiente:** o site publicado é **demonstração**. Para uso real com clientes, ver o plano de conformidade (doc 09, seção 5).

## Rastreabilidade

| Cenário | Requisitos |
|---|---|
| H1 | RF-CT-01, RF-CT-02, RF-EM-04…08 |
| H2, H6 | RF-EM-09…11, RF-CT-06, RF-CT-07 |
| H3 | RF-EM-06, RF-EM-17 |
| H4 | RF-EM-01…03 |
| H5 | RF-EM-14, RF-EM-15 |
| H7 | RF-CT-09…11 |
| H8 | RF-CM-05, RF-CM-20, RF-CM-21 |
| H9 | RF-CM-10…17 |
| A1…A3 | RF-CT-20…28, RF-GV-*, RF-SV-* |
| A4, A5 | RF-F-07, F2 do `plan.md` |
