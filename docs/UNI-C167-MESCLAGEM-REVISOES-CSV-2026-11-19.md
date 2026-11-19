# UNI C167 — Mesclagem segura de revisões editoriais paralelas

Dois revisores podem trabalhar em CSVs separados sobre os mesmos 35
textos e depois combinar os resultados no revisor offline.

**Padrão: Mesclar, sem apagar revisão existente.**
O aplicativo valida primeiro o arquivo completo (35 IDs, hashes, status,
nome, evidência e observações) e só então propõe a mesclagem:

- Revisão recebida pendente não sobrescreve item já preenchido;
- Revisão recebida não pendente é incorporada quando o item atual está
  pendente; não perde observação pendente incompatível;
- Duas revisões preenchidas idênticas são mantidas;
- Divergência entre duas revisões preenchidas, ou entre observações
  pendentes, recusa o CSV inteiro, sem mudanças parciais.

Há uma opção separada **Substituir todas** com confirmação explícita
se o trabalho local ainda não foi exportado. A validação do arquivo
acontece **antes** da confirmação, evitando diálogos para CSV inválido.

O Chromium exercita duas alterações distintas, conflito atômico,
preservação das notas e cancelamento de substituição, sem rede.
Nenhum status constitui aceite autenticado; os 13 gates permanecem
HOLD_NO_GO. Sem produção, merge ou deploy.
