# UNI-C08 — trilha mínima de auditoria editorial

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Objetivo
Permitir que a Imagine identifique **quem** criou, alterou, publicou ou retirou do ar cada curso/aula, com registro mínimo e sem armazenar senha, token, IP ou texto de aula. Nenhuma auditoria de comportamento pessoal do aluno foi adicionada.

## Implementação
- Migração `educational_audit_events`: organização editorial, `actor_key` pseudônimo do Portal, ação, tipo/ID do recurso, revisão de autoridade e instante; chaves e índice de consulta.
- Auditoria ocorre dentro da **mesma transação** de criação de curso, edição de curso, criação/edição de aula, publicação e despublicação. Falha de gravação da auditoria deve abortar a alteração editorial.
- A gravação exige grant com `university:manage`, empresa editorial exata e sujeito validado no backend. Não confundir permissão de estudo com gerência.
- Teste Feature sintético confirma sequência de três eventos (curso, aula, publicar), ausência de eventos pelo progresso do aluno e quarto evento ao retirar curso do ar.
- Sem interface pública ou endpoint de consulta de auditoria. A leitura futura será exclusivamente de operadores Imagine autorizados.

## Catálogo continua simples
Três áreas: metodologia Visitas → Leads → Clientes, negócios e treinamentos dos sistemas homologados. Cursos de leitura curta, progresso individual e publicação por equipe Imagine. Sem provas, certificados, cobrança de cursos ou funcionalidades sociais.

## Gates não resolvidos
1. Validar a migração e transações em PostgreSQL real com testes de falha, retry, rollback e concorrência.
2. Aprovar finalidades, retenção, acesso e descarte dos registros de auditoria com LGPD/segurança.
3. Homologar o identificador `actor_key` derivado do Portal e comprovar vínculo do editor à organização Imagine (Portal issue #848).
4. Executar PHPUnit/Feature, PHP lint, testes HTTP e revisão independente antes de ativar qualquer operação real.
5. Manter autorizações deny-all até o Portal emitir decisões verificáveis, com elegibilidade real e escopo do recurso.

**Não foram executadas migrações nem auditoria em produção. Nenhum merge, deploy ou custo foi realizado.**
