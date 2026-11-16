# UNI C-65 — servidor HTTP não-root no staging privado

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

O Nginx candidato de staging foi ajustado para **executar como usuário nginx não-root** e escutar na porta interna **8080**, não privilegiada. O Compose conserva a **única porta host no loopback 127.0.0.1**, exigida explicitamente, alterando somente o destino interno de 80 para 8080. O serviço web agora descarta todas as capabilities Linux, usa `no-new-privileges`, filesystem read-only, tmpfs específico e não acessa a rede interna privada do banco.

A proteção de arquivo PHP (`index.php` apenas), anti-indexação, Nginx sem fontes Laravel e ausência de publicação pública permanecem. O CI verifica essas garantias, roda `docker compose config --quiet` com env fictício e constrói/testa a imagem Nginx real sem rede ou deploy. O proxy TLS e as regras de firewall/reverse proxy reais continuam dependências de homologação e revisão AppSec.
