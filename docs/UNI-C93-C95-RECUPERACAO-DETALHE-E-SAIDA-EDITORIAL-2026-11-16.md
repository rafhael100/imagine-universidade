# UNI C-93–C-95 — leitura segura de aula, edição persistente e falha de catálogo

**16/11/2026 — PR #81 — revisão técnica / não implantado**

## Objetivo
Concluir recuperação explícita de falhas temporárias também na **leitura individual da aula e do progresso**, proteger rascunhos quando o editor sai da página, e impedir que indisponibilidade da API administrativa seja tratada como "catálogo vazio" ou autorize edição sem contexto atualizado.

## Implementação
- **Aluno:** falha de corpo da aula ou progresso individual recusa exibir conteúdo parcial e botão de conclusão; mostra `Tentar abrir aula novamente` somente se a mesma aula permanecer selecionada e a sessão não estiver revogada.
- **Sessão expirada ou revogada:** HTTP 403/419 elimina conteúdo protegido e desabilita todas as tentativas manuais de recuperação. Resposta tardia de seleção antiga não reabre a aula.
- **Editor:** `beforeunload` pede confirmação nativa do navegador quando houver mudanças de curso/aula ou uma escrita em andamento; sessão revogada não impede navegação. Não usa `localStorage`, `sessionStorage`, cookies extras nem scripts externos.
- **Catálogo administrativo:** indicador `catalogReady` permanece falso até leitura atual autorizada. Com falha da API, a tela preserva a mensagem de indisponibilidade (não "nenhum curso"), desliga edição/criação e limpa os estados obsoletos. Recuperação bem-sucedida restabelece os controles; `beginWrite` continua negando enquanto o catálogo não estiver validado.

## Testes
- Estáticos JS: contrato de leitura detalhada, negação pós-revogação e `catalogReady`.
- Chromium isolado: 503 ao buscar corpo, 503 ao buscar progresso, recuperação manual, 403 no detalhe sem retry, editor com rascunho sujo/limpo no `beforeunload`, criação desabilitada durante indisponibilidade e habilitada após resposta atual.
- Os scripts e checks operam exclusivamente em fixtures sintéticas e servidor temporário `127.0.0.1`.
- Reexecutar PHPUnit, PostgreSQL18, contrato cruzado Portal, Chromium/axe, Docker e imagens PHP/Nginx após alterações; documentar o resultado por SHA e run.

## Restrições
A empresa não pode comprar acesso avulso à Universidade. SSO/MFA, elegibilidade de serviço ativo, revogação oficial, política SKU, source of truth, AppSec/DBA/LGPD e implantação da VPS continuam bloqueadores **HOLD_NO_GO**. Sem merge, deploy, cobrança, alteração em main ou credenciais reais.
