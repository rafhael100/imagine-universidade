# UNI C-46 — Política de Conteúdo (CSP) com nonce por requisição

Data: 15/11/2026. Status DRAFT, NO-MERGE, NO-DEPLOY.

O middleware RequireUniversityGrant acrescenta a cada resposta privada um Content-Security-Policy. Para telas HTML autorizadas, o servidor gera nonce criptograficamente aleatório de 18 bytes, em base64, atribuído a script e style inline da mesma resposta via Blade. O navegador somente deve permitir JavaScript/CSS local ou aquele nonce específico. As demais diretivas bloqueiam recursos externos não permitidos, frames, objetos, scripts arbitrários e conexões para outros domínios. Não há unsafe-inline. O nonce muda em cada nova requisição e não vem do navegador.

Para respostas negadas com HTTP 403, aplica default-src none e bloqueia formulários e frames. Se o gerador criptográfico falhar, a resposta é recusada.

Testes Laravel Feature verificam que HTML do aluno/admin utiliza dois nonces idênticos aos do cabeçalho, um nonce diferente para cada requisição, ausência de unsafe-inline e CSP restritiva nas respostas negadas. O contrato Node também valida a sintaxe JavaScript e os atributos Blade.

O ensaio não constitui revisão AppSec de produção. A validação em navegador real, o Portal SSO elegível e os demais gates permanecem pendentes.
