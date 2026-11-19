# UNI C160 — Navegação por pendência no revisor editorial

No revisor HTML offline de 35 aulas, o menu de cada curso mostra o número
atualizado de aulas ainda pendentes e o total de aulas. Dois novos controles
permitem pular diretamente para a próxima aula pendente ou para a próxima
que recebeu o status **NEEDS_CHANGES**, com navegação circular, sem alterar
nenhum registro ou gerar aprovação.

Os botões ficam desativados se não existir aula com a situação solicitada.
As contagens são atualizadas imediatamente ao selecionar o status de revisão
e ao importar um CSV anterior. Os valores são locais: não representam
validação da identidade do revisor nem autorização de publicação.

O laboratório Chromium prova que uma aula com necessidade de ajuste não é
oferecida como pendente e que a navegação circula até o item correto.
Permanecem os 35 hashes de origem, a validação CSV e a CSP offline,
sem rede, sem login e sem armazenamento invisível.

**DRAFT / HOLD_NO_GO.** Sem merge, deploy ou acesso real de clientes.
