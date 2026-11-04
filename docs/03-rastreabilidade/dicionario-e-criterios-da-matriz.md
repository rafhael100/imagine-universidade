# Orientação de uso da matriz de 986 IDs

## Campos principais

- `id_previsto`: identificador esperado de inventário; ainda não validado contra a fonte canônica correspondente.
- `texto_rastreado_em_conversa`: texto **quando foi possível transcrevê-lo de uma mensagem aprovada**; vazio significa ausência de redação recuperada, não inexistência de requisito.
- `fonte_do_texto`: origem textual das transcrições. Nenhum registro nesta planilha foi verificado em arquivo canônico próprio.
- `conferencia_da_fonte_canonica`: explicitamente não conferido.
- `status_funcional`: aprovação funcional registrada em conversa, distinta de especificação implementável concluída.
- `status_implementacao`: nenhum item implementado nem homologado.

## Próxima validação necessária

Conferir cada requisito contra seu documento original, registrar SHA/versão e posição, validar precedência e corrigir conflitos com as decisões vigentes. Somente então a linha pode receber o estado CONFERIDO_CANONICO.
