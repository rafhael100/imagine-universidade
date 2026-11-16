# UNI C-56 — invalidar parecer técnico de publicação após edição

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Quando o editor altera campos de curso ou aula, o diagnóstico de publicação anterior passa a ser obsoleto, mesmo que a resposta do GET ainda esteja chegando. A interface invalida imediatamente o cartão de prontidão e incrementa um token monotônico. Respostas antigas, vindas de outro curso ou após edição, não podem exibir novamente um parecer de versão anterior. Após 403/419, o cartão e qualquer conteúdo remanescente também são limpos. O hash de conteúdo do servidor continua a barrar a publicação de mudanças concorrentes na transação.

Contratos Node e Chromium verificam atualização e limpeza ao editar. Isso evita indicar visualmente 'pronto' para conteúdo não salvo, mas não substitui revisão editorial humana nem fonte oficial de contratos do Portal.
