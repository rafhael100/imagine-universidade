# Pré-Gate C / C03 — Avaliação documental de infraestrutura disponível para a Fundação Segura C-00

**Data:** 04/11/2026  
**Estado:** **AVALIAÇÃO DOCUMENTAL, NÃO AUDITORIA AO VIVO DOS SERVIDORES E NÃO AUTORIZAÇÃO DE PROGRAMAR**.  
**Escopo de planejamento C-00 ratificado:** [DEC-UNI-C01](DECISAO-UNI-PRE-GATE-C01-ESCOPO-C00-2026-11-04.md).  
**Base técnica:** [P0-09](DECISAO-UNI-P0-09-INFRA-BACKUP-2026-11-04.md), [P0-06](DECISAO-UNI-P0-06-INTEGRACOES-2026-11-03.md), [D15](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md).  
**Autoridade:** documento de avaliação; não habilita VPS, conexão, cobrança nem código.

## 1. Evidências verificadas em repositórios privados

Inspeção realizada mediante conexão GitHub com leitura de árvores `main` e README/arquivos não secretos; não inclui acesso ao painel do provedor, servidores, billing, process manager, redes, sistema operacional, consumo histórico, ambientes de desenvolvimento locais, cofres de segredos nem GitHub Actions executadas.

| Repositório | Evidência encontrada na verificação | Interpretação para C-00 |
|---|---|---|
| `rafhael100/imagine-crm` | Árvore com cerca de **205 entradas**; raiz com `README.md` e `docs/` (sem código de aplicação na raiz). README caracteriza o projeto como **planejamento em consolidação**, sem autorização de desenvolvimento | Não presumir CRM de produção nem endpoint comercial pronto |
| `rafhael100/imagine-portal` | Árvore com cerca de **150 entradas**, interface e pasta `server/`, `package.json`, workflow de testes e `.env.example`. README indica **versão 0.18.2 em homologação, ainda não implantada**, e provedor de pagamento simulado | Há referência implementada para estudo de contratos, **não autoridade de elegibilidade homologada**; evitar conexão real |
| `rafhael100/imagine-universidade` | Árvore de aproximadamente **107 entradas** com planejamento e critérios, sem aplicação implementada | Preserva condição de programa novo e bloqueio de Gate C |

**Limites:** contagens de entradas são um retrato daquela consulta; não correspondem a uso de disco de VPS, disponibilidade operacional ou maturidade de segurança. O README de Portal é uma declaração do próprio repositório, não prova de ausência de outros deploys. O GitHub permite observar arquivos, **não confirmar capacidade ociosa de servidores nem custo marginal de execução**.

## 2. Inventário de ambientes e hipótese de uso

| Ambiente mencionado no planejamento Imagine | Situação verificável nesta auditoria | Candidatura para C-00 | Condição crítica |
|---|---|---|---|
| Ambiente/VPS de desenvolvimento Imagine | **Existência operacional, host, hardware, carga e papel atual NÃO verificados ao vivo** | **Preferência A**, apenas se comprovar folga e segregação | Não consumir recursos essenciais de CRM/Portal/n8n, não usar bancos reais |
| Servidor central de IA/n8n dos produtos Imagine | **Arquitetura compartilhada planejada; capacidade e operação não confirmadas nesta inspeção** | **Não necessário para C-00** | Não gerar dependência, custo de IA nem compartilhamento de chaves |
| VPS exclusiva de produção da Universidade | **Não contratada nem autorizada por C-00** | **Não utilizar nesta fase** | C-00 restrita a desenvolvimento fictício |
| Cloudflare Workers, Stream e R2 | **Soluções arquiteturais candidatas**, condições de conta e cobrança não verificadas | Workers apenas se ambiente de testes autorizado e sem custo adicional confirmado; **Stream/R2 fora de C-00** | Não criar recursos cobráveis por inferência |
| GitHub existente | Repositórios e workflow de testes do Portal estão presentes; preços/franquias da conta e execuções não auditados | Gerenciamento de documentação e, **depois do Gate C**, código/revisões | Branch protegida, segredos mínimos, limites e política de Actions a verificar |

## 3. Controles mínimos antes de escolher a alternativa de infraestrutura

**Segurança e isolamento**
- Identificar responsável e titular da VPS, sistema operacional e histórico de atualizações, usuários sudo, SSH/MFA, firewall, endereço público, serviços expostos e cofres de segredo.
- Verificar se host de desenvolvimento é distinto da produção; se compartilhar host, exigir análise formal de risco e **nenhum acesso a dados/rede administrativa de produção**.
- Planejar banco educacional **independente**, papéis de banco exclusivos, volumes isolados, redes de contêiner segregadas, namespaces e limites de CPU/RAM/processos.
- Nunca compartilhar `.env`, credenciais, bancos ou dumps reais de CRM/Portal; usar dados sintéticos e mocks.
- O pipeline não deve publicar produção nem executar mudanças em infraestrutura paga sem decisão separada.

**Capacidade e impacto**
- Medir **CPU, RAM, swap, armazenamento livre, IOPS, rede/egress, limites do hypervisor e crescimento de logs** do ambiente candidato.
- Obter ao menos períodos típicos e de pico de 7 dias, quando houver telemetria existente. Ausência de histórico é pendência explícita, não sinal de capacidade livre.
- Estimar consumo do backend, PostgreSQL, fila e testes concorrentes C-00; reservar margem para as cargas já existentes, com alertas e quotas por serviço.
- Documentar riscos de interferência em n8n/IA e CRM/Portal, tempo de restauração, uptime esperado de ambiente de testes, execução de backups e responsabilidades.
- A decisão de compartilhar host somente deve ser tomada após confirmação escrita de **não interferência material e segregação de segredos/bancos**.

**Financeiro e provedor**
- Confirmar contrato, renovação e cobrança da VPS existente, unidade de CPU/RAM/SSD, limite de tráfego, tarifas de snapshots, backups e IP; preços devem vir do painel/contrato, não apenas de comparador.
- Verificar se Github Actions e Cloudflare geram custos variáveis ao acionar pipelines ou workers; configurar limites.
- Registrar tempo humano de operação, atualização, triagem de falhas e segurança, sem declarar custo econômico total zero.

## 4. Alternativas comparadas

| Candidata | Vantagens | Riscos e limites | Resultado atual |
|---|---|---|---|
| **A — Reutilizar VPS/ambiente de desenvolvimento Imagine** | Menor desembolso adicional se houver capacidade comprovada; evita novo contrato, mantém entorno conhecido | Falta de verificação de carga, quotas, rede, isolamento, custo marginal e impacto nos serviços existentes | **PRIORIDADE PARA INSPEÇÃO**, não homologada |
| **B — VPS exclusiva de desenvolvimento da Universidade** | Isolamento de host, menor risco de perturbar outras cargas, facilidade de limitação de permissões | Novo custo mensal e trabalho de atualização/backup, mesmo sem clientes | Plano alternativo **condicionado a cotação e autorização** |
| **C — Ambiente gerenciado/sandbox temporário** | Pode reduzir administração e facilitar limitação por uso | Preço variável, possível retenção indesejada de dados, quota e egress imprevisíveis | Plano alternativo **condicionado a segurança/contrato** |
| **D — Desenvolver na própria VPS central de agentes ou em produção CRM/Portal** | Reuso aparente | Risco de interferência, perda de isolamento e contaminação de privilégios | **NÃO RECOMENDADO** para C-00 |

A infraestrutura de produção da Universidade prevista em P0-09 (VPS exclusiva após necessidade real) **não é substituída** por eventual compartilhamento temporário de um **ambiente de desenvolvimento**.

## 5. Evidência que ainda falta para decisão técnica

| Código | Documento/evidência a levantar | Situação |
|---|---|---|
| INF-C00-01 | Identificação de ambientes e cargas reais, com responsável | **Não verificado** |
| INF-C00-02 | Configuração de CPU, RAM, disco, banda, SO e containers | **Não verificado** |
| INF-C00-03 | Uso médio/pico de capacidade, concorrência e margem de segurança | **Não verificado** |
| INF-C00-04 | Redes, firewall, bancos, usuários, segredos, privilégios e isolamento | **Não verificado** |
| INF-C00-05 | Política de backup/restauração e monitoração dos ambientes | **Não verificado** |
| INF-C00-06 | Contrato, franquias e custo incremental efetivo, incluindo ferramentas | **Não verificado** |
| INF-C00-07 | Plano de quotas/rollbacks e responsabilidade pelo ambiente C-00 | **A definir** |
| INF-C00-08 | Parecer de SEG/TEC e recomendação A/B/C, sem conflito de função crítica | **A definir** |

**Não solicitar senhas, chaves, tokens, dados bancários ou conteúdos privados de clientes no processo de auditoria.** Evidências devem ser agregadas e redigidas para não incluir segredos.

## 6. Recomendação provisória

**Recomenda-se A somente após inspeção objetiva**; se não houver prova suficiente de isolamento/capacidade, preferir B ou C após cotação. O ambiente central de IA/n8n não precisa ser utilizado nesta fase. Os contratos do Portal/CRM devem ser simulados, pois os repositórios não comprovam disponibilidade de interfaces comerciais homologadas.

**Estado:** documento de avaliação pré-Gate C concluído no âmbito GitHub; **a viabilidade operacional e financeira de A/B/C ainda não foi validada**, e C-00 não pode começar por esta proposta. Nenhuma mudança em infraestrutura, compra, conta, repositório de código ou ambiente de produção foi executada.
