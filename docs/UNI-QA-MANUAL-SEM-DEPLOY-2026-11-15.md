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
- O workflow foi estendido para evento `pull_request` **somente do tipo `labeled`**, e o job só é executado quando o rótulo exato `uni-qa-approved` é aplicado a uma PR do próprio repositório cuja base é `main`. Eventos de criação, atualização, push ou agenda não executam o job.
- A opção `workflow_dispatch` continua disponível para quando o workflow for aceito na branch padrão; não é necessária para a PR atual.
- O rótulo `uni-qa-approved` deve existir no repositório e ser aplicado explicitamente pela equipe autorizada; **nenhum rótulo foi criado/aplicado e nenhum runner foi iniciado nesta entrega**. Antes de aplicar, verificar orçamento de minutos do GitHub Actions para o repositório privado e aprovar consumo dentro da franquia.
- Se o rótulo tiver sido aplicado anteriormente, removê-lo e reaplicá-lo é uma nova autorização explícita; não usar outros rótulos como substitutos.
- Quando/SE aprovado para execução, o GitHub Actions pode consumir minutos da franquia da conta e eventualmente gerar cobrança após os limites. Revisar uso/limites antes de acionar.
- As credenciais de PostgreSQL são sintéticas, restritas ao runner e diferentes das credenciais reais; o workflow não usa secrets do repositório.
- Permissões do token GitHub limitadas a contents:read; checkout sem persistir credenciais; nenhuma etapa de deploy, upload, release, merge ou SSH.
- O script Composer faz resolução exploratória porque composer.lock ainda não existe; **nenhuma dependência provisoriamente resolvida pode ser usada em produção**.

## Critérios de homologação que permanecem
- Criar e revisar composer.lock antes de produção; executar o workflow em ambiente autorizado e guardar logs de falhas e correções.
- Validar concorrência e isolamento multiempresa no PostgreSQL real de homologação, não somente em SQLite.
- Homologar as permissões do Portal, vínculo do serviço elegível, sessão business/MFA, revogação e consulta de recurso sob mesma fronteira de confiança (Portal issue #848).
- Revisões SEG/DBA/LGPD, auditoria, retenção, backup, rollback, acessibilidade e aprovações para merge/deploy.

**Estado atual:** workflow pode ser acionado via rótulo explícito em PR de revisão, mas continua sem execução; nenhum rótulo aplicado, novo workflow disparado, mudança na main ou na VPS.
