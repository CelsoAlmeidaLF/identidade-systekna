# 08 · Glossário

> **(alvo)** = termo do ecossistema de 3 apps, ainda não construído. **(📦)** = existe só em branch de backup.

| Termo | Definição |
|---|---|
| **12 palavras** | Frase de recuperação BIP39 que representa os 128 bits de entropia da identidade. É a chave mestra: quem tem as palavras tem a identidade. |
| **AAD** | *Additional Authenticated Data*. Dado extra autenticado pelo AES-GCM sem ser cifrado; amarra cada cifragem ao seu contexto (`pin`, `device`, `bio`, `backup`, `state`, `id` do item). |
| **AES-256-GCM** | Cifra simétrica autenticada usada para todos os dados em repouso. Esconde os dados e detecta qualquer alteração. |
| **Afirmação (claim)** | Par campo/valor dentro da credencial (ex.: `nome`, `kycValidado`). |
| **Âncora de confiança** | (alvo) DID conhecido por todos (o da Governança) a partir do qual se confere a cadeia. |
| **APP** | (alvo) Aplicação protegida por um serviço, que exige crachá (ex.: APP X). Não confundir com o objeto `APP` do código, que é o contrato de cada serviço. |
| **App Serviço (SRV)** | (alvo) Aplicativo 3: cada empresa pede credenciamento, emite crachás e confere o acesso na portaria. |
| **Apresentação (VP)** | Token `vp+jwt` em que o titular embrulha uma credencial e assina junto com o desafio do verificador, provando a posse naquele momento. |
| **Aprovação da Governança** | (alvo) Documento assinado pela Governança dizendo que um DID é aprovado e até quando. Fica só com o usuário. Hoje o papel equivalente é a credencial Identidade. |
| **Assinatura digital** | Prova matemática de que um conteúdo foi produzido por quem tem a chave privada e não foi alterado. |
| **Ato** | Entrada do livro de registros do emissor: `{n, at, act, text, ref, prev, hash, sig}`. |
| **Autenticador de plataforma** | Chip ou sistema de segurança do próprio aparelho (Touch ID, Face ID, Windows Hello, Android) usado pela WebAuthn. |
| **Backup (`scb1`)** | Texto `scb1.<iv>.<ct>` com os dados do serviço cifrados pela chave do cofre; só abre com as 12 palavras da mesma identidade, no mesmo serviço. |
| **base58btc / multibase** | Codificação usada no `did:key`; o prefixo `z` indica base58btc. |
| **base64url** | Base64 sem `=` no fim, com `-` e `_`; usada em JWT e nos registros cifrados. |
| **Biometria (PRF)** | Desbloqueio por digital ou rosto em que o autenticador entrega um segredo (extensão PRF) que abre a cópia da entropia. |
| **BIP39** | Padrão que converte entropia em palavras de uma lista de 2048, com checksum, e deriva a semente por PBKDF2-SHA512. |
| **Bloqueio automático** | Fechamento da sessão após X minutos sem atividade (1, 3, 5, 10 ou 30). |
| **Cadeado (`lock` / `bioLock`)** | Registro que guarda a entropia cifrada em duas camadas, pelo PIN ou pela biometria. |
| **Carteira** | Serviço do titular: guarda a identidade e as credenciais e cifra mensagens. No alvo, guarda também a aprovação e os crachás. |
| **Cartão do serviço** | (alvo) QR público do App Serviço com DID, nome, escopo e credenciamento, para a carteira conferir o serviço antes de pedir crachá. |
| **Chave do aparelho** | Chave AES gerada pelo navegador, não exportável, guardada no IndexedDB; camada interna dos cadeados. Amarra os dados ao aparelho. |
| **Chave privada / pública** | A privada assina e nunca sai do aparelho; a pública, que vai dentro do DID, permite conferir as assinaturas. |
| **Confiança transitiva** | Confiar em quem o outro confia. O sistema **não** faz isso: cada emissor escolhe os seus confiáveis. |
| **Contador de tentativas (`guard`)** | `{fails, until}`: erros seguidos de PIN e o instante até o qual nova tentativa é bloqueada. |
| **Crachá** | (alvo, 📦) Credencial assinada por um serviço que dá acesso a um app. Fica com o usuário. Na `bkp/cracha` foi chamado de CV:KEY. |
| **Credenciamento** | (alvo, 📦) Credencial assinada pela Governança que autoriza um serviço a emitir crachás para um escopo. |
| **Credencial (VC)** | Token `vc+jwt` em que um emissor afirma algo sobre um DID. Tipos na 0.13.0: Identidade e Personalizada. |
| **`credentialStatus`** | Campo da credencial com o número dela no registro de status do emissor, usado para revogar. |
| **CSP** | *Content Security Policy*. Política da página que só deixa rodar o script com o hash conhecido e nada de fora do site. |
| **Desafio** | Token `desafio+jwt` com nonce aleatório, gerado pelo verificador; vale 10 minutos e uma única vez. No alvo, gerado pela portaria. |
| **DID** | *Decentralized Identifier*. Identificador controlado pelo titular; aqui, `did:key:z6Mk…`. |
| **`did:key`** | Método DID em que o identificador **é** a chave pública Ed25519. Dispensa consulta a servidor. |
| **`did:web` / `did:webvh`** | Métodos DID resolvidos por um domínio web; evolução possível para emissores. |
| **Documento DID** | JSON que descreve as chaves do DID (verificação Ed25519 e acordo de chaves X25519). |
| **Ed25519 / EdDSA** | Algoritmo de assinatura usado em DID, JWT e livro; `EdDSA` é o valor de `alg` nos JWT. |
| **Emissor confiável** | O próprio emissor ou um DID da lista de confiança dele. |
| **Emissor de Credenciais** | Serviço que emite, verifica e revoga credenciais e mantém o livro. Antes se chamava "Cartório Digital" (nome abandonado: sugere fé pública). |
| **Entropia** | 16 bytes aleatórios dos quais toda a identidade é derivada. |
| **Envelope** | (alvo) Formato de transporte `SYSTEKNA:<TIPO>:<JWT>`, mostrado como QR ou texto. |
| **Escopo** | (alvo) Lista de apps para os quais um serviço pode emitir crachás. |
| **Governança Systekna (STK)** | (alvo) Aplicativo 2: raiz de confiança que aprova identidades e credencia serviços. Hoje, o Emissor de Credenciais da Systekna faz a parte de aprovar identidades. |
| **HKDF** | Função de derivação de chaves (RFC 5869) que gera Ed25519, X25519 e AES a partir da semente. |
| **HSM** | Equipamento que guarda chaves sem deixá-las sair; recomendado em produção para a chave do emissor. |
| **Identidade (credencial)** | Tipo de credencial que diz quem é o titular. Na 0.13.0 leva `nome` e `kycValidado`. |
| **IndexedDB** | Banco do navegador onde cada serviço guarda seus dados (store `kv`). |
| **`jti`** | Identificador único da credencial (`urn:uuid:…`). |
| **JWT** | *JSON Web Token*: `cabeçalho.conteúdo.assinatura` em base64url. |
| **`kid`** | Identificador da chave no cabeçalho do JWT: `<did>#<chave multibase>`. |
| **KYC** | "Conheça seu cliente": conferência de quem é a pessoa. Não existe na versão básica; `kycValidado` só diz sim ou não. |
| **`kycValidado`** | Afirmação booleana da credencial Identidade: o emissor diz se conferiu os documentos. Os dados conferidos nunca entram. Padrão `false`. |
| **LGPD** | Lei Geral de Proteção de Dados (Lei 13.709/2018). |
| **Livro de registros** | Sequência de atos encadeados por hash e assinados pelo emissor; detecta adulteração. |
| **Mensagem cifrada (`smsg1`)** | Texto cifrado para uma chave X25519 com chave efêmera, HKDF e AES-GCM. |
| **Minimização** | Usar só o dado estritamente necessário (LGPD, art. 6º, III). |
| **`nbf` / `exp` / `iat`** | Início da validade, vencimento e emissão do token, em segundos Unix. |
| **Nonce** | Valor aleatório de uso único (pedido e desafio) que impede repetição. |
| **Passkey** | Credencial WebAuthn guardada no autenticador do aparelho. |
| **PBKDF2** | Derivação lenta de chave a partir de senha: SHA-512 com 2048 iterações (semente BIP39) e SHA-256 com 600.000 (PIN). |
| **Pedido** | Token `pedido+jwt` assinado pela carteira; prova que o titular controla o DID. |
| **Personalizada (credencial)** | Tipo de credencial com campos livres definidos pelo emissor. |
| **PIN** | Senha local de 6 dígitos que destrava a entropia neste aparelho. Não é a chave mestra. |
| **PIN fraco** | Dígitos repetidos, sequências ou padrões repetidos; recusado. |
| **Política de status não verificável** | Escolha do emissor entre recusar (padrão) ou aceitar credenciais de outros emissores cuja revogação ele não consegue conferir. |
| **Portaria** | (alvo) Função do App Serviço que gera desafios e confere crachás na hora do acesso. |
| **PRF** | Extensão WebAuthn *pseudo-random function*: o autenticador devolve um segredo fixo por credencial e sal, depois de verificar o usuário. |
| **Prova de posse** | Desafio assinado que mostra que quem apresenta é o dono do DID. Hoje é a apresentação (`vp+jwt`). |
| **PWA** | *Progressive Web App*: site instalável, com manifesto e service worker, que funciona offline. |
| **QR Code** | (alvo) Meio principal de troca de pacotes entre aparelhos. |
| **Revogação** | Cancelamento irreversível de uma credencial pelo emissor, com motivo no livro. Hoje só vale nas verificações do próprio emissor. |
| **SD-JWT** | Divulgação seletiva em JWT (RFC 9901): mostrar só parte das afirmações. Evolução prevista. |
| **Semente (seed)** | 64 bytes derivados das 12 palavras, origem de todas as chaves. |
| **Service worker (`sw.js`)** | Script que guarda o site em cache para uso offline. O nome do cache acompanha a versão. |
| **Sessão (`ses`)** | Estado em memória com as chaves abertas; apagado ao bloquear. |
| **SHA-256** | Função de hash usada no livro, no checksum BIP39 e na CSP. |
| **SHTTPS** | (v1) Servidor local usado no celular para servir os HTML em `localhost`. |
| **Só biometria** | Modo em que o PIN é apagado do aparelho e só a biometria (ou as 12 palavras) abre a identidade. |
| **SSI** | *Self-Sovereign Identity*: identidade controlada pelo próprio titular, sem autoridade central guardando as chaves. |
| **Status List (Bitstring)** | Padrão W3C para publicar o estado de revogação; evolução possível. |
| **Titular (holder)** | Pessoa dona da identidade e das credenciais. |
| **`typ`** | Campo do cabeçalho JWT que diz o tipo do token; cada etapa exige o seu. |
| **Validade** | Período em que a credencial vale (`nbf` a `exp`). No alvo, substitui a revogação. |
| **Verificador** | Quem confere uma apresentação. Hoje é o próprio emissor; no alvo, a portaria do serviço. |
| **Versão** | Número `x.y.z` do `package.json`, mostrado nos apps; sobe a cada publicação. |
| **X25519** | Algoritmo de acordo de chaves usado nas mensagens cifradas. |

## Siglas da documentação

| Sigla | Significado |
|---|---|
| RF | Requisito funcional (`CM` comum, `CT` carteira, `EM` emissor, `TR` transporte, `GV` Governança, `SV` App Serviço, `F` futuro) |
| RNF | Requisito não funcional |
| RT / RT-A | Regra técnica atual / do alvo |
| RN / RN-A | Regra de negócio atual / do alvo |
| CA / CA-P / CA-A | Critério de aceite automatizado / proposto / do alvo |
| RTE / RTU / TU | Regra de teste E2E / regra de teste unitário / caso de teste unitário |
| DP | Decisão pendente (doc 11) |
| ADR | Registro de decisão de arquitetura |
| STK / SRV | Governança Systekna / cada serviço que usa o App Serviço |
