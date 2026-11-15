# UNI C-20 — progresso visível por curso no Cliente

**15/11/2026 · candidato de revisão · DRAFT / NO-MERGE / NO-DEPLOY.**

## Entrega funcional

O catálogo privado `GET /universidade/private/courses` agora inclui **`lessons_total`**, **`lessons_completed`** e **`progress_percent`** em cada curso publicado. Os dados são calculados a partir das **aulas publicadas na versão atualmente publicada** e dos registros de conclusão da empresa e pessoa do grant verificado pelo servidor.

A consulta faz uma única agregação `LEFT JOIN` por versão, restringindo `educational_organization_id` e `subject_key`. Não aceita organização ou usuário do navegador, não consulta histórico de outro cliente, não conta rascunhos ou versões arquivadas, e devolve contagem zero para conteúdo sem registros de conclusão. O guard `university:view` permanece obrigatório e é revalidado antes da resposta.

## Área do cliente

Na página Laravel da Universidade, seguindo a identidade laranja da Imagine:
- Resumo das aulas concluídas sobre o total dos cursos publicados.
- Em cada curso: texto **N de M aulas concluídas · P%** e barra de progresso HTML nativa com descrição acessível.
- Após confirmar uma conclusão, a interface consulta novamente a API em vez de assumir que o clique alterou o banco. Se essa atualização falhar, a conclusão persistida **não é revertida nem reabilita o botão**; o aluno recebe orientação para atualizar a página.
- Sem provas, certificados, classificações públicas, dados pessoais no HTML ou armazenamento local de progresso.

## QA

Os testes Laravel existentes receberam novas asserções de:
- Zero e cem por cento para aluno A quando a aula única é concluída, sem vazamento para aluno B.
- Retirada e republicação criam nova versão sem contar progresso de versão arquivada; dados históricos preservados.
- Manifesto de três cursos/oito aulas: totais 4, 2, 2; uma conclusão no primeiro curso equivale a 25%; outra empresa vê 0%.
- Verificador Node de interface exige componentes acessíveis e obtenção de progresso pela API.

## Critérios de homologação

Executar PHP8.3, PHPUnit Unit/Feature, Node UI, migrações e testes PostgreSQL18 em runner descartável. **Não confundir essa autenticação sintética de QA com o SSO verdadeiro do Portal**, que continua deny-all e bloqueado pela [issue #848](https://github.com/rafhael100/imagine-portal/issues/848).

**Sem merge, deploy, configuração real, despesa nova ou acesso de cliente.**
