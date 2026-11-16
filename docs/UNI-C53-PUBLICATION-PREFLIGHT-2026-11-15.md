# UNI C-53 — checklist de publicação e hash de concorrência

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

GET privado e somente gestor para `/universidade/private/admin/courses/{courseId}/publication-check` informa se há uma versão de rascunho, uma ou mais aulas preenchidas, avisos opcionais e uma impressão digital SHA-256 do curso/versão/aulas. Resposta é apenas **diagnóstico de conteúdo**, nunca aprovação editorial, grant, prova de contrato, SSO ou autorização de publicação.

Ao publicar, a API pode receber `expected_content_hash`, comparado **dentro da transação após lock do curso e revisão da autorização**. Alterações entre revisão e publicação causam 409 sem efeitos. O parâmetro permanece opcional para testes/consumidores legados, portanto não impõe aprovação editorial multipapel. Uma futura política de duas pessoas independentes deve ser definida a partir de identidades reais do Portal.

## Interface e teste de navegador

O painel editorial mostra botão de conferência e checklist acessível, impede consulta/publicação se houver edição não salva e faz POST acompanhado da impressão digital previamente conferida. O laboratório Chromium simula alteração local pendente, recusa publicar sem salvar e permite a consulta somente quando o formulário corresponde ao rascunho salvo. A prévia não publica nem substitui aprovação de outro operador. O provider Portal real continua indisponível por padrão.
