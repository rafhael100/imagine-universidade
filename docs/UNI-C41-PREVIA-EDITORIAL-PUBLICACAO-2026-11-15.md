# UNI C-41 — prévia editorial antes da publicação

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

O editor autorizado agora pode abrir uma **pré-visualização local** da aula a partir dos dados ainda não salvos no formulário. O navegador exibe título, parágrafos e três seções fixas (exemplo fictício, aplicação opcional, cuidado importante), todas por `textContent`. Não executa HTML, não faz POST de conteúdo e não muda o status de publicação.

Ao alternar aula ou curso, ao zerar o formulário ou ao perder autorização 403/419, a prévia é apagada. O botão de publicar exige confirmação explícita, informa que a revisão editorial independente é necessária e volta a verificar a seleção antes do comando de publicação.

**Limite de governança:** um `confirm()` não implementa alçada independente, assinatura, aprovação multipapel nem validação de conteúdo. A publicação operacional continuará dependente da governança editorial, da fonte oficial de serviços ativos e das revisões AppSec/DBA/LGPD antes de merge/deploy.
