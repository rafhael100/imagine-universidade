# UNI ERD-R85–R87 — roteiro HTML acessível para revisão humana (20/11/2026)

**DRAFT · APENAS REVISÃO OFFLINE · HOLD_NO_GO.** Esta página NÃO é a Universidade publicada. Não autentica pessoa revisora nem substitui a interface Laravel do aluno.

## Entregas

- **R85:** `scripts/render-editorial-priority-html.mjs` gera HTML local, estático e legível por teclado a partir da fila source-bound das 35 aulas. Oferece idioma `pt-BR`, link de salto para conteúdo, índice com 35 âncoras, cabeçalhos consistentes e seções por aula. Cada aula contém ID, SHA-256, quatro contagens de palavras, possíveis sinais heurísticos e as seis perguntas (210 em todo o documento). Sem rede, scripts, cookies, dados pessoais, armazenamento, SSO ou grants.
- **R86:** `scripts/check-editorial-priority-html.mjs` verifica integridade de 35 seções, títulos, navegação e perguntas; CSP com hash SHA-256 do CSS exato; escape de títulos; nove negativas de falsa revisão, status aprovado, grant, release GO e identidade duplicada.
- **R87:** workflow `uni-erd-r85-r87-accessible-qa.yml` cria um arquivo HTML para leitura humana em artefato da CI com retenção de sete dias, apenas na branch de revisão e na SHA exata, com credenciais de checkout não persistidas.

## Como verificar

```bash
node scripts/check-editorial-review-priority.mjs
node scripts/check-editorial-priority-html.mjs
node scripts/render-editorial-priority-html.mjs > /tmp/uni-35-aulas-leitura.html
```

Abrir `/tmp/uni-35-aulas-leitura.html` localmente em navegador, percorrer com TAB e Shift+TAB e confirmar o índice e os conteúdos. **Os testes desta PR são estáticos; não equivalem a uma execução manual com leitor de tela, auditoria WCAG integral ou homologação visual Chromium.** A página orienta, não registra respostas e não publica conteúdos. Concluir os 210 pontos exige leitura humana independente e registro autenticado fora do documento.

## Fronteira de liberação

As 35 aulas continuam `PENDING_HUMAN_REVIEW`; os 13 gates continuam `NOT_VERIFIED` com `HOLD_NO_GO`. A [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) segue bloqueando autorização oficial de serviços ativos, revogação, SSO e identidade empresarial. `UnavailablePortalAuthority` continua *deny-all*. AppSec, DBA, LGPD, backups/restauração/rollback reais e staging privado também dependem de evidências independentes.

Sem merge, alteração de main, deploy, VPS, DNS, custos, dados reais ou grants.
