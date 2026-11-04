# D14 — Proposta de aceite documental de riscos e dependências

**Data:** 04/11/2026
**Estado:** **PROPOSTA NÃO APROVADA — ACEITE DO RESPONSÁVEL PENDENTE**
**Base:** [registro de 15 riscos e dependências](RISCOS-DEPENDENCIAS-GATE-D-v0.1.md), [auditoria final v0.3](AUDITORIA-FINAL-DOCUMENTAL-GATE-D-v0.3-2026-11-04.md), [alternativa financeira A](DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md), P0-11 e P0-12.

## 1. O que significa aceitar D14

**Aceite documental de D14** significa reconhecer, classificar, dar autoridade funcional e controlar as pendências nos gates futuros. **Não** significa assumir que o risco foi eliminado, aceitar falha de segurança, dispensar conformidade, autorizar gastos, validar fornecedores ou autorizar programação.

O registro RD-01 a RD-15 é a referência de governança. Uma função institucional pode acumular atividades, mas ações críticas mantêm revisão humana independente ou controle compensatório aprovado. A indicação nominal de titulares e suplentes será obrigatória antes do piloto.

## 2. Matriz proposta de tratamento e bloqueio

| Risco | Estado / decisão de tratamento | Gate que deve bloquear enquanto não houver evidência |
|---|---|---|
| RD-01 — Financeiro | **R$ 0 em novas despesas documentais aprovado; orçamento e teto de programação pendentes** | **C**, antes de qualquer programação ou gasto |
| RD-02 — Interfaces Portal/CRM | Desenvolvimento isolado com mocks somente **após autorização Gate C**; integração real requer contratos homologados | C para integração efetiva; H para uso real |
| RD-03 — LGPD | Política-base aprovada; parecer e fornecedores antes do uso de dados reais | H |
| RD-04 — Provedores/cotações | Stream/R2/Workers/VPS candidatos; avaliação e autorização de contratação próprias | H; despesas exigem aprovação antes de ocorrer |
| RD-05 — Tutor/IA | Ferramentas sem escrita operacional; modelos, dados, limites de custo e testes a homologar | H |
| RD-06 — Backup/recuperação | RPO 4h e RTO 8h como metas; restauração deve ser testada | H |
| RD-07 — Revogação de mídia | Separar bloqueio de nova concessão de token já emitido; medir limites do fornecedor | H |
| RD-08 — Conteúdo desatualizado | Publicação só de aulas revisadas e compatíveis com versão efetiva do produto | H/L |
| RD-09 — Responsáveis nominais | Matriz RACI aprovada; nomear responsáveis, suplentes e escopo antes de usuário real | H |
| RD-10 — Termo D | **Não foi assinado; somente aceite futuro e separado conclui Gate D** | **D** |
| RD-11 — 666 textos históricos não recuperados | Preservar proveniência e distinção entre histórico e nova base v5, sem reconstrução presumida | Restrição documental contínua |
| RD-12 — Testes de segurança | Testes de sessão, permissões, eventos, isolamento, IA, mídia e recuperação com evidência | H |
| RD-13 — Catálogo editorial | 60 cursos são referência; primeira onda até 12, com orçamento/licenças/revisão | H/L |
| RD-14 — Precedência histórica | Etiquetar documentos antigos, aplicar decisões posteriores e corrigir divergências sem apagar originais | **D** até revisão/aceite |
| RD-15 — Operação e incidentes | Responsáveis e suporte, alertas, escalonamento, continuidade e custos controlados | H/L |

## 3. Condições expressas para a ratificação de D14

Se ratificada, esta matriz permite considerar **documentalmente tratados e classificados** os riscos RD-01 a RD-15, **não encerrados tecnicamente**. Os bloqueios definidos deverão ser reavaliados em seus respectivos gates, sem autorizar exceção tácita.

- A **alternativa A (R$ 0 de despesas novas documentais)** permanece a única decisão de custos aplicável ao Gate D. Orçamento e teto de desenvolvimento serão decisão separada antes do Gate C.
- Implementação em paralelo a Portal/CRM é possível **somente após Gate D + Gate C expressos**, respeitando integração com funcionalidades homologadas.
- Dados reais, serviços pagos, contratos com operadores e lançamento ficam bloqueados até seus gates e autorizações.
- Nenhum parecer jurídico, teste de carga, pentest, teste de restauração ou homologação de IA/Cloudflare está sendo dado como executado.
- Aprovar D14 não encerra o Gate D: **D13 já foi aprovado documentalmente** ([decisão](DECISAO-UNI-D13-COBERTURA-DOCUMENTAL-2026-11-04.md)); o **termo de encerramento D15 permanece pendente** de aprovação expressa e separada.

## 4. Pedido de decisão

**Proposta para futura ratificação expressa:** aceitar a **classificação e o tratamento documental** de RD-01 a RD-15 conforme esta matriz, preservando os bloqueios dos Gates C/H/L e sem aceitar riscos inaceitáveis como resolvidos.

**Estado atual:** D13 **APROVADO DOCUMENTALMENTE**; D14 **PENDENTE** de ratificação; D15 **NÃO ASSINADO**. Gate D aberto; Gate C não autorizado; Gate H e L não iniciados/autorizados; nenhuma nova despesa autorizada.
