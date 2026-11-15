# DEC-UNI-C00 — Teto incremental zero e exigência de revisão para a Fundação Segura local

**Data do aceite:** 04/11/2026.
**Situação:** **APROVADA A POLÍTICA FINANCEIRA DE ZERO NOVAS DESPESAS DE FORNECEDORES NA ETAPA LOCAL C-00** e a **EXIGÊNCIA DE REVISÃO TÉCNICA E DE SEGURANÇA**. Não significa que a revisão tenha sido designada ou concluída.
**Evidência:** resposta expressa “ok aprovado” à proposta apresentada após a primeira Pull Request: “estabelecer **R$ 0 em novas despesas de fornecedores nesta primeira fase local**, mantendo o custo de trabalho registrado separadamente, e designar um responsável pela revisão técnica e de segurança”, com observação de que **responsáveis e ambiente ainda precisavam de aprovação**.
**Precedentes:** [Bloco A aprovado](DECISAO-UNI-PRE-GATE-C-BLOCO-A-APROVADO-2026-11-04.md), [Bloco B/B-M aprovado](DECISAO-UNI-PRE-GATE-C-BLOCO-B-BASE-APROVADA-BM-2026-11-04.md), [Minuta Bloco C](PRE-GATE-C-BLOCO-C-MINUTA-AUTORIZACAO-C00-v0.1-2026-11-04.md), [Código inicial em revisão](REGISTRO-UNI-C00-CODIGO-INICIAL-EM-REVISAO-2026-11-04.md).

## 1. Escopo financeiro efetivamente aprovado

| Item | Estado |
|---|---|
| **Teto incremental de novas despesas de fornecedores da primeira fase C-00 LOCAL** | **R$ 0,00 — APROVADO** |
| Assinatura ou expansão de VPS Leaseweb, Cloudflare R2/Workers/Stream, licenças e provedores de IA | **NÃO AUTORIZADAS** |
| Nova cobrança por GitHub Actions, consumo de modelos, bancos gerenciados ou serviços de terceiros | **NÃO AUTORIZADA; interromper e solicitar mudança antes de gerar gasto** |
| Recursos e contas já existentes | **Uso possível apenas se não gerar nova cobrança e após validação de titularidade, permissões, segurança e ambiente no Gate C** |
| Horas, equipe, custo interno, revisão de segurança, contingência e custo econômico total | **APURAR E REGISTRAR SEPARADAMENTE; NÃO É CUSTO ZERO** |
| Custo de produção, piloto, mídia, Tutor IA e VPS compartilhada futura | **FORA DO ESCOPO FINANCEIRO DESTA DECISÃO** |

O período de vigência exato e a distribuição por fornecedor serão especificados no termo específico do Gate C; a única autorização monetária atual é **não gerar novas despesas de fornecedores** na primeira etapa local. Não autorizar pagamentos ou iniciar uma nova cobrança sem aceite expresso adicional, mesmo que o valor pareça pequeno.

## 2. Segurança e governança aprovadas como critério

1. **Revisão humana técnica e de segurança é obrigatória** antes de merge, execução relevante no ambiente Imagine ou homologação. A IA que escreveu ou revisou código não pode ser a única instância aprovadora de seus próprios artefatos.
2. O revisor, sua independência ou o controle compensatório, titular técnico, responsável por produto e aprovador financeiro **não foram designados pelo simples “aprovado”**. Nomear as pessoas ou funções assumidas por pessoas concretas em ato separado.
3. O ambiente local/sandbox (máquina, sistema, titular, controles de acesso, ferramentas e ausência de cobrança) **não foi identificado nem verificado**. O GitHub é o repositório de revisão, não prova da existência de ambiente local seguro.
4. **Código já preparado:** [Pull Request draft #1](https://github.com/rafhael100/imagine-universidade/pull/1), com estrutura inicial Laravel e mocks. A PR **continua draft, sem merge, instalação, CI, migrações ou execução de testes**.
5. O escopo continua exclusivamente **C00-01 a C00-06 com dados fictícios**; sem acesso a dados de clientes, contas reais de estudantes, integrações de produção, Tutor IA, Cloudflare Stream e deploy.

## 3. Quadro de pendências do Gate C

| Critério | Estado |
|---|---|
| Blocos A e B, preferência B-M | **APROVADOS DOCUMENTALMENTE** |
| Teto incremental R$ 0 na fase LOCAL | **APROVADO NESTA DECISÃO** |
| Exigência de revisão humana técnica e de segurança | **APROVADA COMO CONDIÇÃO** |
| Executor da programação e independência efetiva da revisão | **Executor pendente; revisor técnico/segurança autoindicado pelo solicitante** em [DEC-UNI-C00-REVISAO](DECISAO-UNI-C00-RESPONSAVEL-REVISAO-2026-11-04.md); independência/controle compensatório a demonstrar |
| Identificação e aceite do ambiente local/sandbox | **PENDENTE** |
| Horas reais, disponibilidade e custo econômico total do trabalho | **PENDENTE** |
| Duração da autorização, alçadas e exceções | **PENDENTE** |
| Declaração expressa de abertura do Gate C e permissão para instalar e executar testes | **NÃO CONCEDIDA** |

## 4. Limite decisório e próxima ação

O aceite **não deve ser interpretado** como indicação nominal de revisor ou responsável, como acesso a computador/servidor ou como aprovação de execução de testes. O compromisso de custo incremental R$ 0,00 é uma **restrição financeira**, não autorização automática de operações.

**Próxima ação documental:** atualizar [Bloco C](PRE-GATE-C-BLOCO-C-MINUTA-AUTORIZACAO-C00-v0.1-2026-11-04.md) com teto aprovado, identificar responsável técnico/revisor e ambiente local e apurar esforço/custo econômico. Submeter a direção um **ato final separado de autorização do Gate C** com escopo, prazo e limites.

**Status:** Gate D concluído documentalmente; C-00 preparado em PR draft; **Gate C ainda não formalizado**; nenhuma nova despesa permitida nem execução de software nesta decisão.
