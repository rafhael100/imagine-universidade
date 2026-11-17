# C-117 — percurso real do navegador pelo Laravel

17/11/2026 · Ensaio preparado para CI descartável. **HOLD_NO_GO** operacional.

## Objetivo

Conectar a interface editorial e a interface do aluno ao mesmo Laravel e SQLite
reais durante um percurso Chromium. O ensaio anterior de interface continua
útil para respostas atrasadas, inválidas e falhas controladas; este acrescenta a
verificação conjunta de rotas, middleware, Blade, CSRF, sessão, repositórios,
migrações e persistência.

Somente a fronteira de autorização usa identidades sintéticas. O navegador não
intercepta nem substitui respostas de catálogo, publicação, favoritos, progresso
ou tutoria. A única regra de roteamento do Playwright permite a origem loopback
do processo e bloqueia destinos externos. O binding normal de autorização
continua `UnavailablePortalAuthority`.

## Componentes e isolamento

| Componente | Responsabilidade |
|---|---|
| `scripts/qa-framework-browser.sh` | Verifica contexto CI, cria diretório privado, configura SQLite/sessão, inicia servidor loopback e limpa o processo e seus arquivos |
| `tests/Browser/LabGuard.php` | Revalida repositório, evento, ambiente, caminhos, chaves temporárias, origem HTTP e configuração Laravel |
| `tests/Browser/bootstrap.php` | Executa migrações reais, cria apenas a organização editorial e confere persistência ao final |
| `tests/Browser/router.php` | Carrega o kernel HTTP real e registra o provider exclusivo do ensaio depois do bootstrap normal |
| `tests/Browser/FrameworkBrowserServiceProvider.php` | Expõe somente as rotas de preparação da sessão e substitui a autoridade no router de teste |
| `tests/Browser/LabPortalAuthority.php` | Valida a credencial opaca da sessão contra três perfis fixos e o controle privado de revogação |
| `scripts/qa-framework-browser.cjs` | Conduz Chromium e faz afirmações sobre as respostas HTTP e a interface reais |

Os arquivos de teste não são registrados por `bootstrap/providers.php`,
`routes/web.php` ou pelo provider da aplicação. O Dockerfile PHP de staging usa
uma lista explícita de `COPY` sem `tests/` e instala autoload de produção sem
dependências de desenvolvimento. Assim, esse router e seu provider não fazem
parte da imagem runtime.

O script exige `CI=true`, `GITHUB_ACTIONS=true`, o repositório
`rafhael100/imagine-universidade` e `UNI_FRAMEWORK_BROWSER_LAB=synthetic`. Os
eventos admitidos são `push` na branch isolada
`fix/uni-c108-private-flow-2026-11-17` ou `pull_request`; o workflow existente
mantém também seus próprios filtros. Nenhuma dessas flags autoriza execução
manual em ambiente operacional.

Cada execução cria `RUNNER_TEMP/uni-framework-browser.XXXXXX` com permissões
privadas. SQLite, controle da autoridade, caches Laravel, views compiladas e
logs ficam nesse diretório. A sessão usa a tabela `sessions` real, com payload
criptografado e cookie HTTP-only. `Secure=false` corresponde exclusivamente ao
servidor HTTP ligado em `127.0.0.1`; não é uma configuração proposta para
staging. A chave de aplicação e o token do laboratório são aleatórios e
temporários.

O guard recusa arquivos de ambiente operacionais e também um eventual arquivo
Dotenv específico do laboratório. A configuração herdada de URLs de banco,
conexão de sessão e execução console é removida antes do bootstrap. Depois do
bootstrap, o guard confere o driver e o arquivo SQLite, o armazenamento, a
sessão criptografada e a ausência de bypass de middleware.

O servidor usa porta efêmera em `127.0.0.1`. Antes de abrir Chromium, o runner
confere o SHA-256 do token na rota de saúde; um processo alheio ocupando a porta
não pode ser confundido com a instância criada pelo script. As requisições
também precisam usar o endereço remoto e o Host loopback esperados.

## Contrato exclusivo de preparação

Todas as rotas abaixo exigem `X-Uni-Framework-Lab` com o token temporário. Esse
header só abre as rotas de preparação; não é identidade, empresa, permissão ou
grant aceito pelos endpoints de negócio.

| Método e caminho | Resposta ou efeito |
|---|---|
| `GET /__uni_ci/health` | Identificador `uni-framework-browser`, SHA-256 da instância e ambiente `synthetic-framework-browser` |
| `GET /__uni_ci/session` | Inicia sessão web real e devolve seu `csrf_token` |
| `POST /__uni_ci/session/editor` | Com CSRF válido, regenera a sessão e seleciona o perfil editorial fixo |
| `POST /__uni_ci/session/student-a` | Com CSRF válido, regenera a sessão e seleciona o aluno da empresa sintética A |
| `POST /__uni_ci/session/student-b` | Com CSRF válido, regenera a sessão e seleciona o aluno da empresa sintética B |

Cada POST retorna `ready:true`, o nome literal do perfil e o novo `csrf_token`.
O provider não aceita parâmetros para criar outros perfis, trocar empresa,
escolher pessoa ou elevar permissão. A credencial mantida no servidor é um HMAC
do perfil fixo com o token temporário.

| Perfil | Empresa | Pessoa | Permissão |
|---|---|---|---|
| `editor` | `imagine-editorial` | `ci-framework-editor` | `university:manage` |
| `student-a` | `ci-framework-company-a` | `ci-framework-student` | `university:view` |
| `student-b` | `ci-framework-company-b` | `ci-framework-student` | `university:view` |

Os alunos compartilham deliberadamente o mesmo identificador de pessoa em
empresas diferentes. O teste verifica que essa coincidência não compartilha
favoritos, conclusões nem revogação. O setup cria somente a organização
editorial: as organizações dos alunos são provisionadas pelo endpoint real de
inicialização, e todo conteúdo é criado pelos formulários editoriais.

O arquivo de controle tem exatamente quatro campos:

```json
{"schema_version":1,"editor":true,"student-a":true,"student-b":true}
```

O runner troca esse arquivo atomicamente para simular revogação. Ele fica fora
do document root, não tem rota de alteração e nunca contém material do Portal.
Arquivo ausente, ilegível, inválido ou com campos extras resulta em negação.

## CSRF e comportamento do framework

O ambiente é `synthetic-framework-browser`, não `testing`. O guard também exige
que `runningUnitTests()` e `shouldSkipMiddleware()` sejam falsos. Não há
`withoutMiddleware`, exclusão de caminho CSRF ou substituição do middleware.

O runner envia uma escrita editorial por APIRequest sem token e sem um header
de origem confiável e exige **419 JSON, sem redirecionamento e com no-store**.
Depois, o formulário legítimo cria o curso e as aulas usando a sessão e o token
emitidos pelo Laravel. O catálogo editorial vazio após a rejeição confirma que
a requisição inválida não gravou um curso.

Esse detalhe acompanha a implementação fixada em `composer.lock`, Laravel
13.42.0: a proteção de requisições considera a origem same-origin e a
correspondência do token. O caminho de erro 419 precisa evitar ambas as
condições de aceitação. Fontes primárias consultadas:

- [Kernel HTTP e bootstrap](https://github.com/laravel/framework/blob/v13.42.0/src/Illuminate/Foundation/Http/Kernel.php).
- [Registro e inicialização dos providers](https://github.com/laravel/framework/blob/v13.42.0/src/Illuminate/Foundation/Application.php).
- [Proteção contra falsificação de requisições](https://github.com/laravel/framework/blob/v13.42.0/src/Illuminate/Foundation/Http/Middleware/PreventRequestForgery.php).
- [Seleção de rotas e fallback](https://github.com/laravel/framework/blob/v13.42.0/src/Illuminate/Routing/AbstractRouteCollection.php).

## Percurso exigido pelo ensaio

O runner cobre, em sequência:

1. Sessão editorial real, rejeição CSRF e criação de curso e aula pelo editor.
2. Exclusão de uma aula temporária, proteção entre formulários com rascunhos
   simultâneos, salvamento de aula e curso e exclusão de um curso temporário.
3. Diagnóstico de publicação real, confirmação e POST com o mesmo hash de
   conteúdo revisado. A auditoria precisa conter as alterações feitas.
4. Duas sessões de aluno: catálogo compartilhado e favoritos privados que
   persistem após recarga. Remover o favorito de uma empresa preserva o da outra.
5. Conclusão de aula em uma empresa, com progresso independente na outra.
6. Tutor padrão indisponível com 503 real, mantendo útil o trecho literal
   autorizado sem gravar outra conclusão.
7. Retirada editorial: catálogo e favoritos visíveis ficam vazios, a aula antiga
   retorna 404 e a remoção da preferência própria retida continua possível.
8. Edição e republicação da nova versão: favorito retido reaparece, favorito
   removido não volta, progresso atual começa pendente e a exportação conserva
   a conclusão da versão histórica.
9. Revogação de uma empresa: escrita retorna 403, a interface purga conteúdo
   privado e não repete a operação. A outra empresa permanece autorizada. A
   restauração da elegibilidade comprova que a remoção negada não apagou o favorito.

A verificação final lê o mesmo SQLite e confirma sessões e registros de estudo
persistidos. O bootstrap convencional também confirma que o provider da
aplicação continua negando acesso por padrão.

## Execução e evidências

A etapa entra no job `browser-lab` existente, depois do ensaio de falhas
sintéticas. Reutiliza Playwright 1.58.2 e Chromium já instalados nesse job,
acrescenta PHP 8.3 com `pdo_sqlite`, `sqlite3`, `mbstring`, `dom`, `xml` e `sodium`,
e instala o Composer a partir do lock, sem scripts ou plugins. Invocação da CI:

```sh
NODE_PATH="$RUNNER_TEMP/uni-browser-packages/node_modules" \
UNI_FRAMEWORK_BROWSER_LAB=synthetic \
UNI_FRAMEWORK_BROWSER_EVIDENCE="$RUNNER_TEMP/uni-framework-browser-evidence" \
  bash scripts/qa-framework-browser.sh
```

As evidências usam um diretório separado e inicialmente vazio. A saída permitida
é composta por capturas da interface com conteúdo fictício, resumo das
verificações e contagens de persistência. Cookies, tokens, banco, sessões,
controle de autoridade e logs PHP não são publicados. O trap de saída, erro ou
sinal encerra o servidor criado pelo script e remove o diretório privado.

O setup tem prazo máximo de 60 segundos, a jornada Node de 180 segundos e a
conferência final de 30 segundos. O início de cada fase é registrado com um nome
fixo. Um timeout produz falha, nunca aprovação parcial. O percurso passou a
incluir também o download dos favoritos retidos e a atualização explícita da
visão editorial após publicação e retirada.

Falhas de bootstrap mantêm um diagnóstico restrito à etapa fixa e ao nome da
classe da exceção. O shell valida o formato e imprime somente esses dois
campos; a saúde HTTP oferece o mesmo formato ao runner. Mensagens, stack traces,
SQL, corpos de resposta brutos e headers não entram nesse diagnóstico.

Validações executadas localmente durante a implementação: `bash -n` no shell,
`node --check` no runner e `git diff --check`. PHP, SQLite e Chromium reais devem
ser executados exclusivamente pela CI; esses resultados não são presumidos a
partir da análise estática.

O ensaio comprova integração interna sob as identidades sintéticas descritas.
Não homologa SSO, contrato Portal, PostgreSQL operacional, retenção, configuração
de staging ou gates de liberação. Nenhum gate muda de estado por esta entrega.
