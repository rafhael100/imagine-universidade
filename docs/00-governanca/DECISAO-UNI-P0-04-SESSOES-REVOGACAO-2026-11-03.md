# DEC-UNI-P0-04 — Ratificação dos controles de sessão, tokens e revogação

**Data:** 03/11/2026  
**Status:** **APROVADO COMO BASE TÉCNICA DE PROJETO**, mediante resposta "ok" à solicitação expressa de aprovação do P0-04 com os parâmetros apresentados.  
**Documento de referência:** [P0-04 — Sessões, tokens e revogação (v0.1)](P0-04-SESSOES-TOKENS-REVOGACAO-v0.1-PROPOSTA.md).  
**Natureza:** aprova requisitos e metas iniciais; **não equivale a homologação de fornecedor ou mecanismo implementado**.

## 1. Parâmetros aprovados como base de projeto

| Controle | Parâmetro inicial aprovado | Condição de implementação |
|---|---|---|
| Token de API | Até **15 minutos** | Escopo mínimo, revalidação de direitos e renovação controlada |
| Sessão de usuário: inatividade | **30 minutos** | Expiração verificada no servidor |
| Sessão de usuário: duração absoluta | **8 horas** | Novo processo de autenticação após limite |
| Cache positivo de elegibilidade | Até **60 segundos** | Invalidação antecipada por revisão oficial; falha não concede novo acesso |
| Novas concessões após perda oficial do direito | Bloqueio assim que confirmação chegar ao autorizador; meta de propagação **até 60 segundos** | Meta sujeita a testes de integração; não é SLA homologado |
| Credencial para iniciar reprodução | Até **5 minutos** se suportada separadamente | O token de início não pode ser confundido com o token CDN necessário aos segmentos |
| Token de reprodução de vídeo | Duração da aula mais margem curta, limitada **inicialmente a 60 minutos** | Revisar conforme player/provedor, aulas longas, renovação e limitações reais |
| Link assinado de objeto/arquivo protegido | Até **5 minutos** | Válido só para recurso e contexto autorizados |
| Nova pergunta ao Tutor, renovação de token ou novo recurso | Revalidar elegibilidade e permissão | Não inferir direito da sessão ou URL anterior |

## 2. Salvaguardas aprovadas

- Identidade central; isolamento por pessoa, empresa e recurso; backend verifica autorização; não criar login/senha paralelos na Universidade.
- Preferência por sessões de backend/BFF e cookies protegidos, protocolo homologado e logout/revogação de sessões.
- Bloquear novas permissões quando não existir confirmação atual válida de elegibilidade, ou em eventos contraditórios.
- Preservar o acesso se outro contrato elegível ativo continuar, conforme P0-03.
- Isolar credenciais de mídias e do Tutor; não compartilhar tokens entre pessoas/empresas.
- Diferenciar **tempo até bloquear novas concessões (T1→T3)** de **tempo de expiração real de mídia já emitida (T1→T4)**. A meta de 60 segundos **não** significa que vídeo em andamento será interrompido nesse período.
- Registrar a versão técnica adotada e testar casos de indisponibilidade, perda de eventos, cache, expiração e tentativas de contorno.

## 3. Itens cuja validação permanece necessária

1. Homologar mecanismo central de sessão/SSO e a viabilidade dos tempos propostos.
2. Homologar o comportamento do provedor de vídeo privado, especialmente duração de token, cache, renovação e eventual revogação individual.
3. Definir contratos de eventos/API e testes de propagação no P0-06.
4. Dimensionar disponibilidade/monitoramento e preço na arquitetura P0-08/P0-09/P0-10.
5. Qualquer parâmetro inviável deverá retornar para **nova decisão expressa**; não alterar automaticamente.

## 4. Status de rastreabilidade

- **P0-04:** aprovado e encerrado **como desenho técnico inicial**.
- **BLOQ-02:** requisitos-base de sessões e revogação aprovados; homologação operacional de mídia/integrações permanece ligada a P0-06 e P0-08.
- **P0-05:** próximo tópico — retenção, privacidade e dados pessoais.
- **Programação:** **NÃO AUTORIZADA**; aprovação da opção B permanece condicionada ao fechamento documental e autorização de implementação separada.

Nenhuma compra, contrato com fornecedor, implantação de ambiente ou programação é autorizada por esta decisão.
