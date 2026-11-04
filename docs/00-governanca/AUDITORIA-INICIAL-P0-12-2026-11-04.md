# Auditoria inicial de cobertura — P0-12

**Data:** 04/11/2026  
**Natureza:** inspeção documental de conteúdo publicado no GitHub, não homologação de software nem termo de encerramento.
**Fonte:** `docs/08-fechamento-candidato/06-MATRIZ-DE-ACEITE.csv`; `docs/08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md`; controle de decisões P0.

## Evidências verificadas

- A matriz CSV contém **84 linhas de requisitos BASE** identificadas por `BASE-UNI-xx-yy`.
- Há **84 identificadores únicos**, com **6 capacidades em cada um dos 14 módulos** UNI-01 a UNI-14; nenhum ID BASE duplicado encontrado.
- O documento de base funcional contém títulos de **14 módulos** UNI-01 a UNI-14.
- **Todas as 84 linhas** da matriz CSV continuam com `status=PROPOSTO_PARA_RATIFICACAO` e `evidencia=Nao executado`. O primeiro campo de status está **defasado** em relação à aprovação funcional da versão-base v5; o segundo está **correto**, pois não houve testes de software.
- **Recomendação:** reconciliar a coluna documental de cada linha para refletir o aceite da base v5 **sem tocar** em `Nao executado` e sem transformá-la em homologação; idealmente separar em duas colunas: `status_documental` e `status_teste`. Essa alteração será executada durante a revisão final do Gate D com registro de versão.
- As decisões P0-02 a P0-11 têm registros específicos de aprovação das suas dimensões funcional, técnica inicial ou metodológica, com pendências residuais. O P0-12 ainda está em proposta.

## Restrições de conclusão

A cobertura quantitativa de 84/84, isoladamente, **não prova consistência semântica**, compatibilidade com todos os sistemas oficiais, suficiência de orçamento ou conformidade jurídica.

**Permanece aberto o Gate D**, incluindo a ratificação da metodologia P0-12, correção de status editorial, inventário de dependências, orçamento da fase pretendida e termo final expresso.

**Não autoriza programação ou gasto.**
