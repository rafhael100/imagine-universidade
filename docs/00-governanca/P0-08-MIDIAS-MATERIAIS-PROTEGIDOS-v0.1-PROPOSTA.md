# P0-08 — Proteção e distribuição de vídeos e materiais educacionais

**Data:** 04/11/2026
**Status:** **APROVADA COMO ARQUITETURA-BASE EM 04/11/2026**, conforme [decisão P0-08](DECISAO-UNI-P0-08-MIDIAS-2026-11-04.md). **Não implementada, homologada nem contratada.**
**Escopo:** vídeo sob demanda, áudio, legendas, transcrições, textos, imagens, documentos, anexos didáticos e mídias auxiliares da Universidade Imagine.
**Decisões vinculantes:** P0-03 (elegibilidade), P0-04 (sessão/token/revogação), P0-05 (privacidade), P0-06 (contratos/APIs) e P0-07 (IA e agentes).
**Fornecedores:** Cloudflare Stream e R2 são **candidatos**, não serviços contratados/homologados. A análise de custo permanece em P0-10.

## 1. Princípios de publicação e acesso

1. O catálogo de cursos, aulas e recursos destinados a clientes é **privado por padrão**: não pode ser acessado apenas com link, vídeo-ID, path, QR code, iframe ou URL de origem.
2. Toda solicitação de mídia educacional protegida deve verificar no backend: identidade, vínculo com empresa, elegibilidade oficial, recurso, versão, publicação vigente e permissão. Somente após sucesso o serviço emite credencial temporária específica.
3. Revogação do último contrato elegível ou vínculo empresarial impede novas concessões/renovações de credenciais; conteúdos já emitidos obedecem às limitações comprovadas do token e do fornecedor conforme P0-04.
4. Conteúdos técnicos só podem ser publicados se retratarem funcionalidades reais dos produtos, aprovadas e homologadas. A produção com IA não equivale a publicação.
5. Cursos gerais e tutoriais de produtos ficam disponíveis a todos os clientes elegíveis, não apenas aos compradores do produto específico, respeitadas permissões particulares de contexto quando necessárias.
6. Separar publicação de curso, existência do arquivo, disponibilidade do vídeo e autorização de usuário. Uma dessas condições não concede automaticamente as demais.
7. Não prometer impedimento absoluto de cópia, captura de tela ou redistribuição externa. Usar medidas proporcionais, proteção de origem e resposta a abuso.

## 2. Arquitetura candidata

| Tipo | Solução candidata | Política |
|---|---|---|
| Vídeo sob demanda | Cloudflare Stream (ingestão, codificação, distribuição) | Todos os vídeos educacionais restritos marcados com exigência de URL assinada; restrições de domínio quando compatíveis |
| Arquivos PDF, imagens, roteiros, legendas, materiais de estudo | Cloudflare R2 **privado**, com API de autorização própria | Evitar bucket público e acesso direto sem checagem |
| Páginas, metadados e catálogo | Backend educacional + frontend/CDN | Dados públicos e protegidos em rotas separadas; verificação backend |
| Autorização | Portal/serviço comercial + autorizador Imagine + backend da Universidade | Decisão única de direito vigente, cache limitado e auditoria mínima |
| Fluxo editorial | Agentes educacionais + aprovação humana + versionamento | Nenhum upload/rascunho vira arquivo publicado automaticamente |
| Telemetria | Métricas agregadas e logs minimizados | Sem expor transcrições pessoais, tokens ou histórico individual ao gestor |

**Alternativas admitidas:** outro provedor de vídeo/objetos pode ser escolhido após prova de custo, compatibilidade, revogação, privacidade e condições contratuais. Esta minuta não realiza compra.

## 3. Cloudflare Stream — comportamento real a observar

A documentação oficial do Stream informa que, **por padrão, quem tem o ID do vídeo pode reproduzi-lo**, a menos que se exija `requireSignedURLs`. Logo:
- Exigir `requireSignedURLs=true` em todo vídeo protegido; rejeitar publicação que não comprove o estado.
- Emitir token assinado para vídeo específico após autorizar usuário e recurso; restringir origens/embeds autorizados, sem supor que restrição de origem substitui autenticação.
- Não emitir permissão de download de MP4/áudio por padrão; o fluxo de download exige autorização própria e configuração adequada.
- Os caminhos de token do provedor são diferentes: endpoint `/token` (padrão de cerca de **1 hora** e sujeito a limite de chamadas), Workers binding (padrão de **1 hora**) ou chave de assinatura própria, que permite configurar expiração e outras regras. A arquitetura deve escolher conscientemente.
- O prazo candidato de **até 5 minutos para credencial de início** do P0-04 não é automaticamente o TTL de todo token de reprodução do Stream. Caso se exija grant curto + reprodução longa, o gateway deve separar as funções ou usar mecanismo comprovado, com testes.
- Para reprodução contínua, respeitar **duração da aula + margem**, inicialmente limitada a **60 minutos** conforme P0-04; vídeos maiores exigem sessão reautorizada, renovação válida e teste do player, sem forçar expiração no meio da aula.
- Não presumir revogação individual instantânea de token assinado já emitido: medir separadamente (T1→T3: bloqueio de nova concessão; T1→T4: última reprodução possível com credenciais antigas). Rotação global de chave não é revogação individual segura sem impacto nos demais alunos.

Fonte oficial: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
Fonte oficial para downloads: https://developers.cloudflare.com/stream/viewing-videos/download-videos/

## 4. Cloudflare R2 — objetos protegidos

- Manter buckets de materiais educacionais protegidos em **modo privado**. Não habilitar `r2.dev` nem exposição pública de domínio para conteúdo restrito.
- Acesso a objeto é sempre condicionado a autorização de backend. Duas alternativas técnicas candidatas: (a) gerar URL pré-assinada de operação GET e recurso específico com TTL de **até 5 minutos**, ou (b) fazer proxy autenticado pelo backend/Worker para recursos que exigem controle mais fino.
- **URLs pré-assinadas do R2 funcionam no endpoint S3 do R2, e não em domínio personalizado.** Elas se comportam como credenciais bearer: qualquer pessoa que possua a URL pode usar a operação permitida até expirar. Não enviá-las a logs, analytics, terceiros ou referer indevido.
- R2 suporta validade configurável de URL pré-assinada, entre 1 segundo e 7 dias; o limite de 5 minutos é política de projeto, não limite técnico geral do fornecedor.
- Usar nomes de objeto opacos, escopo por curso/versão e, quando cabível, prefixo de organização para conteúdo especificamente privado. **Separação por pasta não substitui autorização**.
- Não cachear em CDN resposta privada se a chave de cache não garante autorização/escopo; `Cache-Control` rigoroso para conteúdo e metadados pessoais.
- A biblioteca nunca publica URLs de upload, exclusão ou administração no navegador com permissões superiores às estritamente necessárias. Upload direto, quando permitido, usa autorização própria, tamanho/formato e validade reduzida.

Fontes oficiais:
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- https://developers.cloudflare.com/r2/buckets/public-buckets/

## 5. Pipeline de conteúdo, proteção e homologação

1. **Ingestão:** material de origem permitido, autoria/licença/proveniência, finalidade, idioma, versão de produto e consentimentos/autorização pertinentes.
2. **Quarentena e inspeção:** checagem de formato/assinatura, limites de tamanho, varredura antimalware para anexos e bloqueio de arquivos executáveis indevidos.
3. **Produção:** mídia candidata com legendas, transcrição acessível, áudio adequado, imagem alternativa e revisão.
4. **Revisão humana:** pedagógica, técnica, legal de licenças, privacidade e acessibilidade conforme risco.
5. **Homologação:** versão de conteúdo aprovada, vídeo convertido, proteção de URLs ativa, armazenamento privado validado, metadados corretos, curso elegível e link não público.
6. **Publicação:** atualização transacional do status do curso e da mídia; registro de data/autor/versão e comunicação controlada.
7. **Suspensão e retirada:** deixar de emitir novas credenciais e retirar o item do catálogo quando houver risco; avaliar invalidação adicional de mídia conforme capacidade homologada.
8. **Arquivamento:** preservar somente pelo prazo e fundamento aplicável a conteúdo institucional; não confundir com retenção dos dados pessoais dos alunos, tratados no P0-05.

## 6. Autorização, cache e isolamento

- Cada emissão tem `subject_id`, `company_id`, `resource_id`, `content_version`, `entitlement_revision`, `issued_at`, `expires_at` e `decision_id`, com identificadores minimizados.
- Credenciais não podem ser reutilizadas para mídia diferente nem permissão de upload/edição. Uma URL copiada continua risco até expirar: TTL curto e origem restrita reduzem impacto, não garantem impossibilidade.
- Falha de identidade, vínculo ou contrato nega nova emissão. Fonte oficial indisponível segue P0-03/P0-04.
- Previews, thumbnails e legendas podem conter dados restritos: aplicar política explícita por classificação. Metadados do catálogo não devem revelar conteúdos internos de cliente.
- Suporte administrativo faz acesso justificado e auditado; gestor empresarial não ganha acesso a conversas privadas nem aos arquivos privados da Universidade por ser dono da empresa.
- Links profundos de curso solicitam login/autorização antes de carregar mídia; mecanismos de busca não indexam recursos privados e URLs assinadas.

## 7. Continuidade e recuperação

- Vídeo indisponível: apresentar alternativa textual homologada, quando existir, apenas a usuários elegíveis; não entregar URL pública de contingência.
- Mídia corrompida ou publicação incorreta: suspender recurso, restaurar última versão aprovada, investigar e registrar o incidente.
- Definir backups de roteiros, metadados, licenças, legendas e objetos autorais conforme P0-09. Não presumir que o provedor oferece todos os backups/versionamentos necessários.
- A retenção de arquivos institucionais e de dados pessoais dos alunos são políticas distintas; backups educacionais com dados pessoais seguem P0-05.
- Medir indisponibilidade de vídeo, latência de autorização, custo por minuto de armazenamento/entrega, taxa de erros de reprodução, expiração de tokens e acesso indevido.

## 8. Custos e contratação — decisão pendente

- Dimensionar com matriz de **minutos armazenados** por curso, duração média, total de alunos elegíveis, **minutos efetivamente assistidos**, qualidade/codificação, transcrição/legendas, downloads permitidos e armazenamento de objetos.
- Cloudflare Stream, R2 e Workers têm modelos de preços/limites próprios; não presumir franquia gratuita suficiente nem gasto fixo. Cotações e limites monetários serão definidos em **P0-10**.
- No início, permitir ativar somente a primeira onda de cursos efetivamente homologados, sem compra antecipada de capacidade ociosa.
- Separar custos de armazenamento, distribuição, produção, IA, suporte, backups e tributos.
- Escolha de região/localização de dados e suboperadores depende da análise P0-05/P0-09.

## 9. Testes futuros de aceite — não executados

| ID | Resultado esperado |
|---|---|
| HT-UNI-MID01 | Sem sessão/direito válido, URL de aula protegida não concede mídia |
| HT-UNI-MID02 | Vídeo Stream exige URL assinada; vídeo-ID isolado não reproduz |
| HT-UNI-MID03 | URL assinada de vídeo de A não autoriza outro vídeo/contexto |
| HT-UNI-MID04 | Nova emissão é negada após perda do último serviço elegível |
| HT-UNI-MID05 | T1→T3 e T1→T4 medidos e documentados separadamente |
| HT-UNI-MID06 | Token expirado é recusado; aula longa renova sem burlar direito |
| HT-UNI-MID07 | Download e embeds fora das origens autorizadas são bloqueados conforme capacidade comprovada |
| HT-UNI-MID08 | Bucket R2 privado não responde a acesso público sem assinatura |
| HT-UNI-MID09 | Link R2 expirado ou para outro objeto não libera conteúdo |
| HT-UNI-MID10 | Legendas, transcrições, thumbnails e anexos seguem classificação |
| HT-UNI-MID11 | Vídeo suspenso deixa de conceder novas credenciais |
| HT-UNI-MID12 | Material editorial não homologado não aparece ao aluno |
| HT-UNI-MID13 | Material malicioso/não licenciado não é publicado |
| HT-UNI-MID14 | Invalidação e armazenamento de cache não causam vazamento entre empresas |
| HT-UNI-MID15 | Queda de mídia usa fallback textual somente quando autorizado |
| HT-UNI-MID16 | Evidências de custos de entrega e armazenamento permitem comparar fornecedores |
| HT-UNI-MID17 | Registros de publicação e versão permitem restauração editorial |
| HT-UNI-MID18 | Revogação real de token já emitido reflete a capacidade comprovada do provedor |

## 10. Pedido de ratificação

**Ratificação de 04/11/2026:** P0-08 aprovado como arquitetura-base de proteção e distribuição, priorizando Cloudflare Stream para vídeo e R2 privado para materiais, condicionados a cotação e homologação; obrigar autorização de backend, tokens temporários, separação do início/reprodução, controle editorial, isolamento e testes.

**A aprovação não significa contratação de Cloudflare Stream/R2, garantia de revogação instantânea, ativação de recursos, publicação de aulas ou início da programação.** P0-09 definirá infraestrutura/backup e P0-10 definirá orçamento.
