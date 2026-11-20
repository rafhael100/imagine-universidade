# Universidade P0 — interrupção do PostgreSQL e isolamento de acesso (laboratório)

**20/11/2026 · DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY.**

## Lacuna única do checklist #12

O ensaio anterior [#152](https://github.com/rafhael100/imagine-universidade/pull/152) comprovou o caminho HTTP e a interrupção do PHP-FPM, mas **não** demonstrava a resposta das rotas privadas com o PostgreSQL temporariamente indisponível. Esta revisão cobre somente a falha de banco em Docker descartável, sem acrescentar produto, rota, login, permissão ou funcionalidade ao aluno.

A base é a HEAD exata `5000a5d32cfe579aad994e091c0374b143928d81`, não a PR histórica #85. A candidata de conteúdo #149 permanece intacta e sem aceite humano. A branch paralela de digests de imagens é independente e não deve ser sobrescrita.

## Ensaio controlado

1. Reutilizar a inicialização de três contêineres de teste isolados do script `scripts/qa-staging-postgres-http.sh`: imagens locais, PostgreSQL18 com credenciais fictícias, sem bind de porta de host, sem VPS e sem dados reais.
2. Verificar **antes de qualquer migração** a configuração Laravel resolvida e uma consulta SQL autenticada. A suíte antiga já exige essa condição.
3. Após o ensaio HTTP/FPM, parar **apenas** o contêiner PostgreSQL sintético e exigir respostas privadas Cliente/Admin sem sucesso indevido, sem vazamento de SQL/stack e com cabeçalhos `no-store`, CSP e `X-Frame-Options`.
4. Reiniciar somente esse contêiner; exigir consulta SQL autenticada e contagem de sessões persistida igual à anterior, então repetir a exigência HTTP de 403 sem autoridade Portal.
5. Apagar rede, contêineres e volume descartáveis pelo `trap`. Nenhuma migração ou alteração de banco real, sem chaves reais e sem liberação de usuário.

**Importante:** A resposta de indisponibilidade de banco é um resultado de laboratório a confirmar na SHA da execução. A CI pendente/vermelha representa uma lacuna reprodutível, não um teste aprovado. Reiniciar um contêiner não comprova backup, restauração de snapshot, rollback de versão, RPO/RTO nem disponibilidade da VPS.

## Gates preservados

Os 13 itens de `ops/release-gates.json` permanecem `NOT_VERIFIED`; `UnavailablePortalAuthority` segue como política efetiva de negação. Portal [#848](https://github.com/rafhael100/imagine-portal/issues/848) e [#886](https://github.com/rafhael100/imagine-portal/issues/886) não possuem fonte oficial homologada de serviço elegível ativo, sessão empresarial, revogação do último serviço ou perfis reais Cliente/Admin. Não habilitar SSO ou grants.

Próximas provas independentes: digests reais de release sob revisão separada; rollback com snapshot em homologação privada autorizada; fonte e revogação oficiais Portal; aceite humano editorial; AppSec/DBA/LGPD e decisão final de publicação. Nenhuma delas é substituída por CI.
