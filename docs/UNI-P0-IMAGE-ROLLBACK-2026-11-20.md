# UNI P0 — ensaio negativo de troca de imagem e reversão (laboratório)

20/11/2026 · **DRAFT / HOLD_NO_GO / sem deploy**. Fila de referência: [Universidade #12](https://github.com/rafhael100/imagine-universidade/issues/12); 13 gates inalterados.

## Lacuna e ensaio

O laboratório já demonstrava saúde FPM e PostgreSQL e recuperação após interrupção, mas **não** substituição equivocada da imagem da aplicação seguida de retorno à imagem aprovada. Em runner Docker local efêmero, após autenticar SQL PostgreSQL 18 e verificar configuração efetiva Laravel **antes das migrações**, a nova etapa:

1. Captura o **image ID sha256 exato** do contêiner PHP funcional e a contagem de sessões PG18.
2. Substitui somente o contêiner PHP por uma imagem local Nginx propositalmente incorreta, ainda em execução, mas sem FPM na porta 9000; reinicia o Nginx frontal para resolver a nova identidade interna.
3. Exige healthcheck `unhealthy` e resposta `/up` não bem-sucedida. A reversão **não** começa se o controle negativo não reproduzir a falha.
4. Remove a imagem incorreta da aplicação e recria o contêiner com **o image ID original**, mesmas variáveis sintéticas, rede interna, permissões reduzidas e configurações somente leitura; reinicia Nginx para atualizar resolução.
5. Exige healthcheck `healthy`, **mesma contagem de sessões** no banco não modificado e rotas privadas Cliente/Admin HTTP 403 sem autoridade Portal.

O teste reaproveita o pipeline de PostgreSQL, Composer lock, imagens construídas do código revisado e a suíte HTTP privada; não solicita secrets, não publica portas, não acessa clientes, não altera VPS nem produz grants.

## Limites e próximos passos

**Este teste não comprova rollback de duas revisões reais, migrações reversíveis, RTO/RPO, backup de produção, digest remoto, retenção, autorização, nem homologação privada.** É uma prova de reversão de *imagem runtime em laboratório*; a frente concorrente de digests deve ser avaliada separadamente. O ensaio de restauração relacional PG18 já existente (`scripts/qa-pg-backup-restore.sh`) não foi refeito nem substituído.

Antes do gate `real_backup_restoration_and_rollback`, exigir artefato/snapshot **imutável** fixado e verificado, plano de reversão com compatibilidade de migrations e dados, backup protegido e ensaio de restauração no ambiente privado aprovado com operador, tempo medido, recuperação de sessão, health e retirada de tráfego. Executar apenas após revisão e autorização próprias. Portal [#848](https://github.com/rafhael100/imagine-portal/issues/848) e [#886](https://github.com/rafhael100/imagine-portal/issues/886) ainda precisam comprovar fonte oficial de serviços ativos, sessão, elegibilidade, papéis e revogação; `UnavailablePortalAuthority` continua deny-all. Aulas e aceite humano #149 permanecem intocados.

CI somente vale por **SHA exata** e conclusão `completed/success` do job do *push* da branch; workflow pendente/falha é **não comprovado**. Nenhum gate muda de `NOT_VERIFIED` automaticamente.
