# UNI-MVP-C01 — Universidade Imagine, recorte mínimo para clientes
**15/11/2026 — proposta técnica em revisão, sem deploy, sem acesso real ou custo novo**

## Produto em uma frase
Área privada de aprendizagem que ajuda clientes Imagine a aplicar a metodologia **Visitas → Leads → Clientes**, crescer com cursos objetivos e utilizar seus sistemas contratados.

## Experiência do cliente (MVP)
1. Entrar no Portal Imagine com identidade e vínculo de empresa já validados.
2. Abrir **Universidade Imagine**, somente se a empresa possuir serviço elegível ativo e o usuário possuir permissão.
3. Escolher entre **Nossa metodologia**, **Negócios** e **Treinamentos Imagine**.
4. Abrir curso publicado, ler aula, aplicar sugestão opcional e marcar como concluída.
5. Retornar à biblioteca e continuar do ponto anterior. Conteúdo simples e adaptado ao celular.

Não incluir exames, provas, notas, ranking, certificados, venda de curso avulso, comunidade, fóruns ou recursos sociais no MVP. Conteúdo técnico só deve descrever versões dos sistemas já homologadas.

## Fluxo mínimo administrativo (somente após autenticação real)
1. Um operador Imagine autorizado acessa **Administrar cursos**.
2. Cria curso com título, descrição curta, categoria e ordem.
3. Cria aulas com título, texto curto e ordem, inicialmente rascunho.
4. Confere a versão e publica somente após revisão editorial.
5. Pode retirar curso/aula de publicação sem liberar endpoints públicos. A publicação não altera elegibilidade.

Para clientes, não mostrar botão de edição; para operadores sem permissão, negar todas as alterações. Autorizações do Portal devem ser verificadas no servidor em toda requisição, não somente ao entrar na tela.

## Estrutura técnica desta rodada
- Migração candidata para metadados de curso, aulas versionadas e progresso por organização+usuário+aula.
- Flags de publicação fechadas por padrão; sem dados reais.
- Serviço de progresso **100% mock em memória** para exercitar a política existente: rejeitar quando Portal sintético indisponível, vínculo perdido, serviço ausente, trial isolado, empresa trocada, revogação ou curso/aula em rascunho.
- Testes escritos de idempotência, negação, isolamento entre empresas/usuários e bloqueio de leitura após revogação.
- Nenhuma rota HTTP nova. O fallback de desenvolvimento continua 404.

## Pontos que NÃO estão implementados nesta rodada
- Autenticação real, conexão com Portal e papéis de administrador.
- Interface administrativa real; formulários de inclusão/edição.
- Eloquent, endpoints, persistência real no PostgreSQL, execução de migrações ou PHPUnit.
- Verificação no banco de que a aula pertence à empresa e está em uma versão publicada.
- Eventos auditáveis, backups, revogação de sessões, tratamento de concorrência e retenção conforme política aprovada.

**Obrigatório antes do backend real:** resolver curso/versão/aula dentro do escopo da empresa no servidor; não confiar em ID/flag enviada por cliente; usar vínculo real emitido pela autoridade Portal; negar falhas de comunicação; validar autorização em leitura e escrita; transações e constraints para idempotência; impedir acesso entre empresas em queries e testes integrados. O mock apenas documenta o comportamento esperado, não substitui nada disso.

## Critérios de prontidão
- [x] Recorte de produto simples e sem funcionalidades acadêmicas desnecessárias
- [x] Prévia offline navegável em PR #4 (não pública)
- [x] Migração candidata com cursos/aulas/progresso
- [x] Testes de unidade escritos para o mock
- [ ] Executar PHP lint, migrações e suíte em sandbox autorizado
- [ ] Validar isolamentos no PostgreSQL e definir regras de publicação/versionamento
- [ ] Integrar login/vínculo real e revogação imediata pelo Portal
- [ ] Administração mínima com permissão separada e trilha de auditoria
- [ ] Homologar conteúdos dos sistemas realmente entregues
- [ ] Revisão independente SEG/LGPD, backups, rollback e autorização do gate

## Sequência de entregas curta
1. Revisar e testar o mock e a migração.
2. Implementar backend mínimo e rotas privadas, com autorização central real.
3. Conectar a prévia ao backend sem refazer o visual.
4. Implantar em homologação isolada e testar Cliente vs. Admin vs. sem acesso.
5. Publicar somente mediante gates e revisão. Manter o projeto pequeno e útil.
