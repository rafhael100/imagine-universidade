# UNI C184 — Confirmação explícita de salvamento do CSV offline

**19/11/2026 · DRAFT · HOLD_NO_GO · somente laboratório**

## Risco observado

A página considerava `link.click()` como prova de gravação em disco, limpando `dirty` imediatamente. Navegador, sistema operacional ou usuário podem cancelar um download sem informar à página; fechar a aba depois disso perderia comentários não salvos, embora a interface dissesse «CSV exportado».

## Comportamento novo

A ação **Exportar revisão CSV** solicita o download, mas **não** remove o aviso de alterações sem salvamento. Surge um controle explícito **Confirmei que revisao.csv foi salvo**, habilitado apenas após tentativa de exportação válida. O revisor verifica que o arquivo existe no seu dispositivo e só então confirma. A confirmação limpa o aviso local somente se as 35 linhas ainda forem idênticas às exportadas. Qualquer alteração ou mesclagem posterior invalida a confirmação e exige nova exportação.

A confirmação **não** autentica nome de revisor, não prova aceitação pedagógica e jamais altera `HOLD_NO_GO`. A interface continua offline, sem rede ou persistência automática.

## Evidência esperada

- `scripts/check-editorial-offline-review.mjs` confirma a presença do controle offline.
- Chromium real `scripts/qa-browser-editorial-offline.cjs` confere aviso antes do reconhecimento, limpeza após confirmação e retomada do aviso quando notas mudam, sem receber resposta da rede.
- Verificar GitHub Actions da SHA exata antes de qualquer declaração de sucesso.

Sem merge, deploy, chaves, SSO, produção ou aprovação das 35 aulas. A fonte oficial de acesso no Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) e os 13 gates seguem pendentes.
