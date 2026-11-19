# UNI C-152 — Recusar gravação se a sessão mudar durante o grant transacional

## Lacuna

A C151 fecha uma janela de liberação de respostas GET/HEAD no middleware,
mas ações de escrita não devem depender de verificações **após o commit**.

`UniversityController::freshGrant` já consulta a autoridade do Portal dentro
do fluxo transacional. O método capturava os campos da sessão, chamava
`PortalAccessGate::authorize` e conferia apenas o grant retornado.
Se a sessão do servidor mudasse enquanto a autoridade aguardava, um grant
válido para os dados antigos ainda podia ser devolvido ao repositório e
permitir uma operação sobre o escopo anterior.

## Mudança delimitada

Depois da consulta à autoridade, confirmar novamente na **mesma requisição**
os valores custodiados pelo Laravel:
`portal_server_credential` e `portal_company_id`.

Qualquer divergência faz `freshGrant` retornar `null`, preservando os
resultados conservadores existentes, antes de um commit de negócio.
A verificação anterior de tenant, sujeito, permissão e revisão permanece.

O adaptador operacional segue `UnavailablePortalAuthority` e nenhum
acesso é concedido por esta alteração.

## Evidência de regressão

Dois testes HTTP usando autenticação sintética substituem apenas a autoridade:

1. Durante a segunda verificação do Portal, alterar a empresa de A para B.
   O POST de conclusão deve recusar sem inserir progresso.
2. Durante a mesma verificação, alterar a credencial para outra empresa.
   O PUT de favorito deve recusar sem inserir preferência.

O envelope retornado pela autoridade permanece válido para A nos dois
cenários. Assim, o teste distingue a proteção nova da validação já existente
de grant e do bloqueio pós-resposta para GET.

## Limites de segurança

Os cenários testam mutações observáveis no objeto da sessão desta requisição,
não sincronização entre workers concorrentes nem cancelamento real de contratos.
Sem novos endpoints, migrações, grants, usuários, dependências ou credenciais
operacionais. Continuam os 13 gates `HOLD_NO_GO`, com Portal #886 como dependência.
A CI isolada deve validar PHPUnit/PG/Chromium e a linha de segurança antes de
qualquer integração ou publicação.
