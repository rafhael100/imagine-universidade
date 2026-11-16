# UNI C-102 — pacote completo para revisão humana das 35 aulas existentes

**16/11/2026 | Universo Universidade Imagine | PR #81 DRAFT**

## Avanço sem refazer conteúdo

O arquivo `content/mvp-cursos-v1.json` já possui **10 cursos e 35 aulas práticas**, cada uma com texto completo (mínimo atual de 95 palavras), exemplo explicitamente fictício, aplicação opcional e cuidado importante. Essas aulas são rascunhos, não estão publicadas nem homologadas editorialmente. Por isso, o trabalho necessário é **revisão e aceite humano**, e não recriar material que já existe.

## Entrega

O script `scripts/build-editorial-review-pack.mjs --out <diretório temporário>` converte o manifesto atual em pacote exclusivamente documental, contendo:
- `LEIA-PRIMEIRO.md`: índice dos 10 cursos, 35 aulas, instruções e SHA-256 integral do arquivo-fonte;
- `cursos/01-*.md` até `cursos/10-*.md`: texto integral de cada aula, seções pedagógicas, hash SHA-256 do conteúdo e itens de conferência;
- `revisao.csv`: uma linha por aula, com identificador, hash, status `PENDING_HUMAN_REVIEW` e campos vazios para responsável, evidência e observações;
- `manifesto-revisao.json`: informações verificáveis, contagem de cursos e aulas, hashes individuais, `publishable=false` e ausência explícita de qualquer aprovação.

O SHA-256 individual é calculado a partir de identificador do curso, título, categoria, slug/título da aula e texto. Mudar qualquer um desses campos exige nova revisão. O pacote não abre nenhum caminho de publicação, não cria certificações e não modifica o manifesto atual.

## Ensaios

`scripts/check-editorial-review-pack.mjs` gera o pacote em diretório temporário, verifica seus 10 arquivos, 35 textos completos, todos os hashes, os 35 status pendentes, restrições de publicação e preservação de bytes da fonte. A CI isolada gera um artefato temporário `imagine-universidade-revisao-editorial-PENDENTE`, sem dados de clientes.

## Próximo uso

Uma pessoa responsável deverá revisar cada texto e registrar decisões rastreáveis por hash e revisão no GitHub. **Arquivos marcados no CSV não são aprovações operacionais**: não existe publicação automática, acesso real ou exceção aos 13 gates `HOLD_NO_GO`. Revisões independentes de conteúdo, privacidade, segurança e UX continuam necessárias antes de homologar a VPS. Este pacote ajuda a cumprir a etapa editorial, não a substitui.
