# Imagine Universidade — ERD R137–R140: Chrome real na navegação da fila

**DRAFT · 20/11/2026 · HOLD_NO_GO.** Esta verificação usa somente o HTML offline gerado do currículo sintético versionado, sem contas, SSO, contratos nem rede externa na página.

- **R137:** 34 transições nativas com **Enter** para a próxima aula, comparando o destino com a posição real na fila (diferente da posição curricular).
- **R138:** 34 transições de retorno, foco efetivo no artigo com `tabindex="-1"`, ausência de links anterior/próxima nos extremos e retorno ao índice.
- **R139:** navegador Chrome real em viewport móvel, sem overflow horizontal, sem requisições HTTP(S), sem exceções JS e sem achados WCAG 2.1 A/AA graves/críticos pelo axe.
- **R140:** workflow com dois jobs, SHA exata, proveniência byte a byte do HTML e 13 gates ainda bloqueados. Dependências do navegador instaladas apenas no runner descartável, não na VPS.

### Limites

Teste automatizado não substitui homologação humana com tecnologias assistivas ou aceite das 35 aulas e 210 itens de rubrica. O domínio Portal não possui fonte contratual homologada; issue #886 segue aberta, `UnavailablePortalAuthority` continua padrão, 13/13 gates `NOT_VERIFIED`.

Nenhum merge, deploy, `main`, VPS, DNS, credencial, SSO, grant, custo contratado ou cliente real.
