# UNI ERD-R53–R54 — Triagem editorial navegável por curso (19/11/2026)

**Estado:** revisão DRAFT e sintética; nenhuma liberação de acesso, aprovação editorial ou produção.

## R53 — situação por curso
A navegação dos 10 cursos apresenta, além do total de pendentes, quantas aulas exigem ajustes e quantas contêm **declarações não autenticadas**. O rótulo é atualizado quando o formulário muda de situação; não é reescrito quando somente uma observação textual é alterada, preservando a estabilidade dos anúncios e do foco.

## R54 — escolha da próxima aula acionável
Selecionar um curso conduz à **primeira aula pendente de revisão humana**; se não houver, à primeira com ajustes; se todas estiverem apenas com aceite declarado, conduz à primeira aula para consulta. A ação continua exclusivamente local e posiciona o foco no título da aula, com a seleção feita por botão nativo navegável via teclado. O usuário pode continuar usando anterior/próxima sem alterar status involuntariamente.

## Segurança e verificação
- Os estados são derivados das mesmas 35 linhas do pacote de revisão, não de dados de clientes.
- O rótulo **declarações não verificadas** jamais concede aceite editorial autenticado.
- R55 contempla regressões estáticas e Chromium por curso, navegação com teclado, mudança de estado e controle de foco.
- Ensaio: `node scripts/check-editorial-offline-review.mjs`; CI isolada na branch contém QA Chromium com Playwright/axe, sem rede de aplicação.
- A autoridade padrão do Portal permanece `UnavailablePortalAuthority` e o tutor permanece desabilitado.
- `ops/release-gates.json`: 13/13 `NOT_VERIFIED`, `HOLD_NO_GO`. Dependência operacional: [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).
- **Não realizar merge, deploy, criação de custos, VPS, DNS, SSO, grants ou acesso a clientes.**

Não substitui revisão editorial humana das 35 aulas, QA/AppSec independente, homologação privada, backup/restore e autorizações operacionais.