# UNI C189 — Reimportação idêntica não perde confirmação pendente

**19/11/2026 · DRAFT · HOLD_NO_GO · laboratório**

A C186 passou a preservar a opção de confirmação quando um arquivo inválido não modifica as 35 linhas. Esta regressão cobre um segundo caso que ocorre naturalmente no fluxo humano: após exportar o `revisao.csv`, a pessoa importa acidentalmente o mesmo arquivo, em modo conservador de mesclagem. O resultado deve ser um **no-op** com mensagem `CSV sem novidades`, sem apagar observações locais nem invalidar a confirmação do download anteriormente solicitado.

O teste em Chromium usa o CSV realmente exportado, passa pela validação de hash/identidades, importa de volta a mesma revisão e verifica o controle de confirmação e o estado textual. A alteração é **de cobertura de regressão**, não introduz autorização, persistência ou aprovação automática. Também aciona a bateria integral `[uni-full-qa]` para auditar as entregas C187 e C188 com browser/Docker/staging após a validação parcial anterior.

Somente pacote editorial offline. 13 gates `NOT_VERIFIED`, `HOLD_NO_GO`; Portal #886 pendente. Sem deploy, merge de PR, dados de clientes, SSO, custos ou alteração da VPS.
