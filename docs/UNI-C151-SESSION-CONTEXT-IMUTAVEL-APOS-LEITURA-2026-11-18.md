# UNI C-151 — Invalidar leitura se a sessão servidor mudar de contexto

## Problema

O middleware de leitura (`RequireUniversityGrant`) verifica o Portal antes
e depois de montar uma resposta privada. A segunda verificação, porém,
reutilizava a empresa e a credencial capturadas **no começo da requisição**,
sem garantir que a sessão custodiada pelo servidor ainda continha os mesmos
valores. Uma troca de empresa ou rotação de credencial durante a leitura
poderia fazer a verificação antiga continuar válida e liberar dados da
empresa anterior.

Este cenário não depende de claims do navegador. O teste altera somente a
sessão do Laravel no decorrer de uma requisição GET sintética.

## Correção

- Antes da segunda consulta à autoridade, exigir que `portal_company_id`
  e `portal_server_credential` continuem idênticos aos valores capturados
  na primeira verificação.
- Repetir as comparações **após** a própria segunda consulta, pois a
  transição também pode ocorrer durante sua espera.
- Divergência, ausência de sessão ou erro de consulta resultam em 403 privado,
  sem devolver o corpo da leitura, sem permitir fallback por grant anterior
  e sem criar um novo login.
- Aplicar a GET e HEAD existentes. Escritas permanecem sob suas validações
  transacionais próprias; não se adiciona uma checagem HTTP pós-commit.

## Regressões da fronteira HTTP

Em `PortalBoundaryFlowTest`, com banco SQLite e identidades sintéticas:

1. A empresa muda de A para B após a consulta de cursos e antes da liberação.
2. A credencial muda após a consulta, mesmo que a empresa ainda seja A.
3. A sessão muda **durante a segunda verificação** por uma autoridade
   sintética que continua retornando grant válido para A.

Todos devem resultar em `403 access_denied`, sem o título ou slug do
curso anterior. Os testes de revogação, CSP, leitura normal e isolamento
já existentes continuam obrigatórios.

## Limites

A comparação detecta mudanças visíveis no objeto de sessão desta requisição;
não demonstra sincronização entre múltiplos workers, revogação real em tempo
real ou integração SSO. Esta continua dependente de uma fonte oficial do
Portal (issue #886), revisão de segurança e todos os treze gates.

Nenhum grant de produção foi ativado; provider padrão continua deny-all.
Sem novo endpoint, migração, dependência, chave, merge, deploy ou VPS.
