# UNI C-48 — navegador real com API de laboratório sintética

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY

Novo ensaio com Chromium real e @axe-core/playwright, usando exclusivamente o HTML-fonte das telas Blade e valores substituídos de forma controlada em memória, mais o CSS/logo reais da branch. Um servidor HTTP local temporário, vinculado somente a 127.0.0.1:18762 no runner, responde a endpoints com dados fictícios sem consultar Laravel, Portal, VPS, banco ou credenciais. Uma regra de rede do navegador bloqueia qualquer URL externa. O ensaio não cria rota pública nem testa autenticação real.

A jornada verifica: entrada do aluno, catálogo, abertura de curso/aula, leitura por seções, conclusão e atualização do progresso; revogação HTTP 403 que limpa conteúdo e desabilita exportação; entrada do admin, seleção, pré-visualização segura de rascunho e histórico privado. Para aluno e administrador, analisa overflow em 320/390/768/1440 px, gera capturas em 390 e 1440 px com dados fictícios e executa Axe WCAG 2/2.1 A/AA, falhando em violações sérias/críticas. O job reporta apenas quantidades, não credenciais/HTML e anexa artefatos descartáveis com retenção de 7 dias.

A instalação do Chromium e bibliotecas segue versões fixadas em CI, sem custo de fornecedor adicional contratado; consome minutos/recursos do runner GitHub conforme plano. O teste é visual funcional sintético: **não** comprova SSO verdadeiro, vínculo a contrato elegível, revogação real, segurança do banco, homologação completa WCAG nem go-live. A fonte oficial e gate AppSec/DBA/LGPD continuam em Portal #886.
