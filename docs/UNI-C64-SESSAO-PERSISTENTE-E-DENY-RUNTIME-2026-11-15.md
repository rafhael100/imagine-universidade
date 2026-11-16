# UNI C-64 — sessões realmente persistentes e acesso negado no runtime

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

O laboratório de sessões agora utiliza o **DatabaseSessionHandler do Laravel** sobre SQLite em memória, grava/recupera um payload fictício, simula expiração e comprova purga de registro pelo próprio handler. Isso valida o uso do schema de sessões e não cria identidade ou contrato de cliente.

O smoke adicional executa o **kernel HTTP Laravel real da imagem candidata**, alimentando requisições diretamente via PHP CLI dentro de contêiner sem rede, porta, env real, credencial ou permissão operacional. Verifica status 403 e cabeçalhos privados para rotas de aluno e administrador, inclusive contra cabeçalhos forjados de empresa e concessão. O arquivo do smoke é passado via stdin **sem entrar na imagem de staging**.

Essa prova deve passar antes de qualquer tentativa de homologação privada, mas não substitui contrato oficial do Portal, revogação online, sessões reais criptografadas, AppSec/DBA/LGPD ou rollback e deploy autorizados.
