# UNI C-23 — continuar para a próxima aula

**15/11/2026 · candidato de interface · DRAFT / NO-MERGE / NO-DEPLOY**

## Objetivo

Depois de concluir uma aula, o aluno pode seguir diretamente para a próxima aula pendente, sem procurar manualmente a posição na lista.

## Implementado

- O botão **Ir para a próxima aula** aparece depois de uma conclusão confirmada ou quando o aluno abre uma aula previamente concluída que tem outras pendentes.
- A escolha segue a ordem das aulas do curso atual. Ao chegar à última aula, procura pendências anteriores, evitando bloquear o aluno quando ele revisitou aulas fora de ordem.
- Quando nenhuma aula está pendente, apresenta **Você concluiu todas as aulas deste curso. Pode revisá-las quando quiser.** Não gera certificados, provas, pontuações nem promessas de resultados.
- O status de conclusão continua vindo da API privada, escopada ao grant validado; após confirmar o POST, a tela atualiza o indicador e oferece o próximo passo.
- A seleção utiliza apenas os IDs das aulas do curso já carregado e não aceita empresa ou sujeito enviados pelo navegador.

## Verificação

O verificador Node `scripts/check-ui-contract.mjs` agora **executa** a função de escolha de próxima aula em ambiente isolado e testa sequência normal, retorno ao início, todas concluídas e ID inválido. Também verifica os componentes da interface e mantém as checagens estáticas de segurança (CSRF, same-origin, no-store, ausência de HTML dinâmico inseguro).

Executar a suíte existente de PHP 8.3, PHPUnit, Node e PostgreSQL 18 descartável para homologação da alteração. A autoridade real do Portal continua desativada e requer contratos ativos oficiais, sessão, revogação e revisão SEG/DBA/LGPD antes de go-live.

**Sem merge, deploy ou acesso de cliente real.**
