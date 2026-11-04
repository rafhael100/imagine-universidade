# DEC-UNI-BA — Aprovação do Bloco A (Arquitetura e Ambiente Pré-Gate C)

**Data:** 04/11/2026.
**Status:** **BLOCO A APROVADO COMO BASE TÉCNICA DOCUMENTAL**, exclusivamente.
**Evidência da decisão:** resposta expressa **“ok aprovado”** à pergunta “Você aprova o **Bloco A**, incluindo Laravel, PostgreSQL independente, Docker Compose e integrações simuladas, mantendo a programação e as contratações bloqueadas até a autorização específica do Gate C?”.
**Documento-base:** [Bloco A — Arquitetura e ambiente C-00](PRE-GATE-C-BLOCO-A-ARQUITETURA-E-AMBIENTE-C00-v0.1-2026-11-04.md).
**Precedências:** [D15 — Gate D concluído documentalmente](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md); [UNI-C01 — C-00 aprovado como escopo inicial de planejamento](DECISAO-UNI-PRE-GATE-C01-ESCOPO-C00-2026-11-04.md); [P0-09 — infraestrutura futura](DECISAO-UNI-P0-09-INFRA-BACKUP-2026-11-04.md); [INF-DEV-01 — VPS Leaseweb desenvolvimento](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/INF-DEV-01-VPS-CENTRAL-LEASEWEB-2026-11-04.md).

## 1. Conteúdo aprovado como diretriz de desenvolvimento futuro C-00

1. **VPS central compartilhada Leaseweb para DESENVOLVIMENTO** dos produtos Imagine: a Universidade terá stack, rede, credenciais, volumes e quotas próprios; não usará ambiente nem banco de produção compartilhado.
2. **Laravel/PHP como framework/backend preferido e aprovado como direção técnica**, com versão, dependências e política de suporte ainda a validar e registrar antes da execução.
3. **PostgreSQL independente da Universidade**, com banco, papéis/segredos, rede e armazenamento segregados; sem compartilhamento de base com CRM/Portal.
4. **Docker Compose isolado por projeto**, sem portas públicas de banco ou acesso inseguro ao socket Docker; limites de recursos, firewall e controle de acesso conforme capacidade verificada futuramente.
5. **Frontend estático inicial com conteúdo fictício** e interfaces para contratos lógicos UNI-C01 a UNI-C04 simulados, sem dependência de APIs reais do CRM/Portal. Estados de elegibilidade inconclusivos não concedem acesso.
6. **Nenhuma integração real, conta de aluno/cliente, conteúdo editorial real, Tutor IA, processamento de dados pessoais, Stream/R2 de mídia, n8n ou deploy de produção no C-00**.
7. **Backup de desenvolvimento** segue a política transversal Restic + Cloudflare R2 Standard EU aprovada documentalmente, segregado por projeto; detalhes e ativação continuam pendentes de orçamento, conta, testes e autorização.
8. **Produção da Universidade permanece separada** da VPS de desenvolvimento compartilhada, conforme P0-09; não há autorização para VPS de produção, homologação de RPO/RTO, mídia ou lançamento.
9. **Critérios de controle e aceite de C00-01 a C00-06** permanecem como plano de execução/validação posterior, sem testes realizados.
10. É admissível definir num futuro termo Gate C **programação local segura com dados sintéticos**, mesmo antes de disponibilizar a VPS compartilhada, desde que o ambiente, escopo, proteção e custo sejam expressamente autorizados. Programação/deploy na VPS depende de aprovação/provisionamento/verificação independentes.

## 2. Condições e pendências não encerradas pela aprovação

| Código | Status após a aprovação |
|---|---|
| UNI-BA01..BA09 | **Diretrizes do Bloco A aprovadas documentalmente**, condicionadas à confirmação de versões, isolamento, segurança e capacidade em etapa autorizada |
| UNI-BA10 | **ABERTO**: orçamento, equipe, teto de despesas, termo específico e autorização Gate C |
| C02 (Pré-Gate C) | **ABERTO**: responsáveis designados e revisores independentes/controles compensatórios |
| C03/C04 | **ABERTO**: VPS não comprovadamente contratada; não auditada ao vivo; ambiente local ou VPS deve ser especificado no termo |
| C05/C06/C07 | **ABERTOS**: horas, custos totais, rateio da infraestrutura, teto incremental em R$, impostos/câmbio e consentimento financeiro |
| C08/C09 | **CONTRATOS-MOCK E CRITÉRIOS-BASE APROVADOS COMO DIRETRIZ**, mas esquema detalhado e procedimentos de aceite/segurança ainda devem ser fechados no preparo do Bloco C |
| C10 | **GATE C FECHADO — NÃO AUTORIZADO**; programação exige termo separado e nova aprovação expressa |

**A direção NÃO aprovou:** pagamento, compra ou implantação de VPS; criação de buckets R2, tokens e backups; instalação Docker/Laravel/PostgreSQL; configuração de pipeline; criação ou edição de código; testes, chamadas de IA pagas; acesso a contas/arquivos reais; implementação de integrações; piloto/homologação Gate H ou lançamento Gate L.

## 3. Próxima fase documental

**Bloco B — Responsáveis, esforço, orçamento e limites financeiros do C-00**. Transformar estimativas técnicas anteriores em proposta econômica e de responsabilidade, **sem inventar titulares, tarifas, disponibilidade de equipe ou teto financeiro**. Submeter essa proposta a aprovação separada; depois preparar termo de **Gate C** igualmente separado.

**Resultado:** Bloco A fechado apenas em sua dimensão documental. **Gate D concluído; Gate C não autorizado; Blocos B e C pendentes.**
