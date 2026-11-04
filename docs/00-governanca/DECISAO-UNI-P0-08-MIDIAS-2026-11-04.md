# DEC-UNI-P0-08 — Proteção e distribuição de mídias e materiais

**Data:** 04/11/2026.  
**Aceite:** resposta expressa "ok" à pergunta sobre aprovação do P0-08 conforme documentado.  
**Status:** APROVADO COMO ARQUITETURA-BASE, com fornecedores candidatos, sem homologação nem contratação.  
**Documento aprovado como base:** [P0-08 — Mídias e materiais protegidos](P0-08-MIDIAS-MATERIAIS-PROTEGIDOS-v0.1-PROPOSTA.md).

## Regras e escolhas ratificadas

1. **Materiais educacionais protegidos por padrão:** vídeo, áudio, transcrição, legenda, PDF, imagens, prévias e anexos. A posse de um link não substitui a autorização.
2. **Autorização backend obrigatória:** identidade, vínculo, empresa, serviço Imagine contratado elegível ativo, permissão, versão de conteúdo e status de publicação antes de emitir credencial de acesso.
3. **Cloudflare Stream** é a primeira opção **candidata** para vídeos privados, condicionada à exigência `requireSignedURLs`, testes de reprodução, assinatura, disponibilidade e orçamento.
4. **Cloudflare R2 privado** é a primeira opção **candidata** para arquivos e objetos; não expor bucket público. Acesso a objeto por autorização de backend e URL temporária ou proxy autenticado.
5. Credenciais de arquivos com até **5 minutos**; credencial inicial de vídeo com até **5 minutos**, quando o mecanismo puder ser separado do token de reprodução sem quebrar aulas. Reprodução com duração suficiente e revalidação na renovação, conforme P0-04.
6. Revogação de novas emissões e de permissões segue P0-03/P0-04; **não prometer revogação instantânea de tokens de vídeo anteriormente emitidos**, nem proteção absoluta contra gravação de tela.
7. Conteúdo só poderá ser publicado após inspeção, revisão de direitos/licenças, precisão técnica, acessibilidade e aprovação editorial humana competente.
8. A plataforma deve preservar versões, fontes, auditoria, backups, rotinas de suspensão e recuperação, segregação de empresas e políticas de privacidade.
9. Testes de aceite HT-UNI-MID01 a HT-UNI-MID18 serão executados após implementação; não são considerados homologados neste momento.

## Condicionantes mantidas

- **P0-09:** arquitetura de execução, isolamento, backups, monitoramento, metas RPO/RTO e responsabilidades.
- **P0-10:** custos de Stream/R2/Workers, minutos armazenados/entregues, região, câmbio, tributos e aprovação de despesas.
- **P0-05 e P0-12:** privacidade, contratos de fornecedores e homologação de segurança e conformidade.
- Outro fornecedor pode substituir candidatos após análise documentada e aprovação de mudança material.

**P0-08 encerrado quanto ao desenho de arquitetura-base. Não autoriza compra, implantação, publicação de cursos nem programação.**
