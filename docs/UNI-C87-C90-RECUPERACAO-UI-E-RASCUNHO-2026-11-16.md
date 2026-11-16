# UNI C-87 a C-90 — recuperação de leitura e proteção de rascunhos

**16/11/2026 | Universidade Imagine | PR #81 | DRAFT / HOLD_NO_GO**

## Objetivo de MVP

Evitar que uma indisponibilidade temporária no Portal ou na API privada obrigue o usuário a recarregar a página ou que a navegação editorial descarte trabalho ainda não salvo. Não introduz login, acesso público, nova dependência, armazenamento de dados pessoais no navegador nem grants de produção.

## Entregas na interface real

- **Aluno — biblioteca**: se `initialize` ou `courses` retornar erro recuperável, o catálogo permanece vazio e há ação explícita **Tentar carregar novamente**. Um clique realiza uma nova verificação de autorização no servidor, provisionamento permitido e leitura do catálogo. Não há retries automáticos ou chamadas repetidas concorrentes.
- **Aluno — aulas**: falha temporária de `courses/{id}/lessons` remove qualquer botão ou corpo de aula anterior e oferece **Tentar carregar aulas** apenas para o curso que continua selecionado. A revogação 403 ou sessão 419 invalida toda a UI e não exibe retry.
- **Editor — biblioteca**: erro temporário de consulta oferece **Tentar carregar cursos**, sem conservar dados editoriais, formulários ou prévias antigos e sem permitir retry durante escrita ou após revogação.
- **Editor — aulas**: erro de leitura da lista de aulas de curso selecionado mostra **Tentar carregar aulas** e zera dados da lista; a tentativa é manual, limitada ao curso ainda selecionado e bloqueada durante edição ou revogação.
- **Editor — rascunho**: selecionar outro curso, abrir novo curso, escolher outra aula ou criar uma nova aula confirma antes de descartar mudanças não salvas. Cancelar a confirmação preserva os campos e as ações anteriores. A troca de curso/aula atual não descarta os campos.

## Segurança e limites

- Recursos são recuperados apenas de endpoints privados preexistentes; nenhum dado do navegador vira empresa, usuário, credencial ou grant.
- `RequireUniversityGrant` mantém 403 e 419 como estado de sessão encerrada, purgando texto, listas, simulador e botões. O novo mecanismo de retry não contorna esse bloqueio.
- Conteúdo HTML é criado com `document.createElement`/`textContent`, não `innerHTML` nem armazenamento local; CSP nonce, CSRF, same-origin e `Cache-Control: no-store` mantidos.
- Não altera migrations, Portal authority, políticas de publicação, tutor, billing nem status do acervo. Os 10 cursos e 35 aulas continuam rascunhos, sem autopublicação.

## Evidências de QA

- `scripts/check-ui-contract.mjs`: proteções estáticas para os dois painéis, presença de recovery, negação pós-revogação e confirmação de descarte editorial.
- `scripts/qa-browser-synthetic.cjs`: casos Chromium de 503 de `initialize`, 503 de catálogo admin, 503 de listagens de aula aluno/editor, recuperação manual, ausência de lista obsoleta, sessão revogada sem retry e descarte de rascunhos cancelado. Checks de largura 320/390/768/1440 e WCAG do navegador mantidos.
- GitHub Actions em runner descartável sem segredos, sem acesso real, sem publicação.

## Critérios ainda abertos

- Fonte oficial de contrato/serviço ativo elegível no Portal, política SKU e carência comercial aprovada, revisão/revogação independente, business SSO/MFA e permissões por recurso.
- Revisão editorial por pessoa responsável, revisão AppSec/DBA/LGPD, acessibilidade em ambiente privado com sessão verdadeira, backup/restauração/rollback e homologação na VPS.
- Somente após aprovação dos 13 gates e autorização específica considerar merge/deploy.

**Não é homologação do lançamento nem autorização de ativação de clientes.**
