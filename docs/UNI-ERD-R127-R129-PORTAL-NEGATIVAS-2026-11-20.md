# Imagine Universidade — R127–R129: respostas negativas da fronteira Portal

**DRAFT · HOLD_NO_GO.** Esta entrega NÃO habilita SSO, grants, contratos ou acesso real; apenas amplia testes com autoridade sintética sob fronteira de negação padrão.

## Cobertura

- **R127:** a autoridade sintética exercita expiração, revogação, empresa divergente, permissão insuficiente, sujeito malformado, revisão zero e TTL maior que o permitido.
- **R128:** verifica exceções de fonte indisponível, budget de verificação excedido, contextos inválidos bloqueados antes da chamada e argumentos de timeout inválidos.
- **R129:** CI isolada em Ubuntu com PHP, verificação de default deny em AppServiceProvider e confirmação dos 13 gates NOT_VERIFIED.

## Reproduzir no checkout da PR

    php -l scripts/check-portal-authority-negative.php
    php scripts/check-portal-authority-negative.php
    php scripts/check-portal-default-deny.php
    node scripts/check-release-gate-policy.mjs
    node ops/staging/check-release-gates.mjs

A validação positiva isolada usa somente um objeto sintético, de propósito: prova o contrato interno em laboratório, **não** a identidade empresarial, serviço ativo ou revogação independente no Portal. O provider de produção permanece UnavailablePortalAuthority.

## Critérios que não podem ser antecipados

Issue https://github.com/rafhael100/imagine-portal/issues/886 continua bloqueando as fontes oficiais. Sem aceite das 35 aulas, testes de autenticação operacional, concessão empresarial, AppSec/DBA/LGPD e evidências de homologação privada, a decisão continua **HOLD_NO_GO / 13 de 13 NOT_VERIFIED**. Não fazer merge, deploy, modificação na main, produção, VPS, DNS, custos, SSO, grants ou dados de clientes.

Uma CI verde demonstra somente que os testes sintéticos da SHA exata passaram, sem comprovar prontidão para produção.
