# Pré-Gate C — Bloco A: arquitetura e ambiente de desenvolvimento da Universidade Imagine

**Data:** 04/11/2026.
**Situação vigente:** **BLOCO A APROVADO COMO BASE TÉCNICA DOCUMENTAL** em [DEC-UNI-BA](DECISAO-UNI-PRE-GATE-C-BLOCO-A-APROVADO-2026-11-04.md). **Gate C continua NÃO AUTORIZADO; VPS, versões, orçamento e testes ainda não homologados.**
**Origem:** o responsável respondeu “ok” à recomendação de começar pelo **Bloco A — fechamento da arquitetura e do ambiente de desenvolvimento da Universidade**, para então avançar aos blocos B (orçamento/responsáveis) e C (termo de autorização Gate C). Esse “ok” autoriza a **elaboração documental desta proposta**, não a abertura de Gate C ou a aprovação automática de escolhas técnicas não ratificadas.

**Precedências normativas:**
- [D15 — Gate D encerrado apenas documentalmente](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md).
- [UNI-C01 — C-00 Fundação Segura aprovado apenas como escopo de planejamento](DECISAO-UNI-PRE-GATE-C01-ESCOPO-C00-2026-11-04.md).
- [P0-06 — integração e contratos lógicos UNI-C01..UNI-C08](DECISAO-UNI-P0-06-INTEGRACOES-2026-11-03.md).
- [P0-09 — arquitetura de infraestrutura da Universidade, inclusive produção futura separada](DECISAO-UNI-P0-09-INFRA-BACKUP-2026-11-04.md).
- [Checklist de requisitos Pré-Gate C](PRE-GATE-C-CHECKLIST-ORCAMENTO-E-AUTORIZACAO-v0.1-2026-11-04.md).
- [INF-DEV-01 — VPS central de desenvolvimento Imagine na Leaseweb](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/INF-DEV-01-VPS-CENTRAL-LEASEWEB-2026-11-04.md).
- [DEC-INF-DEV-02 — Cloudflare R2 Standard com jurisdição EU para backups de desenvolvimento](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/DEC-INF-DEV-02-DESTINO-R2-EU-APROVADO-2026-11-04.md).
- [DEC-INF-DEV-03 — política-base Restic e retenção](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/DEC-INF-DEV-03-POLITICA-BACKUP-RESTIC-R2-APROVADA-2026-11-04.md).
- [DEC-INF-DEV-05 — isolamento por buckets e recuperação protegida](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/DEC-INF-DEV-05-APROVACAO-BASE-IMPLANTACAO-SEGURA-2026-11-04.md).
- [DEC-INF-DEV-06 — identidades, custódia e incidentes](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/DEC-INF-DEV-06-APROVACAO-BASE-SEGURANCA-IDENTIDADES-E-INCIDENTES-2026-11-04.md).

## 1. Contexto e decisão pretendida

**Intenção ratificada da direção:** uma **VPS Leaseweb COMPARTILHADA só para desenvolvimento** dos produtos Imagine, não uma VPS exclusiva de desenvolvimento por produto. O plano VPS 3 foi selecionado na tela do configurador: **8 vCPU, 24 GB RAM, 300 GB NVMe, Ubuntu 24.04, Amsterdam AMS-01, sem painel, mensalidade-base € 13,99, contrato 1 mês**. Esse valor não é o total aprovado do checkout e não há comprovação de compra ou implantação.

**Definição funcional já aprovada da Universidade:** o primeiro ciclo C-00 usará dados e cursos totalmente fictícios, banco educacional separado e adaptadores simulados para identidade, elegibilidade, vínculo e eventos; não requer Portal/CRM prontos, Tutor IA, mídia real, aulas publicadas nem produção.

**Decisão pretendida neste Bloco A:** escolher uma stack inicial e uma topologia **apenas de desenvolvimento C-00**, documentar controles e critérios de prontidão sem declarar que já foram tecnicamente demonstrados. A autorização de **codificar e testar** será ato **Gate C posterior, expresso e distinto**.

## 2. Desenho candidato do desenvolvimento C-00

| Camada | Proposta Bloco A | Por quê/observações |
|---|---|---|
| Repositório | **rafhael100/imagine-universidade**, separado de Portal e CRM, com documentação existente preservada e branches/revisões de código somente após Gate C | Não converter histórico documental em produto implementado antecipadamente |
| Backend de educação | **PHP + Laravel**, candidato preferido sujeito a aprovação técnica; API isolada | Reaproveita competências e padrões cogitados para CRM; **não há versão de Laravel/runtime homologada** |
| Banco de dados | **PostgreSQL exclusivo para o ambiente UNI de desenvolvimento**, com papel, rede e volume segregados; preferencialmente contêiner próprio | Universidade permanece proprietária apenas dos dados educacionais; não acessa o DB comercial |
| Frontend inicial | **Shell estático** de catálogo fictício, gerado localmente ou servido em ambiente DEV protegido; sem serviço Cloudflare Workers pago/produzido | Evita dependência, custo e publicação pública antes de Gate C |
| Identidade e elegibilidade | **Mocks/adaptadores tipados** para contratos lógicos UNI-C01, C02, C03 e C04 | A fonte oficial de contratos/vínculos continua no Portal; sem acesso à conta/CRM real |
| Eventos | Emissão/recepção de eventos inteiramente simulados em ambiente de testes, com idempotência e falha fechada | Nenhum webhook real, cobrança, notificação a cliente ou n8n de produção |
| Filas/cache | **Não adicionar Redis, broker ou n8n nesta primeira etapa sem demanda técnica comprovada** | Menor custo e superfície de ataque; avaliar quando o primeiro fluxo exigir |
| Agentes e IA | **Fora do C-00**, inclusive Tutor IA e orquestração n8n | Serviços centrais separados, contratação e permissões independentes |
| Cursos/mídia | Apenas conteúdos sintéticos; **sem Stream, R2 de mídia, aulas protegidas reais ou publicação** | Aguardar contratos, autorização editorial e homologação próprios |

**A escolha de Laravel é uma recomendação, não uma homologação de framework.** Antes da autorização Gate C, registrar a versão suportada, dependências, manutenção, política de vulnerabilidades e critério de migração. Se outro stack oferecer menor risco/custo comprovado, submeter revisão específica.

## 3. Topologia física e isolamento candidatos

Servidor futuro: **uma única VPS Ubuntu 24.04 Leaseweb VPS 3** para vários ambientes de desenvolvimento, somente após contratação e provisionamento **separadamente autorizados**.

- Um projeto **Docker Compose** por sistema, com nomes de stack próprios, redes privadas distintas, arquivos de configuração/volumes próprios, usuários de serviço e segredos segregados.
- Universidade com seu **próprio PostgreSQL** e usuário de conexão sem privilégios administrativos. Sem portas públicas de bancos de dados/Redis ou socket Docker em containers de aplicação.
- Proxy reverso para eventual acesso ao ambiente DEV com TLS e **autenticação/restrição de acesso**; nenhum catálogo fictício público por padrão. Preferência por acesso VPN/Zero Trust ou allowlist, sujeito a homologação e custo.
- **Quotas de CPU/RAM/PIDs, logs e armazenamento por projeto**. Não fixar limites arbitrários antes de medir consumo das stacks simultâneas, CPU/RAM livres, pico, disco, rede e reservas do sistema.
- GitHub para código/documentação versionados; nenhuma variável secreta, banco ou token em repositório. Publicação por pipeline para ambiente DEV só depois de Gate C e autorização de infraestrutura; **jamais deploy automático em produção por este bloco**.
- **Contêineres não são VMs isoladas**: todos compartilham host/kernel. Acesso root/daemon Docker comprometido ameaça todas as aplicações. C-00 assume dados sintéticos e política de host seguro; elevar criticidade exige avaliar VPS separada.
- O **servidor central IA/n8n** permanece distinto. Nenhuma dependência operacional dele é necessária ao C-00.
- **A produção futura da Universidade** preserva desenho P0-09: API e banco próprios, VPS exclusiva de produção quando autorizada; frontend Workers e mídia Stream/R2 apenas como candidatos posteriores. A VPS DEV compartilhada não altera a decisão de produção.

### Capacidade não comprovada

Não há evidência de compra, acesso SSH, sistema instalado, recursos de Docker, cargas reais ou telemetria de 7 dias. Portanto:
- **8 vCPU/24 GB/300 GB são características ofertadas**, não evidência de capacidade livre ou de comportamento com cinco stacks concorrentes;
- capacidade, isolamento, compatibilidade de contêineres, backups, disponibilidade e custo exigem comprovação **em etapa operacional futura autorizada**;
- o parecer deste bloco é **de viabilidade arquitetural preliminar**, não de homologação da Leaseweb.

## 4. Dados e contratos: fronteira obrigatória

1. Dados **exclusivamente sintéticos** e catálogo fictício no C-00; sem contas de clientes, cartões, leads, estudantes reais, tokens, contratos ou vínculos verdadeiros.
2. Portal/serviços comerciais continuam autoridades para identidade/vínculo/elegibilidade. Universidade não pode conceder acesso por criação local de conta nem aceitar eventos sem autorização.
3. Os adaptadores simulados poderão representar mudanças de vínculo, expiração, indisponibilidade da autoridade, troca de empresa e revogação; estados inconclusivos negam novos acessos.
4. Mensagens de teste são versionadas e idempotentes, com chaves de correlação próprias e sem usar tópicos/filas/webhooks reais.
5. API Uni não recebe credenciais da base de CRM, não acessa servidor de produção, não publica mídia privada e não executa agentes.
6. A futura integração real UNI-C01..UNI-C08 dependerá de contratos de endpoints, schemas, autenticação, verificação de autoridade e homologação específica; **não é requisito bloquear a criação da fundação C-00**, desde que sua implementação use somente mocks e preserve o contrato lógico.

## 5. Backup e restauração do ambiente C-00

Política transversal já aprovada **como documentação**: Restic, backup diário, retenção-base inicial de 30 dias, verificações, restauração e Cloudflare R2 Standard com jurisdição **EU**, bucket privado por projeto e área adicional de recuperação protegida. A Universidade terá seu próprio bucket quando autorizado.

**Para início futuro da programação:** é possível desenvolver em sandbox com dados fictícios recriáveis e GitHub versionado **desde que o termo Gate C delimite claramente** o que pode ser perdido e os controles mínimos de recuperação. O servidor compartilhado e seu backup **não precisam estar implantados para autorizar exclusivamente escrita de código em ambiente local seguro**, se essa for a modalidade escolhida e explicitamente aprovada. Já **persistência de dados de desenvolvimento importantes na VPS exigirá** ambiente, segurança e backup adequados autorizados antes de depender deles.

**Nunca** confundir essas cópias com produção: os RPO/RTO 4h/8h do P0-09 são **metas futuras de produção, ainda não testadas**; não se estendem por inferência ao ambiente dev.

## 6. C00-01 a C00-06 — vínculos com entregáveis e prontidão

| Entrega futura | Proposta de ambiente / tecnologia | Critério para revisão após Gate C |
|---|---|---|
| C00-01 Repositório e pipeline | GitHub UNI isolado, branches de revisão, checagens locais e CI controlado | Código em PR, testes passados, sem segredos/deploy de produção |
| C00-02 Núcleo educacional | Laravel e PostgreSQL EDU próprios, migrações mínimas | Modelos fictícios sem mistura com dados comerciais e controle de escopo |
| C00-03 Mocks integração | Contratos UNI-C01–C04 simulados, sem APIs reais | Negação de elegibilidade indevida, replay e eventos fora de ordem |
| C00-04 Shell estático | Interface com catálogo fictício, sem mídia real | Acesso a dados privados exclusivamente pela API autorizada |
| C00-05 Segurança | Privilégios mínimos, logs mínimos, RBAC por ambiente, falha segura | Testes negativos de acesso cruzado, revogação e isolamentos |
| C00-06 Qualidade/revisão | Testes automatizados, evidência técnica, procedimento de rollback DEV | Revisão por papel técnico/segurança e rastreio das decisões |

Os testes citados são **critérios para execução futura após Gate C**, não executados agora.

## 7. Decisões Bloco A — aprovadas como diretrizes documentais, sem antecipar Gate C

| ID | Decisão específica | Status |
|---|---|---|
| UNI-BA01 | Utilizar a VPS Leaseweb **compartilhada SOMENTE DEV** como arquitetura candidata, não VPS de produção | **RATIFICADA COMO DIRETRIZ UNI; sem compra, capacidade ou isolamento homologados** |
| UNI-BA02 | Laravel/PHP como backend preferido do C-00; versão definitiva a validar | **APROVADO COMO DIREÇÃO TÉCNICA; versões a validar** |
| UNI-BA03 | PostgreSQL dev **próprio por Universidade**, rede, volume e usuário segregados | **APROVADO DOCUMENTALMENTE; implantação pendente** |
| UNI-BA04 | Shell estático DEV e mocks UNI-C01..C04; sem integração comercial ou mídia | **APROVADO DOCUMENTALMENTE; sem código** |
| UNI-BA05 | Docker Compose separado, quotas, portas restritas, segredos por stack | **APROVADO COMO PADRÃO DOCUMENTAL; sem configuração** |
| UNI-BA06 | Backup R2 EU por bucket UNI, Restic e custódia externa quando a VPS for ativada | **DIRETRIZ TRANSVERSAL APROVADA DOCUMENTALMENTE; EXECUÇÃO NÃO AUTORIZADA** |
| UNI-BA07 | Manter n8n/IA fora do C-00 e produção Uni separada | **RATIFICADO NO BLOCO A** |
| UNI-BA08 | Evitar gastos/cloud externa/CI pagável e usar somente dados fictícios no C-00 | **REGRAS ANTERIORES VIGENTES; LIMITES FINANCEIROS PENDENTES** |
| UNI-BA09 | Registrar critérios de segurança/aceite e não abrir Gate H/L nem produção automaticamente | **REGRAS ANTERIORES VIGENTES; DETALHES A RATIFICAR** |
| UNI-BA10 | Obter orçamento, equipe, limite financeiro e ato específico Gate C após conclusão dos Blocos A/B | **BLOQUEIO INALTERADO** |

## 8. O que ainda será exigido antes de liberar a programação

**Bloco A — ratificado documentalmente; pendem validações de execução:**
- aceitar ou alterar o stack preferido Laravel, banco dev separado, compose e mocks C-00, mantendo separação de produção;
- definir se Gate C abrangerá apenas código local/sintético ou exigirá acesso à VPS compartilhada já implantada; o segundo caso requer autorização financeira de infraestrutura, provisionamento e verificações anteriores;
- aprovar os critérios documentais de segurança/isolamento deste bloco, sem tratá-los como testes já executados.

**Bloco B — aberto:**
- designar responsáveis funcionais e pessoas/revisores técnicos/segurança, papel da IA e condições de revisão independente;
- orçamento integral C-00: horas humanas, rates, rateio da VPS compartilhada, CI, monitoramento, backups, custos de testes, contingência, câmbio e impostos;
- aprovar teto explícito em reais, limites por fornecedor e titular financeiro.

**Bloco C — aberto:**
- preparar **termo de abertura Gate C** com escopo C00-01..06, ambientes permitidos, orçamento/teto, equipe, controles, exclusões e aceites; obter **aprovação expressa posterior**.
- Nenhum começo de implementação, testes, VPS, pipeline ou aquisição está autorizado por este documento.

## 9. Próxima deliberação sugerida

**Solicitar ratificação da proposta como BLOCO A DOCUMENTAL PRÉ-GATE C**, sem abrir programação. Caso ratificada, consolidar a escolha técnica (BA02, BA03, BA05) e avançar ao **Bloco B — responsáveis e orçamento econômico/teto**. As versões de tecnologias, disponibilidade da VPS, limites reais e segurança continuam sob validação.

**Estado atualizado:** planejamento Gate D concluído; C-00 escopo candidato aprovado; **Bloco A aprovado documentalmente em DEC-UNI-BA**; [Bloco B — responsáveis e orçamento](PRE-GATE-C-BLOCO-B-RESPONSAVEIS-ORCAMENTO-E-TETO-C00-v0.1-2026-11-04.md) preparado para revisão, Bloco C pendente; **Gate C FECHADO, desenvolvimento NÃO autorizado**.
