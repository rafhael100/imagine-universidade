# UNI C-37 — exportação de progresso sujeita a revogação atual

**15/11/2026 · teste adversarial sintético · DRAFT / NO-MERGE / NO-DEPLOY.**

O endpoint de exportação de C-36 deve seguir a mesma autorização backend do estudo: não pode usar snapshot anterior, cookie antigo nem assinatura isolada para responder depois do cancelamento do último serviço. Adicionamos teste Feature usando exclusivamente a autoridade fictícia injetada no ambiente Laravel de testes.

Cenários: aluno A com aula concluída exporta seu histórico; perda do último serviço nega a próxima exportação (403) sem apagar histórico; restauração comercial com Portal offline continua negada (403); Portal restaurado e serviço elegível ativo permitem ao aluno A recuperar o histórico; aluno B nunca recebe conclusões do aluno A. Nenhum dado real, token, grant de produção, deploy ou autorização automática é criado.

Esse teste **não prova revogação do Portal real**. A decisão operacional exige a fonte oficial autenticada de serviços elegíveis e revogação, sessão business/SSO e revisão AppSec/DBA/LGPD conforme Portal #886.
