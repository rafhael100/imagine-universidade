# UNI ERD-R100–R103 — sentinela do binding Portal (20/11/2026)

**DRAFT · segurança defensiva no ambiente sintético · HOLD_NO_GO.**

## Falha reproduzível

A inspeção anterior do AppServiceProvider confirmava a presença de exatamente um binding textual PortalAuthority → UnavailablePortalAuthority e do tutor desabilitado. Porém, três alterações perigosas permaneciam aceitas pelo analisador de tokens: mover o binding para um bloco if(false), adicionar return antes do registro e sobrescrever a autoridade usando app()->bind, pois o contador reconhecia somente $this->app->bind. Esses caminhos poderiam fornecer uma falsa sensação de validação do deny-all se o código de produção fosse modificado.

## Alterações

- R100: sentinela read-only exige o blob Git exato do AppServiceProvider, atualmente bfca33ddefb01a1e7de37d9505fb838fa16920a4, além da inspeção pré-existente. Qualquer mudança no provedor exige atualização explícita da sentinela com revisão supervisionada.
- R101: três fixtures comprovam que o scanner antigo aceita os desvios, enquanto o novo controle os rejeita. Mantidas as seis negativas de binding previamente existentes e os dez cenários reais de negação VIEW/MANAGE.
- R102: CI isolada executa PHP lint e regressões em PHP real, sem Composer, banco, HTTP, SSO ou dados empresariais reais; mantém os 13 gates em NOT_VERIFIED.
- R103: documentação de limites e procedimento. A impressão digital Git SHA-1 não é uma assinatura nem identifica autoridade externa. Ela restringe mudanças locais ao provedor até nova revisão de código. Não substitui análise semântica PHP, revisão AppSec ou provas operacionais.

## Comandos

    php -l scripts/check-portal-default-deny.php
    php scripts/check-portal-default-deny.php
    php scripts/check-access-domain.php
    node scripts/check-release-gate-policy.mjs
    node ops/staging/check-release-gates.mjs

A fonte real de serviços ativos, revogação independente, identidade empresarial e SSO da issue Portal #886 continua não homologada. Zero grants, zero aceite humano das 35 aulas e 13/13 gates NOT_VERIFIED. Sem merge, main, deploy, VPS, DNS ou custos adicionais.