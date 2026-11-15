# Universidade Imagine — QA manual descartável (candidato)

**15/11/2026 · Não operacional · DRAFT / NO-MERGE / NO-DEPLOY.**

## Para que serve
O arquivo .github/workflows/university-manual-qa.yml define um ensaio futuro em runner efêmero com PHP 8.4, Composer e PostgreSQL 18 sintético. Não inicia aplicações, não aponta para a VPS, não abre login real e não publica material.

A execução prevista inclui:
1. Conferência do evento manual, APP_ENV=testing e banco uni_ci no host 127.0.0.1.
2. Scripts de política em PHP puro, SQL sintético SQLite e contrato estático de interfaces Node.
3. Resolução descartável das dependências Composer, ainda sem lockfile aprovado.
4. PHPUnit Unit e Feature com pdo_sqlite.
5. Migrações Laravel no PostgreSQL 18 do próprio runner, sem dados reais.
6. Confirmação de que o provider do Portal continua negando acesso por padrão.

## Restrições e como não causar despesas
- O evento configurado é **somente workflow_dispatch**: não há gatilho por push, pull_request ou agenda.
- **Importante:** um workflow_dispatch normalmente exige que o arquivo de workflow exista na branch padrão para poder ser iniciado pela interface/endpoint. Como este arquivo está apenas numa branch DRAFT, **não foi executado nem está disponível para disparo manual imediato**. Não copiar para main sem decisão de gate.
- Quando/SE aprovado para execução, o GitHub Actions pode consumir minutos da franquia da conta e eventualmente gerar cobrança após os limites. Revisar uso/limites antes de acionar.
- As credenciais de PostgreSQL são sintéticas, restritas ao runner e diferentes das credenciais reais; o workflow não usa secrets do repositório.
- Permissões do token GitHub limitadas a contents:read; checkout sem persistir credenciais; nenhuma etapa de deploy, upload, release, merge ou SSH.
- O script Composer faz resolução exploratória porque composer.lock ainda não existe; **nenhuma dependência provisoriamente resolvida pode ser usada em produção**.

## Critérios de homologação que permanecem
- Criar e revisar composer.lock antes de produção; executar o workflow em ambiente autorizado e guardar logs de falhas e correções.
- Validar concorrência e isolamento multiempresa no PostgreSQL real de homologação, não somente em SQLite.
- Homologar as permissões do Portal, vínculo do serviço elegível, sessão business/MFA, revogação e consulta de recurso sob mesma fronteira de confiança (Portal issue #848).
- Revisões SEG/DBA/LGPD, auditoria, retenção, backup, rollback, acessibilidade e aprovações para merge/deploy.

**Estado atual:** infraestrutura de QA documentada como código candidato, nenhum novo workflow disparado, nenhuma mudança na main ou na VPS.
