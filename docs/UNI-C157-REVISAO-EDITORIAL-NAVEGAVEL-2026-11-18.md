# UNI C-157 — Revisão editorial navegável (offline)

## Problema

A revisão das 35 aulas da Universidade já possuía um ZIP com 10 arquivos Markdown
e uma planilha CSV, mas não uma tela única para ler cada aula e registrar observações.
O trabalho continuava sujeito a aceite humano e não havia autorização de publicação.

## Entrega

O pacote editorial agora inclui revisao-navegavel.html com todo o conteúdo
original, identificador e hash SHA-256 de cada aula.

- Navegar pelos 10 cursos e 35 aulas; ler integralmente os rascunhos.
- Preencher status pendente, necessita ajustes ou DECLARAÇÃO HUMANA NÃO AUTENTICADA.
- Registrar revisora/revisor, issue/PR de evidência e observações locais.
- Exportar CSV com as sete colunas e os hashes exatos do validador existente.
- Rejeitar status incompatível, evidência inválida, texto de planilha iniciado
  como fórmula e campos de revisão inconsistentes.
- Avisar antes de fechar a página com alterações não exportadas.
- Executar sem servidor, rede externa, login, armazenamento no navegador,
  biblioteca de terceiros, banco ou chamada a IA.

O HTML usa CSS e JS embutidos com hashes CSP calculados pelo gerador, conteúdo
editorial inserido via textContent e nenhum script remoto. O estado editado
vive na memória do navegador; baixar o CSV é indispensável para guardar
observações. A revisão pode continuar no CSV em um editor de planilhas.

## Testes

scripts/check-editorial-offline-review.mjs gera uma cópia temporária do
pacote e verifica integridade da página, restrições de rede, hashes CSP e
35 linhas com status PENDING_HUMAN_REVIEW. Acrescentado ao job validation.

O ZIP de revisão editorial já existente passa a incluir o HTML automaticamente.
A geração nunca altera o manifesto de gates ou marca aulas como publicadas.

## Limites

A opção CLAIMED_HUMAN_APPROVED não comprova identidade ou aprovação: continua
sob revisão humana externa vinculada ao hash. O validador CSV permanece
com publishable=false, review_evidence_authenticated=false e
release_decision=HOLD_NO_GO. Nenhum contrato, SSO ou grant do Portal foi criado.

Sem merge, deploy, DNS, VPS, contas ou custos adicionais.
