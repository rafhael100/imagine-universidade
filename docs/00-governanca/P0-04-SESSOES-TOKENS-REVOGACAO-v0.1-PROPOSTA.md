# P0-04 — Sessões, tokens e revogação de acesso (v0.1)

**Situação:** **PROPOSTA PARA RATIFICAÇÃO**; não aprovada, não implementada e não homologada.  
**Data:** 03/11/2026.  
**Base vinculante:** [DEC-UNI-P0-03](DECISAO-UNI-P0-03-ELEGIBILIDADE-2026-11-03.md) — direito de acesso funcional ratificado; [opção B](DECISAO-UNI-SEQ-2026-11-03.md) — programação paralela apenas após fechamento documental e autorização própria.  
**Dependências:** P0-06 (identidade, API, eventos), P0-08 (mídia privada), P0-05 (privacidade), P0-09 (arquitetura), P0-12 (critérios de aceite).  
**Fontes técnicas externas para conferência:** [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet) e [Cloudflare — Secure your Stream](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/), consultadas em 03/11/2026. O fornecedor de mídia ainda não foi homologado.

## 1. Objetivo e fronteiras obrigatórias

Separar quatro conceitos independentes:

1. **Identidade/sessão de pessoa:** confirma quem está conectado e qual vínculo está selecionado; autoridade central Imagine.
2. **Direito educacional (entitlement):** contrato oficial + empresa + pessoa + recurso + revisão, calculado/confirmado por autoridade comercial.
3. **Credencial de API/ação educacional:** autoriza chamada concreta com escopo definido, sujeita a sessão e direitos ainda válidos.
4. **Credencial de mídia:** URL/token específico de vídeo ou objeto, emitido somente após autorização de backend, sujeito às limitações do provedor.

**A presença do menu, a posse de um JWT, o conhecimento de uma URL, o cache de borda e a existência de sessão antiga NÃO constituem direito educacional.**

## 2. Parâmetros iniciais recomendados — para decisão

| Parâmetro | Proposta inicial | Observação |
|---|---:|---|
| Token de acesso à API | **até 15 minutos** | Escopo restrito, rotação e validação de revogação independente do `exp` quando cabível |
| Sessão de usuário — inatividade | **30 minutos** | Sessão central/SSO pode ter política mais restrita; observar atividade real do servidor |
| Sessão de usuário — duração máxima contínua | **8 horas** | Após expiração absoluta, reautenticar; não usar somente temporizador do navegador |
| Cache positivo de elegibilidade | **até 60 segundos** | Invalidar antecipadamente por eventos e revisão oficial; cache não pode reabrir direito revogado |
| Nova concessão após revogação oficialmente confirmada | **não emitir a partir da confirmação local** | Objetivo de propagação fim a fim de **até 60 segundos**, condicional à arquitetura e futura homologação |
| Credencial temporária de início de reprodução | **até 5 minutos**, se suportada como *grant* separada | Não confundir com o token de reprodução CDN; expiração não deve quebrar aula em andamento |
| Token de reprodução de vídeo protegido | **duração da aula + margem curta, limitada inicialmente a 60 minutos**, sujeito ao fornecedor | Contrato precisa esclarecer como manifests/segmentos se comportam na expiração e renovação; avaliar reprodução longa |
| Link de arquivo/objeto protegido | **até 5 minutos** | Escopo de um recurso e download proibido por padrão onde aplicável |
| Reautorização em renovação/nova aula/Tutor | **obrigatória** | Perda de direito bloqueia nova credencial mesmo se sessão principal ainda existir |

**Os tempos acima não foram aprovados.** Recomenda-se ajustar parâmetros por ameaça, custo, experiência do usuário, protocolos e teste de fornecedor. Nunca prometer que uma credencial já emitida pelo CDN será revogada em 60 segundos sem mecanismo comprovado.

## 3. Regras de segurança da sessão

- Adotar integração por provedor de identidade central e protocolo homologado (ex.: OIDC/OAuth 2.0); **não criar banco paralelo de senhas** na Universidade.
- Preferir sessão opaca controlada no servidor ou BFF com cookies `HttpOnly`, `Secure`, `SameSite` adequado e proteção CSRF; se JWT chegar ao navegador, mitigar riscos de exposição e definir política de renovação.
- Atributos sensíveis de permissão e direito são validados no backend, vinculados a pessoa, empresa, recurso e versão de autorização.
- Sessão expira **no servidor** por inatividade e limite absoluto; logout e encerramento remoto invalidam credenciais ou sessão associada.
- Renovar sessão após elevação de privilégio ou troca crítica de vínculo, sem permitir acesso interorganizacional.
- Proteções de brute force, MFA e recuperação de conta permanecem na autoridade de identidade oficial; a Universidade não duplica fluxos.
- Sessões simultâneas podem ser permitidas sob controle central, mas encerramento de conta, vínculo ou direito deve afetar todas as sessões pertinentes.

## 4. Estados e propagação de revogação

### 4.1 Eventos com confirmação oficial

1. Portal/serviço competente confirma mudança comercial/vínculo e incrementa revisão do direito.
2. Publica evento versionado e idempotente.
3. Autorizador invalida entrada de cache e bloqueia **novas** concessões ao verificar versão nova.
4. Universidade nega novas chamadas a recursos restritos, novas respostas do Tutor e emissão/renovação de tokens de mídia.
5. Credenciais previamente emitidas expiram ou são revogadas **segundo o mecanismo real**, registrado em contrato, com medição separada.
6. Eventos perdidos, duplicados ou atrasados são reconciliados à revisão oficial; evento isolado não autoriza restabelecimento sem confirmação.

### 4.2 Falha da fonte oficial / desconhecido

- **Negar nova concessão** quando não houver decisão oficial válida; não converter erro 5xx, timeout, cache expirado, revisão inconsistente ou resposta ambígua em sucesso.
- Uma sessão já autenticada só mantém acesso a conteúdo protegido **se existir autorização válida, ainda não expirada e não revogada**, respeitando o prazo máximo ratificado.
- O usuário recebe mensagem neutra de indisponibilidade da verificação, sem revelar dados empresariais.
- Recuperação de serviço reconcilia a revisão antes de permitir novas emissões.

### 4.3 Múltiplos contratos e vínculos

- Cancelamento de um serviço não revoga o benefício se outro contrato elegível está ativo. A autoridade emite decisão recalculada, em vez de zerar direitos pela simples ocorrência de cancelamento.
- Revogação de vínculo empresarial bloqueia somente aquele contexto, sem interferir indevidamente em outro vínculo elegível.
- Não transportar credenciais entre empresas ou usuários; curso geral acessível depende de direito atual, mesmo que conteúdo seja idêntico.

## 5. Conteúdo protegido e limites reais da revogação

**Recomendação:** todos os vídeos privados por padrão; autorizar o recurso no backend antes de emitir token/URL. Nomes de mídia, miniaturas restritas, legendas/transcrições protegidas e objetos anexos seguem a política de autorização.

**Cloudflare Stream, se contratado:** exigir vídeos com `requireSignedURLs`. A documentação do serviço prevê tokens de acesso assinados com `exp` e restrições, com duração configurável. Não assumir que revogar um único direito empresarial equivale a invalidar imediatamente todos os tokens de vídeo já emitidos: revogar chave de assinatura tem impacto mais amplo em todos os tokens associados. Qualquer mecanismo individual deve ser comprovado em homologação.

O sistema distingue e mede:
- **T1:** instante da mudança oficial de direito.
- **T2:** instante da atualização/invalidação no autorizador.
- **T3:** instante em que nenhuma nova concessão é possível.
- **T4:** instante final até o qual **credenciais de mídia previamente emitidas** ainda podem permitir reprodução.

A meta proposta de 60 segundos aplica-se a **T1→T3** (a ser testada), **não** a **T1→T4**. Para T4, vale o TTL de mídia ou revogação individual tecnicamente comprovada. Se o negócio exigir T4 próximo de T3, deve-se escolher provedor/arquitetura que ofereça garantia mensurável, considerando custo.

**Não prometer anticópia absoluta**: gravação de tela, download por meios externos e compartilhamento não são inteiramente preveníveis.

## 6. Eventos que exigem rechecagem

Revalidar ao iniciar sessão educacional, selecionar empresa, abrir curso protegido, buscar documento restrito, emitir/renovar token de vídeo, iniciar nova pergunta ao Tutor e realizar operações pessoais sensíveis. Respostas de APIs que retornem dados pessoais ou conversas não podem ser liberadas apenas com token de mídia.

## 7. Auditoria e privacidade

Registrar somente identificadores minimizados: decisão, recurso, vínculo, revisão, razão codificada, timestamps de validade, correlação e duração de propagação. Não registrar senhas, tokens completos, transcrições do Tutor nem conteúdo sensível em logs técnicos. Retenção e acesso aos logs dependem da política P0-05.

## 8. Testes futuros — não realizados agora

| ID | Resultado esperado |
|---|---|
| HT-UNI-SESS01 | Sessão expirada por inatividade é rejeitada no backend |
| HT-UNI-SESS02 | Limite absoluto da sessão exige reautenticação |
| HT-UNI-SESS03 | Token de API expirado não é aceito nem renovado após revogação |
| HT-UNI-SESS04 | Revogação de último serviço bloqueia novas concessões com medição T1→T3 |
| HT-UNI-SESS05 | Eventos duplicados, atrasados ou perdidos não reabrem direitos |
| HT-UNI-SESS06 | Falha da autoridade nega novas concessões |
| HT-UNI-SESS07 | Troca de empresa ou revogação de vínculo não vaza dados |
| HT-UNI-SESS08 | Token de mídia de outra pessoa/recurso não libera conteúdo diverso |
| HT-UNI-SESS09 | Expiração/renovação do token de vídeo se comporta conforme fornecedor, inclusive em aulas longas |
| HT-UNI-SESS10 | Tempo T1→T4 é medido, documentado e não prometido como instantâneo sem capacidade real |
| HT-UNI-SESS11 | Logout remoto, troca de senha e elevação de privilégio renovam/invalida sessões conforme política central |
| HT-UNI-SESS12 | Logout não deixa recursos pessoais sensíveis acessíveis por cache indevido |

## 9. Escopo proposto para aprovação desta decisão

Aprovar **as regras e parâmetros iniciais da Seção 2 como base de projeto**, com obrigação de homologar conformidade técnica dos fornecedores antes do lançamento e documentar exceções. Caso algum limite seja tecnicamente inviável, propor nova decisão expressa antes de alterar o requisito.

**Não** aprova fornecedor, infraestrutura, compras, alteração de contrato comercial, custos adicionais, procedimentos de produção ou início da programação.

**Próximo bloco depois de P0-04:** P0-05, privacidade e retenção de dados, com avaliação jurídica e prazos por categoria antes de publicação da política final.
