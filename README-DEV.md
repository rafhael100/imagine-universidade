# Universidade Imagine — C-00 (fundação técnica em branch de revisão)

**Estado em 04/11/2026:** início restrito de estrutura de código para revisão, somente na branch `feat/uni-c00-fundacao-segura`. **NÃO É produto operacional**, não foi implantado, não possui acesso a clientes nem está homologado. Não foi executado Composer, migração, PHPUnit ou servidor.

## Escopo implementado nesta primeira entrega
- Estrutura inicial compatível com **Laravel 13 / PHP 8.3+** (dependências não instaladas, sem `composer.lock`).
- Configuração de referência para PostgreSQL de desenvolvimento próprio, sem senhas.
- Migrações educacionais mínimas, ainda não executadas; nenhuma pessoa/aluno real.
- Política de **elegibilidade sintética** que nega acesso sem identidade, empresa, autoridade oficial simulada, vínculo, permissão, revisão e serviço elegível ativo.
- Testes de unidade de comportamento **escritos, não executados**.
- Sem endpoints de autenticação ou concessão de acesso. A rota fallback retorna 404.

## Fronteiras
- **Não confiar** no mock como autorizador real; autorização oficial pertence ao Portal/serviço central.
- Proibido colocar tokens de produção, cópias reais de banco, dados pessoais e arquivos de mídia nesta branch.
- Integrações UNI-C01 a UNI-C04 reais, cache, sessões, tokens, revogação e eventos duráveis permanecem pendentes de contrato e homologação.
- Não ativar Github Actions, Cloudflare, Leaseweb, n8n, IA paga nem deploy.
- Revisão humana das dependências/segurança e do responsável técnico necessária **antes de merge/execução em ambiente Imagine**.

## Próximos passos de engenharia, condicionados à autorização
1. Designar responsável e revisor e documentar orçamento/teto de desembolso.
2. Validar PHP/Laravel 13 e dependências; gerar `composer.lock` sob ambiente autorizado.
3. Executar `composer install`, lint e PHPUnit somente em sandbox habilitado.
4. Implementar modelos e migrações mais completos com invariantes multiempresa e contrato simulador tipado.
5. Planejar homologação de acesso, prova de isolamento, reversão e backups.
 
## Referências
- [Bloco A aprovado](docs/00-governanca/DECISAO-UNI-PRE-GATE-C-BLOCO-A-APROVADO-2026-11-04.md)
- [Bloco B e B-M aprovados documentalmente](docs/00-governanca/DECISAO-UNI-PRE-GATE-C-BLOCO-B-BASE-APROVADA-BM-2026-11-04.md)
- [Minuta Gate C ainda aberta](docs/00-governanca/PRE-GATE-C-BLOCO-C-MINUTA-AUTORIZACAO-C00-v0.1-2026-11-04.md)
