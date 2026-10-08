# 09 · Legislação — Brasil e internacional

> **Não é parecer jurídico.** Mapeamento técnico para orientar o projeto. Pontos com ⚖️ precisam de advogado antes do uso comercial.
> Situação considerada: outubro de 2026. Conteúdo trazido da v2 (`docs_v2/09`), que consolidou `docs/09`, o boletim de 01/10/2026 e `docs_v1/10` e `11`. Sem pesquisa nova nesta versão.
> Fontes: as da v0 e do boletim têm link (seção 6). As que vieram só da v1 estão marcadas **[v1, sem fonte]** e precisam ser conferidas antes de citar externamente.

## 1. Resumo executivo

1. **No Brasil, o sistema é legal como está**, no campo **privado e consensual**. Assinaturas e credenciais valem entre as partes que aceitam o meio (MP 2.200-2/2001, art. 10, § 2º; CPC, art. 411, II; Código Civil, art. 107). Não substituem ICP-Brasil, gov.br nem cartório quando a lei exige forma específica.
2. **Uso familiar e pessoal está fora da LGPD** (art. 4º, I). **Uso com clientes da Systekna está dentro**: a Systekna é controladora. Como agente de pequeno porte, pode ser dispensada de indicar encarregado, mas precisa de canal com o titular (Res. CD/ANPD 2/2022). ⚖️
3. **O DID deve ser tratado como dado pessoal pseudonimizado** quando o emissor sabe quem está por trás dele.
4. **Não usar vocabulário nem papel de cartório**: fé pública, atas, reconhecimento de firma e autenticação são exclusivos dos tabeliães (CF, art. 236; Lei 8.935/1994).
5. **O mundo está indo na mesma direção do projeto:** Suíça (e-ID em 01/12/2026), Utah (SB 275, em vigor desde 06/05/2026), União Europeia (carteira EUDI até 24/12/2026), Buenos Aires (QuarkID), Butão. O padrão comum: credenciais verificáveis, carteira no aparelho, sem banco central, divulgação seletiva.
6. **Lacunas do sistema** frente a esses modelos: divulgação seletiva (SD-JWT), protocolo padrão (OpenID4VC), DID resolvível e revogação consultável por terceiros. Não impedem o uso privado, mas impedem interoperar com carteiras oficiais.

## 2. Brasil

### 2.1 Mapa de normas

| Norma | Tema | Impacto no projeto | Nível |
|---|---|---|---|
| CF, art. 5º, LXXIX | Proteção de dados como direito fundamental | Reforça o desenho com o mínimo de dados | Alto |
| Lei 13.709/2018 (LGPD) | Proteção de dados pessoais | DID pode ser dado pessoal; minimização é central | **Alto** |
| Lei 15.352/2026 | Transforma a ANPD em agência reguladora | ANPD fiscaliza LGPD e ECA Digital | Alto |
| Lei 12.965/2014 (Marco Civil) e Decreto 12.975/2026 | Uso da internet, guarda de registros | Afeta serviços com servidor (login, App Serviço online) | **Alto** quando houver servidor |
| MP 2.200-2/2001 | Validade de documentos eletrônicos | Assinaturas fora da ICP valem se aceitas pelas partes | Médio |
| Lei 14.063/2020 | Níveis de assinatura eletrônica | A da carteira chega, no máximo, a "avançada" | Médio |
| CPC, art. 411, II, e Código Civil, art. 107 | Prova e forma dos atos | Documento eletrônico é prova; forma livre salvo exceção legal | Médio |
| Lei 15.211/2025 (ECA Digital) e Decreto 12.880/2026 | Proteção de crianças e adolescentes online | Verificação de idade confiável; autodeclaração proibida | Médio |
| Lei 14.534/2023 e Decreto 10.977/2022 **[v1, sem fonte]** | CPF como número único; Carteira de Identidade Nacional | Fonte oficial para a Governança conferir a pessoa sem guardar | Médio |
| CF, art. 236, e Lei 8.935/1994 | Serviços notariais e de registro | Proíbe se apresentar como cartório | **Alto** |
| Lei 8.078/1990 (CDC) **[v1, sem fonte]** | Relação de consumo | Informar com clareza o que o sistema faz e não faz | Médio |
| Lei 9.613/1998 | Prevenção à lavagem de dinheiro | Só se o usuário for "pessoa obrigada" (banco, câmbio, imóveis…) | Condicional |

### 2.2 Validade das assinaturas e credenciais

| Norma | O que diz | Impacto |
|---|---|---|
| **MP 2.200-2/2001, art. 10, § 2º** | A ICP-Brasil não exclui outros meios de comprovar autoria e integridade, **desde que admitidos pelas partes** ou aceitos por quem recebe. | Base legal das assinaturas Ed25519. A cláusula "as partes aceitam este meio eletrônico" é obrigatória em contrato. |
| **Lei 14.063/2020** | Assinatura simples, avançada e qualificada (ICP-Brasil). Rege interações **com entes públicos**. | A da carteira chega, no máximo, a **avançada**, e só se a ligação DID-pessoa for bem conferida. Não serve onde o poder público exige qualificada. |
| **CPC, art. 411, II** | Documento é autêntico quando a autoria estiver identificada por qualquer meio legal de certificação, inclusive eletrônico. | Em juízo, a assinatura da carteira é prova válida. A força depende de mostrar o mecanismo (DID, chave, livro). |
| **Código Civil, art. 107** | Liberdade de forma, salvo exigência legal. | Acordos e recibos podem ser eletrônicos. Exceções: escrituras de imóveis acima do teto (art. 108), testamentos públicos etc. |
| **Jurisprudência (STJ e tribunais)** | Reconhece assinaturas eletrônicas fora da ICP-Brasil quando aceitas pelas partes. | ⚖️ Guardar evidências: livro, hash, aceite expresso do meio. |

### 2.3 LGPD

**O DID é dado pessoal?** Sozinho, não revela a pessoa. Mas quando um emissor aprova a pessoa por trás dele, ou um serviço o associa a acessos, ele vira **dado pessoal pseudonimizado**. O projeto reduz muito o risco, mas não fica fora da lei.

| Situação | Regra | Como aplicar |
|---|---|---|
| Uso familiar e entre amigos | **Art. 4º, I**: a LGPD não se aplica a pessoa natural, para fins exclusivamente particulares e não econômicos. | Emissor pessoal fora da LGPD enquanto não houver finalidade econômica. |
| Clientes da Systekna | A Systekna é **controladora**: base legal (art. 7º; contrato é a mais natural), finalidade, minimização e direitos do titular. | Credencial de cliente com o mínimo (RN-52). O registro de emissões do emissor (com nomes) é tratamento de dados da Systekna. |
| Agente de pequeno porte | **Res. CD/ANPD 2/2022**: ME, EPP e startups **não são obrigadas** a indicar encarregado, mas mantêm canal com o titular. | **Corrige `docs_v1/10`**, que dava o encarregado como obrigatório. ⚖️ Confirmar o enquadramento (porte, dados sensíveis, larga escala tiram o benefício). |
| Papéis no alvo | Cada empresa do App Serviço é **controladora** dos dados do próprio serviço; a Systekna é controladora no papel de Governança. | Termos de credenciamento devem dizer isso. ⚖️ |
| Conferência da pessoa pela Governança (alvo) | Mesmo sem guardar, olhar um documento é tratamento. | Política de descarte imediato. ❓DP-01 |
| Dados sensíveis e biometria | Art. 11. | A biometria **não é tratada** pela Systekna: fica no chip do aparelho (WebAuthn). Manter assim. |
| Direitos do titular (art. 18) | Acesso, correção, exclusão. | Facilitados: os dados estão com o titular; "Apagar tudo" faz a exclusão local. |
| Arquitetura | Privacidade desde a concepção (art. 46, § 2º). | Ponto forte do desenho. |
| Relatório de impacto (art. 38) | Recomendado antes de operar com clientes. | Plano de conformidade, item 2. |
| Incidentes (art. 48) | Comunicar incidentes relevantes. | Plano para comprometimento da chave do emissor ou da Governança. |
| Crianças e adolescentes (art. 14) | Melhor interesse. | Ver ECA Digital. |

### 2.4 Marco Civil da Internet

- **Art. 15:** provedor de aplicação pessoa jurídica com fins econômicos guarda **registros de acesso** (data, hora, IP) por **6 meses**, em sigilo.
- **Decreto 12.975/2026** (20/05/2026) atualiza a regulamentação, com fiscalização da ANPD; segundo fonte secundária, inclui a **porta lógica de origem** nos registros. ⚖️ Confirmar no texto.
- **Hoje (sem servidor) não se aplica.** Passa a valer quando houver login (F5) ou App Serviço operando como aplicação na internet.
- **Ação:** separar "dados de identidade" (nunca guardados) de "registros de acesso" (guardados conforme a lei). Troca só por QR entre aparelhos não gera registro de conexão naquele ato.

### 2.5 ECA Digital

- **Lei 15.211/2025**, em vigor desde **17/03/2026**, regulamentada pelo **Decreto 12.880/2026** (18/03/2026).
- Exige **verificação de idade confiável** em plataformas com conteúdo impróprio a menores; **autodeclaração é proibida**; os dados só servem a essa finalidade.
- ANPD: orientações preliminares (20/03/2026), proposta de guia em consulta (maio a 09/07/2026), Perguntas e Respostas (30/07/2026). O **guia definitivo não estava publicado** na página da ANPD em 01/10/2026 (fontes secundárias divergem). Fiscalização com multa a partir de **jan/2027**.
- **Impacto:** a 0.20.0 **não tem** credencial de maioridade (saiu em 02/10/2026). Se voltar, só vale como mecanismo confiável se o emissor **conferiu documento**, e até sair o guia definitivo deve ficar em **uso privado**. ⚖️

### 2.6 O que **não** podemos fazer: atividade notarial

| Norma | O que diz | Impacto |
|---|---|---|
| **CF, art. 236; Lei 8.935/1994, arts. 3º, 6º e 7º** | Notários e registradores têm **fé pública** por delegação. Só o tabelião faz escrituras, procurações públicas, testamentos, atas notariais, reconhecimento de firma e autenticação de cópias. | O emissor **não pode** se apresentar como cartório nem dizer que "autentica", "reconhece firma", "lavra" ou dá "fé pública". |
| **Provimento CNJ 100/2020 → Código Nacional de Normas (Provimento 149/2023)** | Atos notariais eletrônicos só pelo **e-Notariado**. | Se o cliente precisar de fé pública, o caminho é o e-Notariado. |

A troca de "Cartório Digital" para "Emissor de Credenciais" (ADR-10) segue essa regra.

### 2.7 Outras normas

- **CDC:** informar com clareza a ausência de revogação pública, os limites da verificação e a responsabilidade do usuário pelas 12 palavras. **[v1, sem fonte]**
- **Lei 9.613/1998, art. 9º:** o dever de identificar clientes e comunicar ao COAF vale só para **pessoas obrigadas**. Se a Systekna não for uma delas, KYC é voluntário. Se o ecossistema for usado como KYC por instituição financeira, a instituição precisa **guardar** dados, o que conflita com "nada em servidor" e exigiria fluxo próprio.
- **ICP-Brasil e gov.br:** atos com o poder público exigem assinatura qualificada ou gov.br no nível pedido. A carteira não substitui.

### 2.8 Iniciativas brasileiras na mesma linha

- **gov.br + CPQD:** acordo de 2 anos (anunciado em nov/2024) para pilotar identidade digital descentralizada com credenciais verificáveis. Sem resultado público encontrado em 01/10/2026.
- **CPQD (Funttel/Finep):** projeto de 36 meses (dez/2025 a 2028) com credenciais verificáveis contra *spoofing* em chamadas — mesmo problema do golpe "troquei de número".
- **RNP / ILIADA:** credenciais verificáveis para diplomas e identidade acadêmica.
- **Brasil–Índia (MGI + IIIT-B):** infraestrutura pública de credenciais verificáveis.

O padrão do projeto (W3C VC + DID) é o mesmo que o governo brasileiro está testando.

### 2.9 Como a Systekna pode atuar no Brasil

| Uso | Pode? | Condições |
|---|---|---|
| Família e amigos (emissor pessoal) | ✅ | Fora da LGPD (art. 4º, I); sem fins econômicos. |
| Identidade de cliente e conferência de quem fala | ✅ | Base contratual, dados mínimos, canal com o titular, termos de uso, política de privacidade. |
| Acordos, orçamentos e quitações assinados | ✅ | Cláusula expressa de aceite do meio eletrônico. ⚖️ |
| Credencial de maioridade para terceiros | ⚠️ | Só se o emissor conferir documento e após o guia da ANPD. ⚖️ |
| Login e App Serviço com servidor | ✅ | Guarda de registros (Marco Civil, art. 15, e Decreto 12.975/2026). ⚖️ |
| KYC lacrado | ⚠️ | Voluntário se a Systekna não for pessoa obrigada; LGPD plena. ⚖️ |
| Substituir cartório, ICP-Brasil ou gov.br | ❌ | Vedado onde a forma é exigida. |

## 3. Internacional

### 3.1 Panorama

| Jurisdição | Norma principal | Modelo | Proximidade |
|---|---|---|---|
| União Europeia | Regulamento (UE) 2024/1183 (eIDAS 2.0) + GDPR | Carteira EUDI do cidadão, credenciais verificáveis | **Muito alta** |
| Suíça | Lei Federal da e-ID | e-ID estatal, dados descentralizados na carteira swiyu | **Muito alta** |
| EUA — Utah | SB 260 (2025) → **SB 275 (2026)** | Identidade digital endossada pelo Estado (SEDI) | Alta |
| EUA — Wyoming | SF0039 (2021) | Identidade digital pessoal sob domínio da pessoa | Média |
| EUA — federal | ESIGN, UETA, NIST SP 800-63-4 **[v1, sem fonte]** | Mercado privado + diretrizes técnicas | Média |
| Reino Unido | Data (Use and Access) Act 2025 + UK GDPR **[v1, sem fonte]** | Serviços de verificação certificados num *trust framework* | Alta |
| Canadá | PIPEDA + Pan-Canadian Trust Framework **[v1, sem fonte]** | *Trust framework* público-privado | Alta |
| Austrália | Digital ID Act 2024 **[v1, sem fonte]** | Provedores credenciados, uso voluntário | Alta |
| Nova Zelândia | Digital Identity Services Trust Framework Act 2023 **[v1, sem fonte]** | Provedores credenciados | Alta |
| Argentina | QuarkID (Buenos Aires); Decreto 743/2024 e Res. SICyT 11/2025 | SSI municipal; firma digital remota | Alta |
| Butão | National Digital Identity Act (2023) | Identidade nacional SSI | Alta |
| Liechtenstein | TVTG (2020) | Regula o prestador de identidade TT | Média |
| Honduras — Próspera | ZEDE | e-Residency; ZEDEs declaradas inconstitucionais em 20/09/2024 | Baixa (instável) |

### 3.2 União Europeia

- **eIDAS 2.0** em vigor desde 20/05/2024. Cada Estado deve oferecer a carteira EUDI até **24/12/2026**; bancos, saúde, telecom e grandes plataformas devem aceitá-la a partir do fim de 2027.
- A ENISA disse que, no início de 2026, nenhuma carteira EUDI estava implantada ou certificada; nem todos os Estados devem cumprir o prazo.
- Princípios: controle do usuário, divulgação seletiva, uso voluntário e gratuito, proibição de rastrear transações.
- **Diferenças para o projeto:** certificação da carteira, níveis de garantia e **mecanismo de revogação**.
- **GDPR:** minimização (art. 5(1)(c)), proteção desde a concepção (art. 25), avaliação de impacto para alto risco (art. 35), apagamento (art. 17). Identificadores persistentes como o DID são dados pessoais quando associáveis a alguém.
- Padrão técnico que deve virar referência mundial: SD-JWT VC, mdoc, OpenID4VP.

### 3.3 Suíça

- Lei da e-ID aprovada em referendo em **28/09/2025** (50,39%); a versão de 2021, com empresas privadas emitindo, foi rejeitada (64% contra).
- **Início em 01/12/2026**, carteira **swiyu**, uso voluntário e gratuito.
- Exige privacidade desde a concepção, minimização, armazenamento descentralizado no celular e comunicação direta entre emissor, titular e verificador. O emissor não sabe onde a credencial é usada.
- Medidas extras (25/02/2026): só provedores autorizados consultam o número AHV, registro público de pedidos de dados, alerta na carteira e E-ID **tecnicamente não vinculável** (várias E-IDs por pessoa).
- Padrões: OpenID4VC, SD-JWT, `did:webvh`.
- **Lição:** é o modelo oficial mais próximo do nosso; o que falta no projeto é exatamente o que eles usam.

### 3.4 Estados Unidos

- **Utah SB 260 (27/03/2025):** "o Estado não estabelece a identidade de uma pessoa", só a reconhece. Proíbe vigilância e exigir o aparelho da pessoa.
- **Utah SB 275 (2026), em vigor desde 06/05/2026:** lei do SEDI com carta de direitos e requisitos técnicos. O **guia de implementação** (maio/2026) cita W3C VC, SD-JWT VC, mdoc, OpenID4VP e DID; exige divulgação seletiva e não vinculação; **proíbe "phone-home"** (rastrear uso sem consentimento). Casa com o princípio "o emissor não sabe onde a credencial é usada".
- **Wyoming SF0039 (01/07/2021):** identidade digital pessoal "de, por e para" a pessoa natural, sob seu domínio; atos feitos por ela são atribuídos à pessoa. Base conceitual para dizer, em contrato, que um ato assinado pela carteira "é da pessoa".
- **Federal [v1, sem fonte]:** ESIGN e UETA dão às assinaturas eletrônicas o mesmo valor das físicas, com consentimento. NIST SP 800-63-4 define níveis IAL, AAL e FAL; um PIN de 6 dígitos sem hardware seguro não atende os níveis mais altos. Carteiras de motorista móveis seguem ISO/IEC 18013-5.

### 3.5 Outros

- **Reino Unido, Canadá, Austrália, Nova Zelândia [v1, sem fonte]:** todos seguem o modelo de *trust framework* com provedores certificados ou credenciados, uso voluntário e salvaguardas de privacidade. Para operar lá como provedor de verificação, a Governança precisaria de certificação.
- **Argentina:** QuarkID (desde 22/10/2024) integrado ao miBA, mais de 3,6 milhões de usuários, DIDs ancorados na ZKsync, código aberto. O governo federal permitiu verificar identidade à distância para emitir firma digital.
- **Butão:** primeiro país com identidade nacional SSI (W3C VC), com compartilhamento por consentimento.
- **Liechtenstein:** regula o **prestador** (registro na FMA), não proíbe a tecnologia.
- **Próspera:** sem estabilidade jurídica; não convém basear o produto nela.

### 3.6 Comparativo

| Característica | Suíça | Utah | Buenos Aires | Butão | UE | **Systekna 0.20.0** |
|---|---|---|---|---|---|---|
| Carteira no aparelho, sem banco central | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Uso voluntário | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| W3C Verifiable Credentials | ✅ (SD-JWT VC) | ✅ (guia) | ✅ | ✅ | ✅ | ✅ (JWT VC 1.1) |
| Divulgação seletiva | ✅ | ✅ exigida | ✅ (ZK) | — | ✅ | ❌ |
| Protocolo padrão de troca | OpenID4VC | OpenID4VP | aberto | — | OpenID4VP | ❌ copiar e colar |
| DID resolvível do emissor | `did:webvh` | DID | ancorado em L2 | — | — | ❌ `did:key` |
| Revogação consultável por terceiros | ✅ | — | — | — | ✅ | ❌ |
| Emissor não sabe onde a credencial é usada | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Biometria só no aparelho | — | — | — | ⚠️ | — | ✅ (WebAuthn PRF) |

"—" = não confirmado.

### 3.7 Padrões técnicos

| Padrão | Organização | Situação (out/2026) | Uso no projeto |
|---|---|---|---|
| DID Core 1.0 / DID 1.1 | W3C | 1.0 Recommendation; 1.1 Candidate Recommendation (05/03/2026) | `did:key` já usado |
| DID Resolution v1 | W3C | Candidate Recommendation (06/08/2026) | Para `did:web`, se adotado |
| VC Data Model 2.0 + VC-JOSE-COSE | W3C | Recommendation (15/05/2025) | Hoje VC 1.1 ❓DP-10 |
| WebAuthn Level 3 (com PRF) | W3C | Recommendation (25/08/2026) | Biometria já usa |
| SD-JWT | IETF | RFC 9901 | Divulgação seletiva (futuro) |
| SD-JWT VC | IETF | Rascunho -19 (31/08/2026), no IESG | Acompanhar |
| OpenID4VP 1.0 / OpenID4VCI 1.0 / HAIP 1.0 | OpenID Foundation | Final (2025) | Mirar quando sair do copiar e colar |
| ISO/IEC 18013-5 e 18013-7 | ISO | — | Referência de carteira de motorista móvel |
| BIP39 | Comunidade Bitcoin | — | Já usado |

### 3.8 Lacunas frente a esses regimes

| Lacuna | Exigida por | Ação sugerida |
|---|---|---|
| Revogação consultável | eIDAS 2.0, *trust frameworks* | Lista pública de status com hashes, sem dados pessoais, ou validade curta (❓DP-02) |
| Certificação da carteira e do emissor | eIDAS 2.0, Reino Unido, Austrália, NZ | Avaliar na expansão internacional |
| Níveis de garantia | eIDAS 2.0, NIST 800-63-4 | Classificar a conferência feita pela Governança |
| Hardware seguro para chaves e PIN | Níveis altos | Secure Enclave, Keystore, HSM |
| Divulgação seletiva | eIDAS 2.0, Suíça, Utah | SD-JWT quando houver atributos |
| Formato padronizado | Todos | VC 2.0 + OpenID4VC |

## 4. Segurança: alerta do boletim

**Pass-the-Passkey** (SpecterOps, ago/2026; CVE-2026-34348, corrigida pela Microsoft em 14/07/2026): replay de asserções WebAuthn gravadas no log do Windows / Entra ID. Reforça o desenho: nonce de uso único **no verificador**, `aud` e prazo curto; nunca registrar asserções completas em logs próprios.

## 5. Plano de conformidade

| # | Ação | Responsável | Quando |
|---|---|---|---|
| 1 | Base legal, política de privacidade, termos de uso e canal com o titular | Systekna + jurídico | Antes de qualquer piloto com clientes |
| 2 | Relatório de impacto à proteção de dados | Systekna | Antes do piloto |
| 3 | Cláusula de aceite do meio eletrônico nos contratos (MP 2.200-2, art. 10, § 2º) | Jurídico | Antes do primeiro contrato |
| 4 | Conferência da pessoa pela Governança via CIN/gov.br, com descarte imediato | Arquitetura | Com o alvo (❓DP-01) |
| 5 | Separar dados de identidade de registros de acesso (Marco Civil, Decreto 12.975/2026) | Arquitetura | Quando houver servidor |
| 6 | Termos de credenciamento para empresas do App Serviço (papéis LGPD, escopo, validade) | Systekna + jurídico | Antes do primeiro serviço credenciado |
| 7 | Encarregado: avaliar se a Systekna é agente de pequeno porte; manter canal com o titular de qualquer forma | Systekna | Antes do piloto |
| 8 | Plano de incidente para comprometimento de chaves | Segurança | Antes do piloto |
| 9 | Acompanhar ECA Digital (guia definitivo, multa em jan/2027) e a consulta da ANPD sobre fiscalização | Jurídico | Contínuo |
| 10 | Nunca usar "cartório" ou vocabulário notarial em material externo | Produto | Sempre |

### Pontos para advogado ⚖️

- Se uma credencial de maioridade emitida pelo Emissor de Credenciais pode ser aceita por terceiros como "mecanismo confiável" e com que responsabilidades.
- O alcance do Decreto 12.975/2026 sobre um futuro login ou App Serviço operado pela Systekna.
- Enquadramento da Systekna como agente de pequeno porte.
- Responsabilidade da Governança ao aprovar identidades que serviços de terceiros vão aceitar.

## 6. Fontes

**Brasil**
- [TJDFT — assinatura eletrônica com certificado não ICP-Brasil](https://www.tjdft.jus.br/consultas/jurisprudencia/jurisprudencia-em-temas/jurisprudencia-em-detalhes/contratos/assinatura-eletronica-2013-certificado-privado-nao-emitido-pela-icp-brasil-2013-validade)
- [STJ valida assinaturas de plataformas não credenciadas na ICP-Brasil (LH Law)](https://www.lhlaw.com.br/publicacoes/stj-valida-assinaturas-eletronicas-emitidas-por-plataformas-nao-credenciadas-na-icp-brasil/)
- [MP 2.200-2, art. 10, § 2º (Jusbrasil)](https://www.jusbrasil.com.br/topicos/11335111/paragrafo-2-artigo-10-da-medida-provisoria-n-2200-2-de-24-de-agosto-de-2001)
- [Lei 14.063/2020 na prática (Bry)](https://www.bry.com.br/blog/lei-documentos-governo)
- [Art. 411 do CPC (Migalhas)](https://www.migalhas.com.br/coluna/jurisprudencia-do-cpc/426553/art-411-do-cpc--autenticidade-de-documentos)
- [LGPD, art. 4º](https://lgpd-brasil.info/capitulo_01/artigo_04)
- [Resolução CD/ANPD nº 2/2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
- [ANPD — consulta sobre o regulamento de fiscalização (cita a Lei 15.352/2026 e o Decreto 12.975/2026)](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-abre-audiencia-consulta-atualizacao-regulamento-fiscalizacao)
- [Lei 8.935/1994 (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/l8935.htm)
- [Provimento CNJ 149/2023](https://atos.cnj.jus.br/atos/detalhar/5243)
- [Marco Civil, art. 15](https://modeloinicial.com.br/lei/L-12965-2014/marco-civil-internet/art-15)
- [Decreto 12.975/2026 (Câmara)](https://www2.camara.leg.br/legin/fed/decret/2026/decreto-12975-20-maio-2026-799136-publicacaooriginal-179396-pe.html)
- [Brownpipe — Decreto 12.975/2026 e guarda de logs](https://www.brownpipe.com.br/blog/decreto-12975-2026-guarda-de-logs-moderacao-conteudo-provedores/)
- [ECA Digital em vigor em 17/03/2026 (Machado Meyer)](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026)
- [ANPD — orientações preliminares e cronograma de aferição de idade](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-orientacoes-preliminares-e-cronograma-para-afericao-de-idade-no-ambiente-digital)
- [ANPD — página ECA Digital](https://www.gov.br/anpd/pt-br/assuntos/eca-digital)
- [Lex Legal — ANPD dá prazo até 2027](https://lexlegal.com.br/eca-digital-anpd-da-prazo-ate-2027-para-checagem-de-idade/)
- [Lei 9.613/1998 (BCB)](https://www.bcb.gov.br/pre/leisedecretos/port/lei9613.pdf)
- [Governo testa identidade digital descentralizada no gov.br (Contábeis)](https://www.contabeis.com.br/noticias/68050/governo-testa-projeto-piloto-de-identidade-digital-descentralizada-no-gov-br/)
- [CPQD — acordo com a Secretaria de Governo Digital](https://www.cpqd.com.br/noticias/cpqd-e-secretaria-de-governo-digital-firmam-acordo-de-cooperacao-para-uso-de-identidade-digital-descentralizada-no-acesso-a-servicos-publicos/)
- [Teletime — CPQD e identidade descentralizada contra spoofing](https://teletime.com.br/14/04/2026/cpqd-identidade-descentralizada-spoofing/)
- [RNP — 2º Workshop de Credenciais Verificáveis](https://www.rnp.br/2026/06/22/rnp-debate-futuro-da-identidade-digital-academica-no-2o-workshop-de-credenciais-verificaveis/)
- [Índia vai desenvolver credenciais digitais para o Brasil (Convergência Digital)](https://convergenciadigital.com.br/governo/india-vai-desenvolver-credenciais-digitais-em-codigo-aberto-para-o-brasil/)

**Internacional**
- [Suíça — e-ID aprovada nas urnas](https://www.eid.admin.ch/en/e-id-gesetz-an-der-urne-angenommen-e)
- [Suíça — documentação técnica swiyu](https://swiyu-admin-ch.github.io/introduction/)
- [Suíça — o que foi decidido com a e-ID (SATW)](https://www.satw.ch/en/news/from-the-vote-to-the-infrastructure-what-switzerland-has-really-decided-with-the-e-id)
- [Bundesamt für Justiz — Akzeptanz der E-ID stärken](https://www.bj.admin.ch/de/newnsb/L6Nbf7gStnDm)
- [Utah SB 260 (SpruceID)](https://blog.spruceid.com/utahs-digital-id-law-sb260-is-the-new-frontier-for-user-controlled-identity/)
- [Utah SB 260 (ACLU)](https://www.aclu.org/news/privacy-technology/digital-id-utah)
- [Utah SB 275 (2026)](https://le.utah.gov/Session/2026/bills/introduced/SB0275.pdf)
- [SpruceID — Utah SB 275 explicado](https://blog.spruceid.com/utah-sb-275-explained-what-the-sedi-law-actually-does/)
- [Utah SEDI — Implementation Guide](https://sedi.utah.gov/implementation-guide/)
- [Wyoming SF0039](https://wyoleg.gov/2021/Enroll/SF0039.pdf)
- [Buenos Aires — QuarkID (Biometric Update)](https://www.biometricupdate.com/202402/buenos-aires-integrates-open-sources-self-sovereign-identity-protocol-quarkid)
- [Buenos Aires — QuarkID no miBA (ZKsync)](https://www.zksync.io/blog/hola-argentina)
- [Argentina — firma digital remota (Ámbito)](https://www.ambito.com/politica/el-gobierno-oficializo-los-cambios-la-firma-digital-se-podra-validar-y-registrar-forma-remota-n6050510)
- [Butão — estudo de caso NDI (Trust over IP)](https://trustoverip.org/wp-content/uploads/Case-Study-Bhutan-NDI-National-Digital-Identity-ToIP-Digital-Trust-Ecosystems-V1.0-2024-05-21.ext_.pdf)
- [Liechtenstein — TVTG (FMA)](https://www.fma-li.li/en/supervision-regulation/fintech/tvtg)
- [Próspera / ZEDE (Wikipedia)](https://en.wikipedia.org/wiki/Zone_for_Employment_and_Economic_Development)
- [eIDAS 2.0 — cronograma (Gataca)](https://www.gataca.io/resources/blog/eIDAS2-timeline/)
- [Biometric Update — dúvida sobre o prazo da EUDI](https://www.biometricupdate.com/202604/eu-commission-doubtful-all-member-states-will-be-able-launch-eudi-wallets-this-year)

**Padrões e segurança**
- [W3C — WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)
- [RFC 9901 (SD-JWT)](https://www.rfc-editor.org/info/rfc9901)
- [IETF — draft-ietf-oauth-sd-jwt-vc](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/)
- [OpenID Foundation — HAIP 1.0 Final](https://openid.net/openid4vc-high-assurance-interoperability-profile-haip-1-0-final-specification-approved/)
- [W3C — VC 2.0 é Recommendation](https://www.w3.org/news/2025/the-verifiable-credentials-2-0-family-of-specifications-is-now-a-w3c-recommendation/)
- [W3C — DID 1.1](https://www.w3.org/TR/did-1.1/)
- [W3C — DID Resolution v1](https://www.w3.org/news/2026/w3c-invites-implementations-of-decentralized-identifier-resolution-did-resolution-v1/)
- [SpecterOps — Pass-the-Passkey (PDF)](https://specterops.io/wp-content/uploads/sites/3/2026/08/Pass-the-Passkey_A4_v2.pdf)
