# 00 · Apresentação — Identidade Soberana Systekna

## Em uma frase

**A sua identidade fica com você.** Ela nasce de 12 palavras no seu celular; a Governança Systekna a aprova; cada organização dá acesso aos apps dela com um crachá digital que só você consegue usar.

## O problema

- Cada serviço pede os mesmos dados (nome, CPF, documento) e guarda em bancos que vazam.
- Para provar algo simples, entregamos dados demais.
- Golpes de "troquei de número" e "falso fornecedor" funcionam porque não dá para provar quem está do outro lado.

## A solução: três aplicativos

```
                ┌──────────────────────────────┐
                │  GOVERNANÇA SYSTEKNA (STK)   │
                │  aprova identidades          │
                │  aprova serviços (emissão)   │
                └──────┬────────────────┬──────┘
     aprovação de      │                │    aprovação de emissão
     identidade        ▼                ▼    (do serviço)
┌───────────────────────────┐    ┌───────────────────────────────┐
│ CARTEIRA                  │    │ SERVIÇOS                      │
│                           │    │ apps › funcionalidades        │
│ identidades (DID:KEY)     │───▶│ analisa o pedido de acesso    │
│ crachás (CV:KEY)          │◀───│ emite o crachá ou recusa      │
│ apresenta na portaria     │───▶│ portaria: libera ou nega      │
└───────────────────────────┘    └───────────────────────────────┘
```

1. A pessoa cria as identidades na **Carteira** (Identidade, Profissional ou Personalizada). Todas saem das mesmas 12 palavras, cada uma com um DID próprio.
2. A **Governança** aprova cada identidade.
3. Uma organização (ex.: "Meus Serviços Financeiros") pede à **Governança** a aprovação de emissão do serviço e cadastra os próprios apps (Câmbio, Taxômetro…) e as funcionalidades de cada um.
4. A pessoa lê o **Cartão do serviço** (ou o de um app), pede acesso e recebe o **crachá (CV:KEY)** com as funcionalidades liberadas, ou uma recusa com o motivo.
5. Na hora de entrar, a pessoa responde ao desafio da **portaria** com a carteira. Cópia de crachá não funciona.
6. Perdeu o aparelho? Cada app volta pelas **12 palavras** ou pelo **código de recuperação** do PDF, que traz um QR code.

## Onde estamos (1.0.0)

- Os 3 apps estão publicados e funcionam **100% no navegador**, sem servidor, inclusive offline.
- **Versão 1.0.0 (08/10/2026):** os 3 apps foram homologados (pré-aprovados) pelo responsável (ver [12-homologacao](12-homologacao.md)).
- A Carteira guarda identidades (**did:key**) e crachás (**cv:key**), cifra e abre **mensagens** e tem um **cofre de anotações**, onde cabem as mensagens cifradas.
- A Governança emite as credenciais de identidade e aprova os serviços; cada serviço emite os crachás dos seus apps.
- Proteções: PIN com espera e apagamento no 10º erro, biometria do aparelho (passkey com PRF), backup cifrado, livro de registros assinado, nenhum dado sai do aparelho sem a pessoa copiar.
- Recuperação: 12 palavras ou código STK1-…, com PDF de recuperação (QR code, código e palavras).

## Diferenciais

- **Nenhum cadastro em servidor:** os dados ficam com o titular.
- **Prova de posse a cada uso:** cópia de crachá não passa.
- **Acesso por funcionalidade:** o crachá diz exatamente o que a pessoa pode usar em cada app, sem plano nem dados pessoais.
- **Várias identidades das mesmas 12 palavras**, sem ligação entre os DIDs.
- **Funciona offline:** conferir é verificar assinaturas.
- **Padrões abertos:** W3C DID e Verifiable Credentials, JWT EdDSA, BIP39, WebAuthn.

## Limites que precisam ficar claros

- O transporte entre os apps é **copiar e colar** (QR Code entre os apps adiado; o QR existe no PDF de recuperação).
- Os apps das organizações (Câmbio etc.) **ainda não leem o crachá sozinhos**: a conferência é na Portaria do app Serviços. A integração ("Entrar com a carteira") é um próximo passo.
- A revisão de criptografia de 08/10/2026 deixou pontos abertos: a carteira ainda não fixa o DID da Governança nem confere o emissor do crachá, e o PIN de 6 dígitos é protegido só por JavaScript ([11](11-decisoes-e-roteiro.md) §4).
- O ambiente publicado é **de demonstração** (origem compartilhada no GitHub Pages): não usar para identidades reais.
- O **PDF de recuperação é uma cópia completa da conta**: imprimir e apagar o arquivo.
- As credenciais valem **entre as partes que aceitam o meio**; o sistema não tem fé pública e não substitui cartório, ICP-Brasil ou gov.br.
