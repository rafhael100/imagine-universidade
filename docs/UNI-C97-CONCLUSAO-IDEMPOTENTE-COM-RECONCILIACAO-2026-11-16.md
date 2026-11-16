# UNI C-97 — confirmação de progresso com resposta perdida

**16/11/2026 — PR #81 DRAFT, código candidato e testes sintéticos, sem grants reais**

## Defeito evitado

Um `POST /lessons/{id}/complete` pode ser gravado pelo servidor, mas o navegador receber timeout ou HTTP 503. Reabilitar o botão imediatamente permite ao aluno emitir outro POST sem saber se a primeira gravação foi efetivada. Também não é correto declarar conclusão baseada somente em um retorno HTTP 200 sem `completed === true`.

## Fluxo implementado

1. Bloqueia o botão antes do POST e exige confirmação explícita de sucesso `completed: true` para marcar o progresso.
2. Se a resposta do POST falhar ou vier sem confirmação, **não reenvia a operação**. Consulta exclusivamente `GET /lessons/{id}/progress`, sob a mesma sessão privada.
3. Se o GET retornar `completed === true`, atualiza o progresso e informa que a conclusão foi confirmada pela consulta ao servidor.
4. Se o GET retornar exatamente `completed === false`, libera botão para **nova tentativa explícita do usuário** e não declara a aula concluída.
5. Se o GET falhar ou retornar resultado ambíguo, deixa o botão **desabilitado** e orienta reabrir a aula antes de tentar novamente. Uma sessão 403/419 ou mudança de aula invalida a resposta.
6. A falha secundária ao atualizar o catálogo não desfaz uma conclusão já confirmada nem reabilita o botão.

## Cenários de regressão

- POST gravado e resposta HTTP 503 perdida: GET confirma concluído, sem segundo POST.
- POST não gravado e HTTP 503: GET confirma pendente e o aluno pode optar por reenviar.
- POST gravado e GET falha: resultado incerto, botão continua desabilitado, sem reenvio automático.
- A primeira leitura de aula continua protegida por validação do Portal e pelo contexto de tenant, usuário e revisão.
- Nenhum contador de conclusão/recebimento vem de dados fictícios para a operação real.

## Gates não modificados

Esta lógica **não** habilita o Portal, não cria usuário público ou login independente, não publica cursos e não elimina a exigência de revisão/revogação do acesso ao longo da transação. A homologação de acesso real permanece **HOLD_NO_GO** até fonte oficial de serviços ativos, SSO/MFA, política comercial SKU aprovada, revisão AppSec/DBA/LGPD, VPS e rollback.
