# UNI C168 — Proteger comentários pendentes durante mesclagem

Durante a revisão da C167, foi identificada uma janela de perda
de observações: uma aula ainda marcada como PENDING podia conter
anotação local, mas a importação de uma revisão já preenchida
substituía essa anotação sem aviso. A mesclagem agora exige
igualdade da observação (ou campo local vazio) para essa transição.
Se diferentes, recusa **a importação inteira** sem alterar qualquer aula.

O diálogo de substituição também foi ajustado: depois de cancelar,
a interface informa que preservou os dados, permitindo que a CI
aguarde uma conclusão determinística, em vez de testar uma condição
de corrida do JavaScript.

Os testes Chromium exercitam a anotação preliminar divergente,
o bloqueio atômico e o cancelamento sem perda, além dos fluxos
C157–C167.

Não há armazenamento, publicação ou integração real com o Portal;
os treze gates continuam HOLD_NO_GO.
