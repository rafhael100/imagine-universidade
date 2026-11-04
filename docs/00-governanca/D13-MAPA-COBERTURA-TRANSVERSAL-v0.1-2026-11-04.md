# D13 — Cruzamento dos critérios funcionais com os casos transversais

**Data:** 04/11/2026  
**Estado:** **CONFERÊNCIA DOCUMENTAL PREPARADA; ACEITE DE D13 NÃO CONCEDIDO**.  
**Propósito:** demonstrar, sem programar, quais módulos se relacionam com os casos de teste futuros documentados em P0-03 a P0-09 e P0-11, identificando lacunas que deverão ser aprofundadas nos critérios de homologação.

## 1. Evidências verificadas

- A versão-base v5 tem **84 capacidades**, em **14 módulos**, seis por módulo.
- Os **84 identificadores, textos de capacidades e critérios de aceite** foram confrontados entre a matriz CSV e os módulos individuais; não foram encontradas diferenças textuais.
- Há **109 identificadores distintos** de casos de teste futuros `HT-UNI-...`, distribuídos entre oito especificações P0; cada identificador está acompanhado de descrição de resultado esperado e não há duplicatas.
- **Não foi executado nenhum teste de software**. Cobertura documental de ID não é demonstração de funcionamento, nem análise de risco ou homologação completa.

## 2. Mapeamento temático de famílias transversais para módulos

| Família documentada | Nº de casos futuros | Módulos funcionais diretamente relacionados | Exemplos de foco na homologação futura |
|---|---:|---|---|
| `HT-UNI-EL` — Elegibilidade, P0-03 | 10 | UNI-01, UNI-03, UNI-08, UNI-09, UNI-12, UNI-13 | Contrato ativo, múltiplos serviços, vínculo e trial |
| `HT-UNI-SESS` — Sessões/revogação, P0-04 | 12 | UNI-03, UNI-09, UNI-10, UNI-13, UNI-14 | Expiração, mudança de vínculo, tokens e mídia |
| `HT-UNI-PRIV` — Privacidade, P0-05 | 10 | UNI-05, UNI-07, UNI-09, UNI-11, UNI-12, UNI-14 | Privacidade de chats, canal de titular, backups e retenção |
| `HT-UNI-INT` — Integrações, P0-06 | 15 | UNI-01, UNI-03, UNI-09, UNI-10, UNI-12, UNI-13 | Autenticação, idempotência, reconciliação e autoridade |
| `HT-UNI-AI` — Tutor e agentes, P0-07 | 16 | UNI-04, UNI-05, UNI-06, UNI-11, UNI-14 | Ferramentas vedadas, prompt injection, corpus e custos |
| `HT-UNI-MID` — Mídias, P0-08 | 18 | UNI-02, UNI-03, UNI-04, UNI-09, UNI-10 | Vídeos privados, anexos, legendas, publicação e token |
| `HT-UNI-INF` — Infraestrutura, P0-09 | 16 | UNI-04, UNI-06, UNI-11, UNI-13, UNI-14 | Backups, isolamento, falha fechada, RPO/RTO |
| `HT-UNI-GOV` — Governança, P0-11 | 12 | UNI-01, UNI-04, UNI-08, UNI-11, UNI-14 | Alçadas, revisão humana, custos, segurança |
| **Total** | **109** | 14 módulos com relacionamento temático | Testes ainda não executados |

**Importante:** esta associação está em nível de **família de risco por módulo**, e **não** afirma correspondência individual perfeita de cada caso `HT-UNI-...` com cada uma das 84 capacidades. O relacionamento temático não substitui cobertura funcional detalhada, critérios de aceite por implementação nem evidências do Gate H.

## 3. Áreas em que os 84 critérios funcionais exigirão planos de teste próprios

| Módulo / tema | Evidência funcional aprovada | Condição a materializar antes do Gate H |
|---|---|---|
| UNI-02 e UNI-06 — aprendizagem voluntária | Sem prova obrigatória, sem nota, com práticas opcionais e alternativas acessíveis | Testes de jornada e acessibilidade; ausência de barreira por avaliação/prática |
| UNI-07, UNI-08 e UNI-12 — não classificação | Sem certificados, rankings, pontos ou constrangimento | Testes de histórico/recomendações/notificações e ausência de coerção |
| UNI-03 e UNI-08 — seis escolas e catálogo | Catálogo comum aos clientes elegíveis, 60 cursos candidatos (12 da primeira onda) | Confirmar autoria, status, licenças, trilhas e que nenhum curso não homologado é oferecido |
| UNI-09 e UNI-10 — ajuda contextual e suporte | Aulas associadas à versão real dos produtos; estados oficiais do suporte ficam fora da Universidade | Testes de versão e links profundos, sem acesso a dados operacionais brutos |
| UNI-11 — análise e comunicação | Indicadores não acadêmicos e sem exposição individual; sem importar dados GA4 dos clientes | Testes de visibilidade por papel, privacidade e origem das métricas |
| UNI-12 — comunicações e preferências | Notificações educativas não coercitivas e gestão de preferência | Testes de opção de saída, canal e preferências; sem mensageria duplicada |

**Não adicionar novas funcionalidades não aprovadas** para preencher lacunas de teste: cada plano de teste deverá ser derivado da capacidade existente, ou demandar decisão expressa de escopo.

## 4. Parecer documental provisório sobre D13

**Resultado da conferência:** o acervo está suficientemente estruturado para demonstrar **84 critérios funcionais e 109 casos transversais candidatos**, preservando distinção entre teste futuro e evidência executada. Não se encontrou duplicidade de IDs nos conjuntos verificados.

**Pendência D13:** confirmar institucionalmente que este cruzamento por família e as ressalvas de planos de teste funcionais futuros são **suficientes para o encerramento documental**, mantendo a matriz de rastreabilidade caso a caso como exigência para o Gate H (antes de uso real). O responsável ainda não concedeu esse aceite.

**Nenhuma programação, despesa, implantação ou encerramento do Gate D autorizados.**
