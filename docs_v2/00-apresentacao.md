# 00 · Apresentação — Identidade Soberana Systekna

## A ideia em uma frase

**A sua identidade fica com você.** Ela nasce de 12 palavras no seu celular, as credenciais ficam cifradas no aparelho e cada uso é provado na hora, sem servidor guardando os seus dados.

## O problema

- Cada serviço pede os mesmos dados: nome, CPF, endereço, foto do documento.
- Esses dados ficam espalhados em dezenas de bancos, e cada banco é um ponto de vazamento.
- Para provar algo simples, entregamos muito mais do que o necessário.
- Golpes como "troquei de número" ou "falso fornecedor" funcionam porque não há como provar quem está do outro lado.

## A solução

Um modelo de **identidade autossoberana (SSI)**, com padrões abertos (W3C DID e Verifiable Credentials, JWT EdDSA):

1. A pessoa cria a identidade na **Carteira**. As chaves saem de 12 palavras que só ela tem.
2. Um **emissor** confere um pedido assinado pela carteira e assina uma credencial para aquele DID.
3. A credencial fica **cifrada no aparelho** da pessoa, não no emissor.
4. Para usar, a pessoa responde a um **desafio novo** do verificador. Uma cópia antiga não passa.

## Onde estamos (versão 0.13.0, publicada)

Dois aplicativos web instaláveis, que rodam 100% no navegador e funcionam sem internet depois da primeira visita:

| App | Para quem | O que faz hoje |
|---|---|---|
| **Carteira de Identidade** | O titular | Cria e recupera a identidade, pede, recebe, guarda e apresenta credenciais, cifra e decifra mensagens |
| **Emissor de Credenciais** | Quem emite e verifica | Emite credenciais, gera desafios, confere apresentações, revoga, mantém lista de emissores confiáveis e um livro de registros encadeado e assinado |

Proteções já entregues: PIN de 6 dígitos com espera crescente e apagamento no 10º erro, desbloqueio por biometria do aparelho (passkey com PRF), modo "só biometria", backup cifrado, página com CSP restritiva e nenhuma requisição para fora do site. São 90 testes automatizados passando.

**Ambiente de demonstração:** os apps estão no GitHub Pages, numa origem compartilhada. Não devem receber identidades reais nem dados de clientes.

## Para onde vamos (alvo)

O alvo, descrito na v1 da documentação, separa o ecossistema em **3 aplicativos**:

| App | Para quem | Papel |
|---|---|---|
| **1. Carteira** | Qualquer pessoa | Guarda a identidade, a aprovação da Governança e os crachás de todos os serviços |
| **2. Governança Systekna (STK)** | Equipe Systekna | Aprova identidades e credencia serviços |
| **3. App Serviço (SRV)** | Qualquer empresa | Pede credenciamento, emite crachás para clientes com carteira e confere o acesso na portaria |

Com transporte por **QR Code** entre aparelhos e um **Cartão do serviço** público, que a carteira confere antes de se apresentar.

Esse alvo ainda tem pontos em aberto que conflitam com o que já existe (livro de registros, revogação, nome na credencial, QR Code). Eles estão no [documento 11](11-decisoes-pendentes-e-roteiro.md) e precisam de decisão antes da construção.

## Diferenciais

- **Nenhum servidor com cadastro de pessoas:** os dados ficam com o titular.
- **Funciona offline:** verificar é conferir assinaturas.
- **Prova de posse a cada uso:** cópia de credencial não funciona.
- **Recuperável pelo dono:** as 12 palavras recriam a identidade em outro aparelho.
- **Padrões abertos:** os mesmos que o gov.br, a Suíça, Utah e a União Europeia estão adotando.
- **Visual Systekna Aero 2.0**, claro e escuro, pensado para o celular.

## Modelo de negócio possível (alvo)

| Quem | Paga por |
|---|---|
| Pessoa | Nada: a carteira é gratuita |
| Empresa (App Serviço) | Credenciamento anual pela Governança, por escopo |
| Systekna | Opera a Governança e certifica serviços |

## Tecnologia

Ed25519 · X25519 · AES-256-GCM · BIP39 · HKDF-SHA256 · PBKDF2 · W3C DID (`did:key`) · W3C VC 1.1 em JWT EdDSA · WebAuthn PRF · WebCrypto · PWA · HTML único por app, sem dependências em tempo de execução.

## Limites que precisam ficar claros

- As credenciais valem **entre as partes que aceitam o meio** (MP 2.200-2/2001, art. 10, § 2º). Não substituem ICP-Brasil, gov.br nem cartório.
- O serviço **não tem fé pública**: por isso o nome é "Emissor de Credenciais", e nunca "cartório".
- A revogação hoje só é visível para o próprio emissor que revogou.
- Perdeu as 12 palavras e o aparelho, perdeu a identidade. Ninguém, nem a Systekna, consegue recuperar.
