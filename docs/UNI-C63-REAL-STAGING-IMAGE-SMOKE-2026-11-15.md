# UNI C-63 — build e smoke real de imagens candidatas

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Uma nova etapa de GitHub Actions constrói as imagens de staging PHP-FPM Laravel e Nginx, **apenas em CI descartável**. O comando recusa Docker remoto, .env, dados de clientes e tentativas fora de pull_request. As duas imagens são construídas localmente, sem push, sem segredos, sem conexão com a VPS.

O smoke PHP executa `php artisan route:list` no **contêiner real** usando sistema de arquivos read-only, rede desativada, privilégios reduzidos e variáveis sintéticas; verifica que ext-sodium, pdo_pgsql e vendor/autoload.php estão presentes. O smoke Nginx usa `nginx -t` na imagem real, sem porta publicada. O smoke não autentica clientes e não inicia banco.

Essa validação busca falhas de build que o teste estático do Compose não detecta, mas não substitui contrato oficial de acesso do Portal, revisão AppSec/DBA/LGPD ou homologação privada real. `ops/release-gates.json` permanece HOLD_NO_GO.
