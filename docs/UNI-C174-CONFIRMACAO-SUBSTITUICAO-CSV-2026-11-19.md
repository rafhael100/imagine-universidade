# UNI C174 — Confirmação obrigatória na substituição editorial

**Data:** 19/11/2026. **Escopo:** navegador offline, dados sintéticos, sem rede e sem aceite operacional.

## Risco corrigido

O modo de importação `replace` antes exigia confirmação somente quando o usuário já havia editado algo na sessão. Uma sessão sem alterações não é prova de que substituir um CSV é seguro: a pessoa pode ter selecionado o modo destrutivo sem perceber. A política padrão continua `merge`, conservadora e atômica.

## Comportamento

- Valida integralmente os 35 pares curso/aula e hashes antes de qualquer diálogo.
- Compara os 35 registros e informa no diálogo quantas aulas realmente mudariam. Exige confirmação explícita **mesmo quando `dirty=false`**.
- Cancelamento preserva todo o estado atual. Se o arquivo for idêntico, opera como no-op sem diálogo e sem mudar o sinalizador de alterações locais.
- Confirmação aplica a substituição atômica. Resultado nunca autentica revisor, conteúdo ou autoridade comercial e nunca emite permissão.

## Evidência esperada no Chromium

1. Editor limpo: importar arquivo com uma aula revisada exige confirmação; negar preserva 35 pendentes.
2. Confirmar altera exatamente uma aula e atualiza a contagem para 34 pendentes/1 ajuste.
3. Importar a mesma planilha novamente não exige confirmação, não duplica alterações e conserva a revisão.
4. As regressões de conflito, hash, aspas e Unicode anteriores continuam na mesma suíte.

**Gate:** DRAFT / HOLD_NO_GO / sem merge/deploy; Portal #886 e os 13 gates permanecem pendentes.
