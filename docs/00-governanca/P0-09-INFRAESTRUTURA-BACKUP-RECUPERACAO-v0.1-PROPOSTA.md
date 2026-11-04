# P0-09 — Infraestrutura, isolamento, backups, recuperação e observabilidade

**Data:** 04/11/2026  
**Estado:** PROPOSTA PARA RATIFICAÇÃO — **NÃO APROVADA**, não implementada e sem contratação autorizada.  
**Objetivo:** arquitetura econômica para o estágio inicial (inclusive zero clientes), sem eliminar controles essenciais de segurança, recuperação ou privacidade.  
**Decisões vinculantes:** desenvolvimento paralelo condicionado (opção B); P0-03 direito de acesso; P0-04 segurança de sessão; P0-05 retenção/LGPD; P0-06 contratos e eventos; P0-07 agentes/IA; P0-08 mídia protegida.  
**Dependências:** P0-10 para preços, orçamentos e escolha de fornecedor; P0-11 para responsáveis e alçadas; P0-12 para testes e aprovação de prontidão.  
**Natureza:** desenho de referência, não configuração de serviço existente.

## 1. Princípios e custo do lançamento

1. **Zero clientes, zero produção:** não contratar infraestrutura de produção da Universidade antes de haver autorização de desenvolvimento, necessidade técnica e orçamento aprovado. Planejamento, documentação, ambientes locais e simulações com dados fictícios podem prosseguir sem novo custo fixo de servidor.
2. **Separação do CRM:** dados pessoais/educacionais, API e banco da Universidade não compartilham banco, credenciais administrativas ou recursos de execução de produção do CRM. A separação lógica é mandatória; a separação física por VPS exclusiva para a Universidade é a opção preferida na primeira ativação de produção.
3. **Sem duplicar plataforma de agentes:** o n8n e o orquestrador central dos projetos Imagine poderão ser compartilhados, **com isolamento de credenciais, filas, permissões, recursos e limites por projeto**, mas não serão autoridade de direitos, nem depositários implícitos de transcrições pessoais.
4. **Frontend barato, segurança no backend:** usar Cloudflare Workers Static Assets como candidato para ativos estáticos da Universidade, separando domínios/projeto e deploy do Portal/CRM. Isso não torna cursos privados por serem estáticos: **toda mídia e dado restrito exige API/autorização**.
5. **Despesas apenas com aprovação:** Leaseweb VPS, Cloudflare Workers/Stream/R2, monitoramento externo, backups e serviços de IA são candidatos e não foram contratados por esta minuta. Não assumir que usar uma conta Cloudflare significa que todos os produtos compartilham permissões e segredos.

## 2. Topologia proposta para ativação inicial

```text
Aluno elegível → Cloudflare DNS/WAF/TLS
            ├── Frontend Universidade — Workers Static Assets (estáticos, sem dados privados embutidos)
            └── Gateway/Autorização → API Universidade (VPS de produção dedicada)
                                      ├── PostgreSQL educacional PRIVADO
                                      ├── Cache/fila da Universidade com limites
                                      ├── Logs/telemetria minimizados
                                      ├── Autoridades oficiais Portal / identidade / contrato (sem cópia de estado oficial)
                                      ├── Serviço central de IA + n8n compartilhado (credenciais escopadas)
                                      ├── Cloudflare Stream privado (vídeo protegido)
                                      └── Cloudflare R2 privado (anexos/material)
                        ↘ Backup criptografado EXTERNO em falha/provedor separado
```

**Nenhum banco PostgreSQL aceita conexão pública.** Na versão de menor custo, API e Postgres podem residir em **contêineres/processos distintos na mesma VPS exclusiva da Universidade**. Isso reduz mensalidade, mas constitui **um único domínio de falha** e **não oferece alta disponibilidade**. Somente aceitar a topologia se os objetivos de recuperação e o orçamento forem ratificados.

**Alternativa para escala/risco superior:** VPS de API separada de uma instância gerenciada de banco ou segunda VPS de banco, replicação, balanceamento e recuperação mais rápida, sujeita a novo orçamento. Não contratar redundância ociosa antes de evidência de demanda e do plano financeiro.

## 3. Dimensionamento como referência (sem cotação)

| Estágio | Critério | Capacidade candidata | Observações |
|---|---|---|---|
| Documentação / 0 clientes | Planejamento, dados fictícios e testes locais | **Nenhuma VPS de produção** | Preserva caixa; não autoriza uso de dados reais |
| Desenvolvimento autorizado | Ambiente de desenvolvimento isolado | Ambiente existente separado ou VPS de teste sob decisão de arquitetura | Não usar base real de CRM; evitar interferência em serviços críticos |
| Piloto controlado | Primeiros usuários reais elegíveis | VPS exclusiva com **2 vCPU / 4 GB RAM / 60–80 GB SSD** como hipótese mínima a testar | API + PostgreSQL + fila, conexão privada, monitoramento e backups externos; sem SLA de alta disponibilidade |
| Produção inicial com crescimento | Consumo sustentado, vídeo/IA e filas mensurados | VPS de **4 vCPU / 8 GB RAM** como hipótese de ampliação | Escalar após medição de CPU, RAM, fila, banco, erro e custo |
| Escala significativa | Saturação, objetivos mais estritos ou risco contratual | Separar banco e API, configurar redundância e reconciliação | Exige nova análise de custo e RPO/RTO |

Os números são hipóteses de dimensionamento, **não preços, limites contratuais nem homologação de performance**. Uma VPS 2/4 pode ser insuficiente caso bibliotecas, workers ou métricas mostrem saturação; o piloto exige testes e opção de escala antes do lançamento amplo.

## 4. Base tecnológica e segurança

- **VPS candidata:** Leaseweb Ubuntu LTS com atualização de segurança, suporte de manutenção, NTP e configuração endurecida. Outras opções equivalentes são permitidas se cumprirem segurança e custo.
- **Deploy isolado:** contêineres com usuários não privilegiados, sem montagem do socket Docker em agentes, secrets segregados por ambiente, política de recursos e redes privadas. Considerar rootless Docker quando tecnicamente compatível.
- **Banco educacional:** PostgreSQL protegido; conexões TLS ou localhost/network privada, autenticação mínima, rotinas de migração aprovadas e backups PITR. Não disponibilizar porta `5432` na Internet.
- **Entrada:** DNS/TLS/WAF Cloudflare. Considerar Cloudflare Tunnel e Zero Trust Access como camada para reduzir portas abertas; **avaliar regras disponíveis nos planos Free/Pro** com foco nos riscos reais, sem presumir contratação Pro para todos os produtos.
- **Painel/admin e acesso de manutenção:** MFA obrigatório para administradores institucionais, credenciais nominativas, menor privilégio, acesso por política e auditoria; SSH somente por canal restrito/Access/VPN, sem senha root pública.
- **Implantação:** GitHub como fonte de código e especificação futura; branch protegida, revisão de mudanças críticas, pipeline com credenciais de escopo mínimo, rollback versionado e migrações de banco compatíveis.
- **Isolamento de serviços centrais:** usar o servidor de IA/n8n aprovado como núcleo multi-projeto, com filas segregadas, chaves por aplicação, políticas de egress, rate limits e monitoramento de carga. Queda do n8n/IA não pode alterar direito comercial nem tornar conteúdo privado público.
- **Contingência de autorização:** se autoridade do Portal estiver indisponível, nenhuma nova concessão sem decisão vigente válida (P0-03/P0-04), mesmo que frontend estático permaneça funcionando.

Referências oficiais sobre opções tecnológicas: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectivity-options/), [Docker Rootless](https://docs.docker.com/engine/security/rootless/).

## 5. Backups, objetivos e restauração

**Metas candidatas de lançamento, a ratificar:**
- **RPO-alvo de até 4 horas** para registros educacionais estruturados; perda máxima desejada desde o último ponto recuperável.
- **RTO-alvo de até 8 horas** para restaurar serviço educacional central em incidente grave, desde o acionamento do plano de recuperação.
- **Retenção inicial de 30 dias** de backups rotativos educacionais, alinhada à política-base P0-05, ressalvadas obrigações legais e classes de dados específicas.
- Não declarar essas metas como SLA contratado nem como evidência de cumprimento antes de testar.

**Estratégia mínima proposta:**
1. Backup-base consistente PostgreSQL (ex.: diário) + **arquivamento de WAL para recuperação pontual (PITR)**, com monitoramento de atraso e alertas. A janela de transporte e retenção deve garantir o RPO aprovado mesmo sob interrupções.
2. **Uma cópia criptografada fora da VPS**, de preferência em outro domínio de falha/credenciais e, sempre que economicamente viável, fornecedor diferente do primário, para reduzir risco de indisponibilidade simultânea.
3. Cópias versionadas de código, infraestrutura declarativa, configurações exportáveis, catálogo editorial, metadados, licenças e originais dos materiais necessários à recuperação. **Stream não substitui arquivo de origem e documentação de licenças.**
4. Chaves de criptografia e contas de backup separadas do host de produção; limitar exclusão/overwrite, autenticação reforçada, retenção e alertas. Backups imutáveis/object lock quando custo e fornecedor suportarem.
5. Verificações automáticas de execução, integridade, consistência, espaço e idade da última cópia; **alertar falha de backup sem declarar sucesso**.
6. Simulação de restauração em ambiente separado, no mínimo **a cada 90 dias** como hipótese de política, e antes do lançamento; registrar tempo real, lacunas e correções. Alteração grande na arquitetura exige novo teste.
7. Restauração reaplica **revogações de direitos e exclusões legítimas** após recuperar dados, para não restabelecer acesso cancelado ou dados suprimidos (P0-03/P0-05).
8. Dados pessoais presentes em backups obedecem retenção específica; inventários e registros formais de incidentes têm políticas próprias, não se apagam por copiar a regra de 30 dias.

A técnica de PostgreSQL WAL com base backup possibilita PITR, conforme [documentação oficial PostgreSQL](https://www.postgresql.org/docs/current/continuous-archiving.html).

## 6. Plano de continuidade e modos degradados

| Incidente | Comportamento e prioridade |
|---|---|
| API Universidade indisponível | Não conceder acesso protegido via frontend estático; registrar incidente, restaurar API/banco |
| Banco PostgreSQL corrompido/perdido | Isolar escrita, restaurar backup + WAL em host seguro, validar integridade, direitos e supressões |
| Portal/autorizador comercial indisponível | Não conceder **novo** direito não validado; sessões ainda autorizadas respeitam expiração P0-04 |
| n8n/IA indisponível | Manter cursos e mídia autorizados; desabilitar tutoria/produção e informar indisponibilidade |
| Stream indisponível | Exibir alternativa textual homologada, se existir e for autorizada; não publicar vídeo aberto |
| R2 ou backup indisponível | Não publicar objetos restritos sem verificação; disparar incidente e tentar recuperação controlada |
| Falha de link/cache/revogação | Não emitir nova credencial indevida; corrigir e investigar; medir T1→T3/T1→T4 |
| Comprometimento de segredo | Revogar e rotacionar credenciais, isolar ambientes e avaliar incidente LGPD conforme P0-05 |

## 7. Monitoramento e segurança operacional

**Observabilidade mínima:** heartbeat externo, taxa 4xx/5xx, latência p95 de APIs, falhas e tempo de resposta de autorização, fila e tarefas, CPU/RAM/disco, disponibilidade do banco, idade de backups, erros de upload, falha do Tutor, consumo de IA e de minutos Stream/R2.

**Alertas prioritários:** falha de backup; perda de replicação/arquivamento WAL; taxa elevada de 5xx; falha de autorização; 403/401 anormais; erro de custo/limite; risco de exposição de mídia ou credencial. Definir responsáveis e comunicação em P0-11.

**Segurança contínua:** atualizações planejadas, scanning de dependências e imagens, logs com dados mínimos, triagem de incidentes, monitoramento de consumo e auditoria de acesso privilegiado. Não transferir logs pessoais brutos de estudantes aos serviços compartilhados.

## 8. Custos e gatilhos de escala (P0-10)

Orçar por mês com cenários de **0 / 100 / 500 / 1.000 empresas elegíveis**, mas dimensionar **alunos ativos, tempo de vídeo efetivamente assistido, consumo de IA, armazenamento e chamadas**, não multiplicar custo automaticamente pelo número de empresas cadastradas.

- Fixos: VPS (CPU/RAM/disco), domínio/serviços, monitoramento e backup externo.
- Variáveis: minutos de vídeo armazenados/entregues, objetos/operações de R2, chamadas Workers/API, IA e produção editorial.
- Organizacionais: equipe, revisão de curso, acessibilidade, privacidade, suporte, segurança, impostos/câmbio.
- **Não comprar servidor dedicado para a Universidade na largada sem métricas**; a VPS de produção própria é preferência inicial quando houver usuários reais.
- Módulos e aulas de produtos ainda não homologados não entram no lançamento, embora possam estar no planejamento.
- Gatilhos quantitativos de upgrade serão definidos após dimensionamento, por exemplo CPU/RAM persistentes, p95 de API, duração de filas, falha de backup e custos não previstos.

## 9. Critérios de aceite futuros (não executados)

| ID | Evidência exigida antes de lançamento |
|---|---|
| HT-UNI-INF01 | API e banco não compartilham credenciais ou dados de produção do CRM |
| HT-UNI-INF02 | Banco não expõe portas públicas e aceita só conexões autorizadas |
| HT-UNI-INF03 | Frontend/Workers não contêm credenciais ou conteúdo protegido público |
| HT-UNI-INF04 | Serviço central n8n/IA não possui privilégios comerciais nem dados cruzados |
| HT-UNI-INF05 | Backup PostgreSQL + WAL é produzido e verificado dentro do RPO |
| HT-UNI-INF06 | Restauração completa em host isolado cumpre RTO ou gera plano corretivo |
| HT-UNI-INF07 | Backups e chaves estão separados do host comprometível |
| HT-UNI-INF08 | Exclusões/revogações válidas permanecem após restauração |
| HT-UNI-INF09 | Falha do Tutor não bloqueia aulas estáticas com direito válido |
| HT-UNI-INF10 | Falha do autorizador não concede nova permissão |
| HT-UNI-INF11 | Credenciais de API/backup/media podem ser rotacionadas e auditadas |
| HT-UNI-INF12 | Monitoring e alertas detectam falhas críticas de API e backup |
| HT-UNI-INF13 | Revisão de segurança atesta proteção da origem e de portas |
| HT-UNI-INF14 | Capacidade do piloto e plano de escalonamento comprovados por carga |
| HT-UNI-INF15 | Proveniência, backups e recuperação de materiais editoriais verificados |
| HT-UNI-INF16 | Custos reais do piloto são conciliados com teto mensal aprovado |

## 10. Itens submetidos à aprovação

Propõe-se ratificar a arquitetura de **lançamento sem contratação antecipada**, **VPS de produção exclusiva quando necessária**, **Cloudflare Workers + Stream/R2 candidatos**, **PostgreSQL educacional privado**, **n8n/IA central segregado**, **backup criptografado externo**, **RPO até 4h / RTO até 8h como metas iniciais sujeitas à prova**, **retenção-base de 30 dias** e **teste de restauração ao menos trimestral antes/depois da implantação conforme política final**.

**A ratificação desta arquitetura-base NÃO autoriza compras, provisionamento, novos servidores, código, reconfiguração do CRM ou publicação de curso.** A cotação real, região, definição de responsabilidades e autorização de execução continuarão em P0-10/P0-11/P0-12.
