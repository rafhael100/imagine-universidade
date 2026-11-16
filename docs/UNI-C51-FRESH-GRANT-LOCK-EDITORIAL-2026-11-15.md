# UNI C-51 — expiração de grant durante bloqueios editoriais

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Os comandos de criação, edição, exclusão e publicação verificavam university:manage no início da requisição, mas o grant poderia vencer enquanto o banco esperava um lock. Foi adicionada uma segunda checagem de validade dentro da transação, imediatamente antes da primeira escrita, em sete caminhos: criar/editar curso, adicionar/editar aula, excluir aula em rascunho, excluir curso nunca publicado e publicar/retirar curso do ar.

Dois testes adversariais com dados sintéticos simulam expiração durante a leitura de versões sob bloqueio: publicar e excluir são negados sem alterar o banco ou gerar auditoria de sucesso. Não alteramos a fonte de autorização nem criamos serviço ativo. A revalidação local de TTL não substitui revogação transacional verificada pelo Portal; integração #886 ainda é no-go.
