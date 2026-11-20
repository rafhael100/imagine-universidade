# UNI ERD-R96–R99 — revisão HTML no Chromium (20/11/2026)

**DRAFT · HTML passivo sintético · HOLD_NO_GO · nenhum cliente ou grant.**

## Entregas

- **R96:** regressões reais em navegador Chrome sobre o arquivo local source-bound das 35 aulas; verifica 35 links, 35 destinos e 210 perguntas da rubrica.
- **R97:** verifica teclado: link de salto, foco de cada artigo, outline visível, sem adicionar artigos à sequência normal de TAB. Também exercita viewport de 390 px.
- **R98:** axe-core em Chrome com regras WCAG 2.1 A/AA, bloqueio de rede de qualquer origem HTTP(S), coleta de exceções de página. Resultados são diagnósticos automáticos e não substituem testes com leitor de tela ou pessoas.
- **R99:** workflow isolado com verificação estática e de proveniência antes de Chrome, Chrome do runner sem instalação de sistema, dependências NPM temporárias com timeout e gates 13/13 NOT_VERIFIED. Sem conexão com aplicação privada, servidor, SSO ou dados de clientes.

## Evidência esperada

No workflow, o primeiro job gera arquivo local, verifica conteúdo e origem exata, e bloqueia qualquer alteração de release gates. O segundo job é executado somente após o primeiro, abre file:// no Chrome e reporta as verificações por ação de teclado. **Só registrar CI como aprovada se todos os jobs concluírem na SHA final.**

A auditoria cobre exclusivamente este relatório HTML de revisão: não aprova a qualidade das 35 aulas, o MVP Laravel, a integração real com Portal nem os 13 gates. Uma prova automatizada de acessibilidade não equivale a homologação de leitor de tela.

Portal #886 segue sem fonte oficial elegível de contrato, identidade e revogação. Proibidos merge, deploy, custos adicionais, alteração da main/VPS/DNS, ativação de SSO e concessão de acesso.