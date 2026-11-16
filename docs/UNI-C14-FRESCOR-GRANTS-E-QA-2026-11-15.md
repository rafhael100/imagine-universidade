# UNI C-14 — revalidação de grants e pré-homologação sem Composer

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Correções aplicadas
A autorização efetiva do Portal ainda é responsabilidade do middleware backend-to-backend; o objeto PortalGrant não é uma prova criptográfica por si só. Foi incluída uma segunda verificação defensiva no repositório da Universidade para evitar reutilização acidental de grants já vencidos por outras chamadas internas.

- `UniversityCatalogRepository::grantUsable` exige permissão exata VIEW ou MANAGE, empresa e sujeito válidos, revisão positiva, identificadores dentro dos limites e validade atual de até 60 segundos.
- Consultas de alunos e operações editoriais chamam a verificação antes de resolver empresa/organização.
- Conclusão de aula reconfirma validade após adquirir bloqueio do curso, imediatamente antes de gravar progresso.
- Auditoria editorial revalida a concessão na mesma transação; se o grant tiver vencido, a alteração editorial é revertida.
- O provisionamento de empresa revalida expiração dentro da transação, evitando cadastro após espera em bloqueio de banco.
- Testes Unit preparados para grants vencidos, TTL excessivo, revisão zerada, empresa ou sujeito vazios e papel incorreto, sem tocar o banco nesses casos.

## Verificações efetivamente executadas
O script `scripts/check-tenant-guard.php` faz **nove negações reais em PHP 8.4 sem Laravel, rede ou banco**, carregando a classe de provisionamento exata do projeto.

- Resultado: **9/9 passaram**, sem falhas.
- O SHA Git do script executado coincide com o blob do GitHub: `2a30b5c579518b406e5a2391fbd68e4538941a7b`.
- O SHA Git da classe `UniversityTenantProvisioner.php` testada coincide com o blob do GitHub: `f43531d54010742e32224d11d2f1cd094b4bf72a`.
- Os 31 casos anteriores de domínio PHP foram reexecutados e passaram. Total de **40 verificações PHP sintéticas** aprovadas.
- Os 12 casos SQLite de integridade executados na C-13 seguem documentados, mas não são testes PostgreSQL reais.

## Qualidade do roteiro de QA
- `scripts/check-local.sh` inclui lint dos scripts PHP, os nove testes de provisionamento e o contrato estático Node de interfaces/rotas.
- O procedimento não bloqueia indevidamente a investigação em sandbox quando `composer.lock` está ausente: usa validação exploratória e marca **explicitamente** que a versão não é reprodutível para deploy.
- O workflow manual e descartável também executará os nove casos quando for autorizado e estiver disponível para execução.

## Bloqueios ainda existentes
1. Repositório privado, sem Composer, sem drivers PDO SQLite/PostgreSQL e sem clone direto neste container. O workflow de QA manual da Universidade não foi executado.
2. Gerar/revisar `composer.lock` em ambiente confiável, executar PHPUnit/Feature, migrations e concorrência PostgreSQL18 de homologação, revisar logs e corrigir resultados.
3. Concluir Portal issue #848: concessão real de VIEW/MANAGE, serviço elegível ativo, contrato de sessão business, revogação, vínculo editorial e permissão de recurso, sob AppSec/DBA/LGPD.
4. Não publicar sem Gate C, backups, rollback, prova multiempresa, identidade visual, UI e autorização explícita.

**Nenhum merge, deploy, custo extra, dado pessoal ou concessão real de acesso foi realizado.**
