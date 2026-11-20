# Imagine Universidade — ERD R133–R136: revisão sequencial das 35 aulas

**DRAFT · HOLD_NO_GO · 20/11/2026.** O relatório HTML offline continua uma leitura sintética, não uma plataforma de autenticação ou um aceite editorial.

- **R133:** cada uma das 35 aulas ganha links nativos "anterior"/"próxima aula na fila" e "voltar ao índice". A ordem de prioridade **não** é a ordem curricular; ambos os números são visíveis, sem scripts ou armazenamento.
- **R134:** preservar destinos `article tabindex="-1"` e nomes de links que informam a posição na fila e no currículo para leitor de tela e teclado.
- **R135:** QA estrutural sobre 35 artigos, 34 links de volta, 34 para frente, 35 retornos e cinco cenários negativos de adulteração; detecta links externos inesperados.
- **R136:** workflow isolado na SHA exata, reportando somente testes concluídos. A CI não assina as aulas nem substitui teste manual de teclado/leitor de tela.

### Reproduzir

```sh
node scripts/check-editorial-priority-queue-links.mjs
node scripts/check-verify-editorial-priority-html.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

Critérios independentes continuam sem evidência: 35 aulas/210 perguntas sem aceite humano autenticado, issue Portal #886 sem fonte oficial e 13/13 gates `NOT_VERIFIED`. Nenhum merge, deploy, VPS, DNS, contrato, cliente, SSO ou grant real.
