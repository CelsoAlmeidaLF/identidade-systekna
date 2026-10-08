# 08 · Glossário

| Termo | Definição |
|---|---|
| **12 palavras** | Frase BIP39 que representa a semente. É a chave mestra: quem tem as palavras (ou o código de recuperação) controla as identidades |
| **Aprovação de identidade** | Credencial assinada pela Governança dizendo que uma identidade (DID) foi aprovada, com o nome e a validade |
| **Aprovação de emissão** | Credencial assinada pela Governança autorizando um serviço a emitir crachás, até certa data. Desde a 0.22 aprova o serviço, sem lista de apps. Um serviço pode ter várias |
| **App** | Aplicativo, serviço ou ferramenta de um serviço, cadastrado por ele em Serviço › Apps (ex.: Câmbio, Taxômetro). É o que o crachá protege |
| **Apresentar** | Responder a um desafio com uma credencial, assinando pelo DID dela (prova de posse) |
| **Backup cifrado (`scb1`)** | Cópia dos dados do app que só abre com as 12 palavras da mesma identidade, no mesmo app |
| **Biometria (PRF)** | Desbloqueio por digital ou rosto, em que o chip do aparelho libera o segredo que abre a identidade |
| **Cartão (na tela)** | Representação visual de uma credencial: perfil ou tipo, nome, did:key/cv:key, emissor e validade |
| **Cartão do serviço** | Pacote público assinado pelo serviço com o nome, os apps, o catálogo (funcionalidades e grupos) e a aprovação de emissão; a carteira o lê para pedir acesso |
| **Cartão do app** | O mesmo que o Cartão do serviço, com um app só; sai ao tocar no cartão do app no Painel do Serviços |
| **Catálogo** | Os apps do serviço, cada um com as funcionalidades e os grupos dele |
| **Código de recuperação** | `STK1-XXXX-…`: as 12 palavras escritas de forma curta, com o idioma e uma conferência. Recupera a mesma conta |
| **Carteira de Identidades Soberanas** | App da pessoa: identidades, crachás, pedidos e apresentação |
| **Cofre** | Parte da aba Identidade da Carteira que guarda anotações de texto, cifradas no aparelho |
| **Crachá (CV:KEY)** | Credencial de acesso a um app, emitida pelo serviço para uma identidade aprovada. Leva o serviço, o app, os códigos das funcionalidades liberadas e a aprovação de emissão do serviço |
| **cv:key** | Identificador do crachá: `cv:key:z…`, o número único do crachá em base58 |
| **Desafio** | Número aleatório de uso único (10 minutos) que quem verifica pede para a carteira assinar |
| **DID / did:key** | Identificador descentralizado; no `did:key`, o identificador é a própria chave pública Ed25519 |
| **Domínio de derivação** | Prefixo do rótulo do HKDF que faz as mesmas 12 palavras gerarem DIDs diferentes por app (`governanca/`, `servicos/`) e por identidade (`perfil/<n>/`) |
| **Funcionalidade** | Parte de um app (módulo, micro-serviço ou ferramenta), com nome e código. O código vai no crachá quando liberada |
| **Grupo** | Conjunto de funcionalidades de um app, usado só como atalho para liberar várias de uma vez. Não vai no crachá |
| **Envelope** | Formato `SYSTEKNA:<TIPO>:<JWT>` de todo pacote copiado entre os apps |
| **Governança Systekna (STK)** | App da Systekna, raiz de confiança: aprova identidades e serviços (aprovação de emissão) |
| **Identidade** | Um DID da carteira com nome e perfil. Perfis: Identidade, Profissional, Personalizada |
| **Livro de registros** | Sequência de atos encadeados e assinados (aprovações, recusas, revogações, conferências) |
| **Organização / Serviço** | Quem constrói e opera os apps e dá o acesso (a organização ou o desenvolvedor, ex.: Meus Serviços Financeiros). Usa o app Serviços |
| **PDF de recuperação** | Página A4 com o QR code do código de recuperação, o código, as 12 palavras e o DID. Cópia completa da conta: imprimir e apagar o arquivo |
| **Pedido** | Pacote assinado por quem pede (pessoa ou serviço), de uso único, válido por 7 dias |
| **Perfil** | Tipo da identidade: Identidade, Profissional ou Personalizada (com nome do perfil, ex.: Clube) |
| **PIN** | Senha local de 6 dígitos que abre o app no aparelho |
| **Portaria** | Função do app Serviços que gera o desafio de um app ou de uma funcionalidade e confere a prova: Acesso liberado ou negado |
| **Prova** | Resposta assinada da carteira ao desafio (`vp+jwt`), válida por 5 minutos |
| **Recusa** | Negativa com motivo. Na STK fica só no livro; no Serviço vai assinada para o cliente e aparece na carteira |
| **Revogação** | Cancelamento irreversível de uma credencial por quem a emitiu, com motivo |
| **Serviços Systekna (SRV)** | App das organizações: aprovação de emissão, apps e funcionalidades, cartões, análise de pedidos de acesso, crachás e portaria |
| **Troca de chave** | Passagem da Governança para uma chave nova, com aviso assinado pelas duas chaves |
| **Validade** | Período em que a credencial vale; a do crachá nunca passa a da aprovação de emissão do serviço |

## Siglas

| Sigla | Significado |
|---|---|
| STK | Governança Systekna |
| SRV | Serviço (organização que usa o app Serviços) |
| RF / RNF / RN / RT / CA | Requisito funcional / não funcional / regra de negócio / regra técnica / critério de aceite |
| ADR | Registro de decisão de arquitetura |
