# UNI C-17 — dependências reproduzíveis para PHP 8.3

**15/11/2026 · Revisão técnica; sem merge ou deploy**

## Resultado

O MVP Universidade passou 54 testes PHPUnit (304 asserções) e PostgreSQL18 em runner público; a dependência que faltava era um `composer.lock` versionado. O primeiro lock calculado em PHP 8.4 selecionava Symfony 8.1, que requer PHP 8.4.1. Como o `composer.json` declara PHP ^8.3, esse lock **não era adequado** para o ambiente mínimo suportado.

A resolução foi refeita usando `config.platform.php=8.3.0` no Composer. [Execução GitHub Actions #43757078495](https://github.com/rafhael100/imagine-universidade/actions/runs/43757078495) terminou com sucesso em runner descartável: 26 Unit + 28 Feature e migrações/checks PostgreSQL. O lock obtido contém **102 pacotes** (75 dependências + 27 de desenvolvimento), Laravel 13.42.0, PHPUnit 12.5.44, Mockery 1.6.15 e Symfony 7.4 em vez de 8.1; registra plataforma 8.3.0.

## Código entregue

- `composer.json`: plataforma mínima explícita `8.3.0`.
- `composer.lock`: dependências públicas travadas, com `content-hash` correspondente à resolução do CI. **Não contém credenciais privadas**.
- Workflow `.github/workflows/university-manual-qa.yml`: usa **PHP 8.3** e `composer install --no-plugins --no-scripts`, sem `composer update`; exportação temporária de base64 foi **removida**.
- `ops/qa/Dockerfile`: laboratório usa `php:8.3-cli-bookworm`.
- `scripts/qa-compose-entrypoint.sh`: bloqueia QA quando `composer.lock` está ausente; nunca faz atualização livre de dependências.

## Verificação final executada e aprovada

[GitHub Actions #43757330006](https://github.com/rafhael100/imagine-universidade/actions/runs/43757330006), HEAD `b172a009533714bceee14d45846a6cf0bebc80c0`, terminou **success** usando `composer install --no-plugins --no-scripts` diretamente do lockfile versionado.

O runner confirmou **PHP 8.3.36**, 26 Unit (70 asserções), 28 Feature (234 asserções), cinco migrações Laravel PostgreSQL 18, oito verificações estruturais e oito verificações relacionais PostgreSQL com rollback. Não houve `composer update` nem exportação de lockfile nessa execução.

O lock garante reprodutibilidade da resolução das dependências para PHP 8.3; ainda não é prova de homologação de SSO real, implantação ou segurança de produção.

O Docker Compose local ainda não foi executado no runtime da conversa. O Portal permanece fail-closed; serviço elegível ativo, emissor de grants, sessões de negócio, revogação real, AppSec/DBA/LGPD e implantação continuam NO-GO.

**Sem credenciais reais, despesas novas, alteração da main ou deploy.**
