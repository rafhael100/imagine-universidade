# DEC-UNI-P0-09 — Arquitetura-base de infraestrutura, backup e recuperação

**Data:** 04/11/2026.
**Aprovação:** resposta expressa "ok" à pergunta sobre aprovação do P0-09 com a arquitetura e as metas iniciais de recuperação apresentadas.
**Status:** APROVADO COMO DESENHO INICIAL DE PROJETO — não contratado, implementado ou homologado.
**Documento de referência:** [P0-09 Infraestrutura, backup e recuperação](P0-09-INFRAESTRUTURA-BACKUP-RECUPERACAO-v0.1-PROPOSTA.md).

## Decisões aprovadas

1. **Lançamento sem custo prematuro:** não contratar VPS de produção enquanto não houver necessidade, orçamento ratificado e autorização específica.
2. **Isolamento:** Universidade terá API e PostgreSQL educacional separados dos dados, credenciais e execução de produção do CRM. Na fase inicial, API e banco educacionais podem compartilhar **uma VPS exclusiva da Universidade**, reconhecendo o ponto único de falha; banco não recebe conexão pública.
3. **Frontend:** Cloudflare Workers Static Assets como candidato de baixo custo; dados privados e mídias exigem autorização pelo backend.
4. **Mídias:** Cloudflare Stream e R2 privados são opções candidatas segundo P0-08, sujeitas a custo/homologação.
5. **IA/n8n compartilhados:** utilizar os serviços centrais Imagine, com isolamento de fluxos, permissões, filas, credenciais e limites por projeto; n8n não é autoridade contratual.
6. **Segurança:** mínimo privilégio, credenciais por serviço, MFA administrativo, rede restrita, controles da origem, TLS, auditoria, atualizações e monitoramento.
7. **Backups:** cópia criptografada **externa** à VPS de produção e, quando viável, em domínio de falha separado; backups consistentes de PostgreSQL com logs WAL para recuperação pontual, cópias de originais de conteúdos e metadados, controle de chaves e verificação.
8. **Metas iniciais de recuperação:** **RPO de até 4 horas** e **RTO de até 8 horas**, apenas metas de projeto, **não SLAs homologados**. Retenção-base de backups educacionais **30 dias**, observadas exceções de privacidade/obrigações legais. Teste de restauração pelo menos a cada **90 dias** como política-base, inclusive antes do lançamento.
9. **Escala gradual:** sem VPS de produção durante planejamento; VPS exclusiva de pequeno porte no piloto; ampliar recursos ou separar banco/API conforme utilização e risco. Especificações de 2 vCPU / 4 GB RAM e depois 4 vCPU / 8 GB RAM são hipóteses de dimensionamento, não fornecedor ou capacidade homologados.
10. **Incidentes:** indisponibilidade do Portal/autorizador não libera novos acessos; indisponibilidade do Tutor não bloqueia cursos estáticos autorizados; restauração reaplica exclusões de dados e revogações.

## Pendências e limites

- A região, o plano efetivo da VPS, os fornecedores de cópias externas, a cotação de infraestrutura e os limites monetários estão em **P0-10**.
- Responsáveis, alçadas e operação em **P0-11**; validação por testes de carga, restore, segurança, desempenho e contingência em **P0-12**.
- Não existe infraestrutura provisionada nem testes de recuperação executados por esta aprovação.
- A decisão **não autoriza programação, contratação, reconfiguração de ambientes já existentes nem migração de dados**. Programação paralela permanece condicionada ao gate documental e aprovação posterior expressa.

**Resultado:** P0-09 concluído como arquitetura-base do planejamento; execução, fornecedores, orçamento e homologação permanecem pendentes.
