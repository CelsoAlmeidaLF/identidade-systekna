# Identidade Soberana Systekna — Carteira + Emissor de Credenciais

Ambiente de teste com dois serviços independentes, em HTML/JS únicos e sem servidor. Os dois usam o design Systekna Aero 2.0 (claro e escuro).

| Serviço | Arquivo | Papel no ecossistema |
|---|---|---|
| Carteira de Identidade | `carteira-systekna.html` | **Titular**: guarda a identidade, as credenciais e os dados cifrados |
| Emissor de Credenciais | `emissor-systekna.html` | **Governança**: emissor, verificador, registro de documentos, lista de confiança, revogação e livro |

Os serviços não compartilham armazenamento. Tudo o que passa de um para o outro é texto assinado, copiado e colado. Em produção, esse transporte seria QR Code, link ou API.

## 0. Estrutura do código

Os dois HTML publicados são **gerados**. O código é editado em `src/`:

| Pasta | Conteúdo |
|---|---|
| `src/shared/` | Núcleo comum: `nucleo.js` (criptografia, PIN, JWT, interface base, PWA), `estilo.css`, `telas.html` (confirmação, recuperação, PIN), `folha.html` |
| `src/carteira/` | `pagina.html` (cabeçalho e telas próprias) e `app.js` (credenciais, cofre, identidade) |
| `src/emissor/` | `pagina.html` e `app.js` (emissão, verificação, documentos, governança, livro) |

```
npm run build        # gera carteira-systekna.html e emissor-systekna.html
npm test             # confere que os HTML estão em dia com src/ e roda todos os testes
```

Em `pagina.html`, a linha `<!-- @inclui caminho -->` é trocada pelo arquivo indicado. O resultado continua sendo um HTML único que abre sem servidor.

## 1. App instalável (PWA)

- Cada serviço é um app próprio, com manifesto (`carteira.webmanifest`, `emissor.webmanifest`), ícones em `icons/` e escopo limitado ao seu HTML. Os dois podem ser instalados lado a lado.
- `sw.js` guarda o site para uso sem internet. Páginas: rede primeiro, para que cada `git push` chegue logo; sem rede, usa a última cópia. Fontes: cache primeiro.
- **Instalar no celular** aparece na tela inicial e nos Ajustes quando o navegador permite. No iPhone, mostra o passo a passo do Safari.
- Ao criar ou recuperar a identidade, o app pede armazenamento persistente, para o navegador não apagar os dados quando faltar espaço.
- No iPhone, o app instalado tem armazenamento separado do Safari: a identidade precisa ser criada ou recuperada dentro do app.
- Ícones gerados por `node scripts/gerar-icones.js`.
- **CSP** em cada página (`default-src 'none'`): só roda o script inline cujo hash SHA-256 o build calcula, e nada é carregado de fora do site. Um `<script>` ou `onerror` injetado é bloqueado.
- A fonte Open Sans é servida de `fonts/` (licença OFL em `fonts/OFL.txt`): abrir o app não avisa o Google.

## 1.1 Base comum (núcleo compartilhado)

- **12 palavras BIP39** (PT ou EN, 128 bits) → semente PBKDF2-SHA512 → HKDF → três chaves:
  - Ed25519 (assinatura e DID),
  - X25519 (cifragem),
  - AES-256-GCM (dados).
- **DID** `did:key:z6Mk…`: a própria chave pública Ed25519.
- **PIN de 6 dígitos**: destrava a entropia guardada em duas camadas:
  - PBKDF2-SHA256 com 600.000 iterações;
  - chave do aparelho não exportável (IndexedDB).
- **Tentativas**: espera crescente a partir do 5º erro; o 10º erro apaga os dados locais. A tentativa é gravada antes de o PIN ser conferido, e o mesmo contador vale para desbloquear, ver as 12 palavras e trocar o PIN.
- **Biometria (opcional)**: passkey do aparelho com a extensão **PRF**. O autenticador só entrega o segredo PRF depois da digital ou do rosto, e esse segredo (via HKDF) abre uma segunda cópia da entropia, também presa à chave do aparelho. Ativar pede o PIN. Sem PRF, a opção não é ativada, porque uma biometria conferida só em JavaScript poderia ser burlada. Biometria recusada não gasta tentativa de PIN: o limite fica no hardware.
- **Só biometria (opcional)**: com a biometria ativada, a pessoa pode apagar o PIN do aparelho. Antes de apagar, a identidade é aberta de verdade pela biometria, para não deixar ninguém sem entrada. Sem PIN, a tela de bloqueio mostra só a biometria, "Ver as 12 palavras" pede a biometria e a biometria não pode ser desativada. Voltar a ter PIN pede a biometria. Se a biometria do aparelho mudar, a entrada é pelas 12 palavras, que criam um PIN novo.
- **Bloqueio automático** configurável. Recarregar a página sempre bloqueia.
- **Backup** `scb1.<iv>.<ct>` cifrado com a chave derivada das 12 palavras.
- Todos os tokens são **JWT EdDSA** com `kid = did#chave`. A verificação lê a chave pública direto do DID, sem consultar servidor, e exige o `typ` esperado em cada etapa.

## 2. Protocolo entre os serviços

| Etapa | Quem gera | `typ` | Conteúdo principal | Validade |
|---|---|---|---|---|
| Pedido | Carteira | `pedido+jwt` | DID do titular, nome, tipo desejado, nonce | 7 dias, uso único |
| Credencial | Emissor | `vc+jwt` | `sub` = DID do titular, afirmações, `issuer.name`, `credentialStatus` | 30 dias a 5 anos, ou sem validade |
| Desafio | Emissor | `desafio+jwt` | nonce, finalidade, tipo exigido | 10 minutos, uso único |
| Apresentação | Carteira | `vp+jwt` | `aud` = DID do emissor, nonce do desafio, credencial embutida | 5 minutos |
| Certificado de documento | Emissor | `vc+jwt` (DocumentRegistrationCredential) | SHA-256, nome, tamanho, requerente, nº do registro | Sem validade |

### Fluxo de emissão
```
Carteira: + > Pedir credencial ──(pedido assinado)──> Emissor: Emitir > Conferir pedido
Emissor: preenche afirmações > Emitir ──(credencial)──> Carteira: + > Receber credencial
```

### Fluxo de verificação ("crachá")
```
Emissor: Verificar > Gerar desafio ──(desafio)──> Carteira: + > Apresentar credencial
Carteira: escolhe a credencial e assina ──(apresentação)──> Emissor: Conferir apresentação
```

## 3. Checagens na verificação

1. **Formato**: é uma apresentação. Uma credencial colada sozinha é recusada.
2. **Assinatura do titular** na apresentação.
3. **Desafio deste emissor**: nonce gerado aqui, `aud` correto e nunca usado antes (bloqueia repetição).
4. **Prazo** do desafio e da apresentação.
5. **Assinatura do emissor** na credencial, que precisa ter `typ = vc+jwt`.
6. **Credencial pertence ao titular**: `vc.sub` igual a `vp.iss`.
7. **Emissor confiável**: o próprio emissor ou um DID da lista de confiança.
8. **Não revogada**: confere o registro de emissões. Para outro emissor, o status não pode ser conferido: a política do emissor decide se isso recusa (padrão) ou passa como "não verificável".
9. **Validade**: `nbf` e `exp`, com folga de 60 s para diferença de relógio entre aparelhos.
10. **Tipo exigido** pelo desafio.

A apresentação é aprovada quando nenhuma checagem falha.

## 4. Carteira de Identidade

- **Credenciais**: crachás por tipo, com detalhe, JWT bruto, Apresentar e Remover. Ao receber, recusa token sem `typ = vc+jwt`, emitido para outro DID, já expirado ou que ainda não entrou em vigor.
- **Cofre**: senhas (com gerador), notas e documentos. Cada item é cifrado com AES-GCM e o `id` do item como AAD.
- **Identidade**: DID, chave X25519, documento DID e mensagens cifradas (X25519 efêmero + HKDF + AES-GCM, formato `smsg1`).
- **Ajustes**: ver palavras (pede PIN), trocar PIN, bloqueio automático, backup, restauração e apagar tudo.

## 5. Emissor de Credenciais (Governança)

- **Painel**: integridade do livro, indicadores e últimos atos.
- **Emitir**:
  - confere o pedido (assinatura, validade, uso único);
  - formulário com afirmações editáveis e validade.
- **Verificar**: gera o desafio e confere a apresentação com o checklist da seção 3.
- **Documentos**:
  - registra o SHA-256 do arquivo e emite o certificado, que vai para a carteira se houver DID;
  - confere um arquivo contra o certificado.
- **Governança**:
  - nome público do emissor;
  - lista de emissores confiáveis (adicionar e remover);
  - política para status não verificável (recusar ou aceitar), registrada no livro;
  - credenciais emitidas, com revogação por motivo;
  - ajustes de segurança e backup.
- **Livro de registros**: cada ato traz `{n, data, tipo, texto, ref, hash anterior}`, o SHA-256 desses campos e a assinatura Ed25519 do emissor. "Conferir integridade" refaz a corrente e aponta o primeiro ato quebrado.

## 6. Regras de negócio

- RN01: O emissor só emite para quem enviar um pedido assinado. A assinatura prova o controle do DID.
- RN02: Cada pedido é atendido uma única vez.
- RN03: Cada desafio é aceito uma única vez e vale por 10 minutos.
- RN04: A carteira só aceita credenciais cujo `sub` é o seu DID.
- RN05: A revogação é irreversível e fica registrada no livro com o motivo.
- RN06: O emissor guarda apenas o hash dos documentos, nunca o arquivo.
- RN07: Mudanças de confiança, de nome e de política também são atos do livro.
- RN08: O PIN tem 6 dígitos e rejeita repetições e sequências. O 10º erro consecutivo apaga os dados locais.
- RN09: Por padrão, o emissor recusa credencial de outro emissor cuja revogação não pode conferir.
- RN10: O cofre não guarda cartões. Itens desse tipo são apagados ao abrir a carteira e ignorados ao restaurar backup.

## 7. Critérios de aceite (automatizados, Chrome 154)

O núcleo criptográfico é conferido contra vetores oficiais (BIP39/Trezor, RFC 5869, RFC 8032, RFC 7748, base58, did:key) em `tests/e2e/vetores-oficiais.spec.js`, com as fontes em `tests/fixtures/`. Os 12 critérios rodam em `tests/e2e/criterios-de-aceite.spec.js`, as correções da Fase 1 em `tests/e2e/fase1-correcoes.spec.js`, o PWA em `tests/e2e/pwa.spec.js` e a biometria em `tests/e2e/biometria.spec.js` (sensor simulado pelo autenticador virtual do Chrome) (Playwright, Chrome do sistema):

```
npm install
npm run test:e2e
# contra o site publicado:
BASE_URL=https://celsoalmeidalf.github.io/identidade-systekna npm run test:e2e
```


- [x] Emissor criado com o livro aberto e íntegro.
- [x] Pedido válido é conferido. O mesmo pedido reenviado é recusado.
- [x] Credencial emitida é aceita pela carteira do titular.
- [x] Apresentação com desafio é aprovada em todos os pontos.
- [x] A mesma apresentação reenviada é recusada (desafio já usado).
- [x] Credencial colada sem apresentação é recusada com explicação.
- [x] Desafio que exige um tipo que a carteira não tem mostra "nenhuma credencial serve".
- [x] Após a revogação, uma nova apresentação é recusada.
- [x] Documento registrado confere com o mesmo arquivo e falha com um arquivo alterado.
- [x] Certificado de documento entra na carteira quando há DID.
- [x] Adulterar um ato do livro é detectado no ato exato.
- [x] Bloquear e desbloquear preserva todos os atos.

## 8. Limites conhecidos (teste)

- Transporte manual por copiar e colar.
- A revogação só é visível para o próprio emissor. Em produção: Bitstring Status List publicada.
- A confiança no emissor é uma lista local. Em produção: `did:web` do emissor ou registro de confiança público.
- Sem divulgação seletiva: a apresentação revela todas as afirmações da credencial. Evolução: SD-JWT ou BBS+.
- PIN de 6 dígitos sem hardware seguro. Chave do emissor fora de HSM. Ver o modelo de ameaças do PIN abaixo.
- Derivação HKDF própria, sem compatibilidade com outras carteiras SSI.
- Publicado em `celsoalmeidalf.github.io/identidade-systekna/`: a origem é a mesma de todos os sites Pages da conta, então o armazenamento do navegador é compartilhado com eles. Serve para demonstração, não para identidades reais. Em produção: um subdomínio próprio para cada serviço.

### Modelo de ameaças do PIN

O PIN protege contra **quem pega o aparelho desbloqueado e só usa a tela**: o contador de tentativas (gravado antes de cada conferência) apaga os dados no 10º erro, inclusive em "Ver as 12 palavras" e "Trocar PIN".

O PIN **não** protege contra quem consegue rodar código no navegador da pessoa (acesso ao perfil do navegador, extensão maliciosa, outro site na mesma origem, ferramentas de desenvolvedor):

| O que o atacante tem | O que ele consegue |
|---|---|
| Só o arquivo do armazenamento, copiado para outro aparelho | Nada: a camada interna depende da chave do aparelho, que não sai do navegador |
| Código rodando no próprio navegador | Chamar a conferência do PIN diretamente, sem passar pelo contador, e testar os 10⁶ PINs. Com PBKDF2 de 600.000 iterações, leva de horas a poucos dias em um computador comum |

Por isso a segurança real da identidade são as **12 palavras**, e o PIN é uma trava de conveniência.

A **biometria** não tem essa fraqueza: o segredo que abre a identidade sai do chip de segurança do aparelho só depois da digital ou do rosto, e nenhum código na página consegue pedir esse segredo sem a pessoa. Mas, enquanto o PIN continuar ativo como alternativa, a cópia protegida pelo PIN continua sujeita ao ataque acima. A opção **"Usar só biometria"** apaga essa cópia: sem ela, não há o que testar por força bruta, e a recuperação passa a ser só pelas 12 palavras.

## 9. Próximos passos sugeridos

1. QR Code para pedido, desafio e apresentação (leitura pela câmera).
2. Lista de status de revogação publicável e consultável pela carteira.
3. Divulgação seletiva (provar maioridade sem mostrar a data de nascimento).
4. `did:web` para o emissor e registro público de emissores.
5. Hospedagem dos dois serviços no GitHub Pages ou no SHTTPS, em origens separadas.
6. **Login em sites com a carteira** ("Entrar com carteira Systekna"): o site gera um desafio (nonce, `aud` = domínio do site, prazo), a carteira mostra o domínio real de quem pede, a pessoa confirma com PIN ou biometria e a carteira devolve um `vp+jwt`. O servidor do site confere assinatura, nonce de uso único, `aud` e prazo, e abre a sessão com o DID como usuário. Começar pelo popup com `postMessage` (mesmo navegador), com um site de exemplo e um verificador em Node que reaproveita `src/shared/nucleo.js`, mais testes E2E (login aprovado, nonce repetido, `aud` errado, desafio vencido). Depois: redirecionamento OpenID4VP/SIOPv2 e a Digital Credentials API.
