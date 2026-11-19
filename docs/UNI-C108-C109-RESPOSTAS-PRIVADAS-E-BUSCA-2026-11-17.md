# UNI C-108/C-109 — Respostas privadas e recuperação da busca

**17/11/2026 — proposta em branch isolada, dependente das PRs #81 e #84.**

## Problemas corrigidos

**C-108:** os cabeçalhos de privacidade estavam ligados ao middleware de concessão. Uma falha de CSRF anterior a ele, ou uma rota inexistente dentro do endereço privado, não tinha a mesma política de resposta. Além disso, uma requisição de formulário inválida sem `Accept: application/json` podia seguir o tratamento de validação padrão do framework, com redirecionamento e armazenamento temporário da entrada na sessão.

**C-109:** quando o aluno abria um resultado da busca e a lista de aulas retornava uma falha temporária, a ação manual de tentar novamente perdia o identificador da aula selecionada. Isso podia abrir a primeira aula pendente do curso em vez do resultado escolhido.

## Comportamento da proposta

- `ProtectPrivateUniversityResponses` protege o prefixo exato `/universidade/private` e seus descendentes, inclusive respostas de erro: cache privado sem armazenamento, proibição de enquadramento e indexação, proteção de tipo de conteúdo e CSP restrita.
- O middleware global aplica a política nas respostas normais; o callback final de exceções também cobre falhas renderizadas fora da cadeia. Códigos HTTP e `Retry-After` são preservados.
- Exceções em URLs privadas são devolvidas em JSON mesmo para requisições que aceitem HTML. A validação não redireciona nem grava termos de estudo, perguntas ou rascunhos como entrada temporária na sessão.
- Somente HTML autorizado com resposta de sucesso recebe o nonce CSP gerado no servidor. A revalidação do Portal, os limites de identidade e a negação padrão permanecem nos componentes existentes.
- A recuperação manual da lista mantém a aula exata escolhida na busca. Se ela não existir na lista publicada atual, a tela informa indisponibilidade e não abre nem oferece conclusão de outra aula.
- `/up` e prefixos semelhantes, como `/universidade/private-other`, conservam o comportamento anterior.

## Verificação reproduzível

O novo `PrivateUniversityResponseBoundaryTest` exercita o pipeline HTTP real do Laravel: CSRF ausente/incorreto (419), token correto sem autorização Portal (403), validação sem negociação JSON (422), limite real de 20 pesquisas por minuto (429), falha de banco SQLite descartável não migrado (500), rota privada ausente (404/HEAD) e URLs de controle. Nenhuma rota de autorização ou concessão foi adicionada para os testes.

O teste existente de `PortalBoundaryFlowTest` continua verificando a rotação do nonce e sua correspondência com scripts e estilos das telas do aluno e editor. A suíte Chromium acrescenta quatro verificações da busca com falha temporária, recuperação do alvo exato e resultado retirado.

A automação `.github/workflows/uni-branch-qa-isolated.yml` desta proposta seleciona exclusivamente a branch `fix/uni-c108-private-flow-2026-11-17`, usa um grupo de concorrência próprio e inclui alterações das views entre seus gatilhos. Reutiliza as suítes existentes com dados sintéticos, PostgreSQL 18, contrato Portal fixado, navegador e contêineres descartáveis. A base também contém as regressões C-107 da PR #84.

**A execução e seus resultados são registrados na PR com o SHA exato e o link do GitHub Actions.** A existência dos testes neste documento não equivale, por si só, à aprovação da execução ou à homologação operacional.

## Condições de operação

Permanece `HOLD_NO_GO`: o manifesto de 13 condições de liberação, a fonte oficial Portal #886, a revisão humana do conteúdo e a homologação privada continuam pendentes. O provider real segue `UnavailablePortalAuthority`; nenhuma alteração de login, serviço elegível, cobrança, credencial ou permissão foi feita.

Esta proposta não mescla as branches existentes, não altera `main`, não publica cursos e não usa VPS, DNS ou dados de clientes. As 35 aulas continuam em revisão editorial. A Universidade continua benefício exclusivo de clientes com serviço Imagine elegível ativo, com aprendizagem voluntária e sem provas, notas ou certificados.
