# UNI C-54 — inventário de VPS compartilhada antes de homologação

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY / NÃO EXECUTADO NA VPS.**

O script `inventory-readonly.sh` é **somente de leitura**. Quando executado manualmente por um operador autorizado na VPS Linux escolhida, ele valida a porta de loopback candidata, Docker local (sem contexto remoto), nomes de contêineres de staging existentes e limites preliminares de memória livre (2 GiB) e espaço (10 GiB).

Ele **não escolhe uma porta por conta própria**, não reserva sockets e não altera rede, contêineres, DNS, firewall, volumes, arquivos de ambiente, serviços ou credenciais. `18081` é recusada por seu histórico de conflito/reserva com os demais módulos Imagine. Uma porta que está livre no instante do teste pode ser utilizada por outro serviço segundos depois; novas verificações são necessárias antes de qualquer publicação.

## Execução manual eventual

Em uma cópia limpa do repositório, já na VPS e após aprovação de infraestrutura, execute:

`bash ops/staging/inventory-readonly.sh PORTA_CANDIDATA`

Substitua a expressão por um número inteiro entre 18000 e 60000 **identificado previamente no inventário real**, sem presumir disponibilidade. O comando deve ser usado somente no host local; Docker remoto, contexto diferente de default ou recursos insuficientes causam HOLD.

## Gates restantes (sem autorizações implícitas)

- Fonte oficial e independente de serviços/contratos elegíveis ativos e revogação no Portal #886/#848, identidade empresarial, autorização de equipe editorial e permissões `university:view/manage`.
- Cópia de segurança e restauração operacionais específicas da Universidade; o teste sintético Docker não representa o banco da VPS.
- Escolha de porta e projeto Docker isolados **após** inventário de contêineres, redes, volumes e impacto no CRM, Sites, Portal e outros.
- HTTPS/reverse proxy, filtragem de rede, sessões persistentes seguras, papel PostgreSQL runtime de menor privilégio, segredo/rotação, políticas LGPD e rollback.
- Aprovação AppSec/DBA/LGPD e publicação manual com supervisão. Nenhum comando `docker compose up` ou deploy consta desta entrega.

QA do GitHub valida a sintaxe do Bash e que o script não contém comandos de alteração de Docker ou redes. O QA **não executa o inventário em uma VPS real**.
