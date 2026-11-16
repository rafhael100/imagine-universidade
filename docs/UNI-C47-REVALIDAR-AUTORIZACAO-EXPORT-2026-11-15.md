# UNI C-47 — revogação durante uma exportação de histórico

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY

O endpoint de exportação do aluno já consultava a autorização no middleware no início da requisição. Uma operação lenta no banco, porém, poderia retornar dados de progresso depois de um cancelamento de serviço ou revogação ocorridos durante a própria consulta.

Foi introduzido um método privado único no UniversityController que consulta novamente a fonte PortalAuthority através do PortalAccessGate e compara identidade, empresa, permissão e revisão com o grant inicial. A exportação só envia o JSON se a decisão atual ainda for válida. A mesma função atende o Tutor IA, que já tinha proteção semelhante, reduzindo duplicação e divergência de controles.

O teste Laravel injeta uma alteração da elegibilidade sintética exatamente após a consulta à tabela de progresso e antes da montagem da resposta. O retorno deve ser 403 e **não** deve conter identificadores de aula nem concluir operação de exportação; o histórico é mantido no banco.

Esse teste é sintético e não prova contratos/SSO reais nem revogação operacional do Portal. Continuam pendentes revisão AppSec, homologação de sessões e fonte oficial de serviços no Portal #886. Sem deploy, dados de clientes ou despesas.
