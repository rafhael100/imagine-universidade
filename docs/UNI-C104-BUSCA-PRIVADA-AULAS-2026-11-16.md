# UNI C-104 — Busca privada em aulas publicadas

**16/11/2026 — PR #81 DRAFT — integração somente sintética, sem clientes reais.**

## Valor funcional

Além da busca existente pelo nome/resumo de cursos, o aluno passa a localizar uma expressão dentro das aulas. A tela apresenta até oito resultados e permite ir diretamente à aula correspondente. Não usa IA, APIs externas, serviços de indexação pagos, notas acadêmicas nem armazenamento de histórico pessoal de pesquisa.

## Segurança e autorização

- API **POST /universidade/private/search**, restrita a `university.grant:view`, CSRF, sessão servidor e `throttle:20,1`. O termo segue no corpo JSON, evitando a exposição em URLs de acesso.
- A consulta obtém empresa/sujeito exclusivamente do grant verificado no servidor; apenas a organização editorial central e aulas da **versão publicada atual** podem aparecer.
- A leitura valida termo literal Unicode de 3 a 60 caracteres e recusa controles, curingas SQL e comandos. A consulta usa parâmetros vinculados, limite de nove linhas e fornece somente oito resultados.
- A resposta inclui apenas IDs de curso/aula, títulos e trecho curto de conteúdo. Nenhum identificador do aluno, empresa, progresso, histórico ou credencial é retornado.
- Ao terminar a busca, o controller verifica novamente **a fonte Portal** e recusa transmitir os resultados se houver revogação ou revisão de autorização; o binding real segue `UnavailablePortalAuthority` (deny-all).
- O navegador usa `textContent`, valida IDs/tamanhos, só cria navegação para cursos já autorizados na biblioteca e limpa os resultados após falha ou HTTP 403/419.
- Se um resultado ficar desatualizado após republicação/retirada de uma aula, a navegação verifica a lista publicada atual e informa indisponibilidade, sem abrir outra aula por engano.

## Aceite técnico

- PHPUnit: rascunhos invisíveis antes da publicação, busca na aula publicada, mesma biblioteca para empresas elegíveis independentes sem conteúdo privado, caracteres inválidos, acesso administrativo fora de VIEW proibido, ausência de sessão e retirada do ar.
- Chromium sintético: busca real por POST, navegação até a aula encontrada, falha temporária sem resultados antigos, payload forjado e revogação que apaga as ações.
- PostgreSQL 18 em transação descartável: query real `LOWER/LIKE` com joins testa rascunho invisível, aula publicada encontrável, vínculo exclusivo da organização editorial e retirada do ar, sempre revertendo os dados sintéticos.
- Contrato estático: comparação da rota privada com filtros do repositório, limitação de resultados, revalidação do Portal e ausência de API externa.

## Restrições de lançamento

Os 13 gates do manifesto operacional permanecem `HOLD_NO_GO`. Esta função não concede acesso real, não publica conteúdo nem valida contratos, SSO/MFA ou revogação operacional. Os dados e o Portal são sintéticos durante os testes; sem merge, deploy, cobrança ou alteração da VPS.
