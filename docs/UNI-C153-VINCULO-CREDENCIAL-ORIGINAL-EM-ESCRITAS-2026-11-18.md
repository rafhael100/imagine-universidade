# UNI C-153 — Vincular gravação à credencial inicial do pedido

## Janela remanescente

A C152 confere a sessão antes e depois de sua consulta interna ao Portal.
Se outra credencial for colocada na sessão **entre a autorização inicial do
middleware e a primeira chamada a freshGrant**, a consulta interna poderia
aceitar a nova credencial e permitir uma gravação da requisição anterior,
caso ambas representassem o mesmo sujeito, tenant, permissão e revisão.

Não se trata de comprovar contrato ou SSO real; é uma condição de corrida
dentro da requisição sintética, com ambas as credenciais autorizadas
pelo adaptador de laboratório.

## Correção

- O middleware, após o primeiro grant válido, guarda no objeto Request
  apenas `hash('sha256', credencial)`, como marcador efêmero de vínculo.
- O controller exige que `freshGrant` receba a credencial atualmente
  presente na mesma sessão e que seu digest seja idêntico ao original
  antes de chamar a autoridade. O tenant também deve coincidir com o
  `PortalGrant` inicial.
- A conferência pós-autorização C152 permanece obrigatória; nenhuma
  resposta 403 é convertida em concessão.
- Não armazenar o valor original em logs, banco, cookie, payload ou
  marcador persistente. O hash é uma condição de integridade local e
  não autentica ninguém por si mesmo.

## Teste novo

`PortalBoundaryFlowTest` cria curso/aula com dados sintéticos e uma
autoridade que confere **o mesmo** tenant, sujeito, escopo e revisão para
duas credenciais distintas. Após a autorização inicial, uma consulta SQL
rotaciona a credencial da sessão, antes de `freshGrant`.

A requisição antiga de conclusão deve ser recusada sem inserção
de progresso e sem nova consulta autorizadora. Os testes das C151/C152
e os 15 caminhos transacionais já existentes continuam intactos.

## Limites

A proteção observa alterações na sessão do Request em execução.
Não prova coordenação distribuída entre workers, mudanças de sessão não
visíveis nesta requisição ou revogação contratual oficial. Sem ativar
`PortalAuthority` operacional ou qualquer gate de liberação. Sem migração,
endpoint, dependência, deploy ou custos externos.
