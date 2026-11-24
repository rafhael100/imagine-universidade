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


## Próximo ensaio: recepção e inventário de imagens em daemon dedicado (24/11/2026)

A revisão de origem `6739f999eed435e18a81adf43023490503abdd76` já possui evidência de cópia local e recepção independente dos quatro ZIPs de revisão ([#176](https://github.com/rafhael100/imagine-universidade/pull/176#issuecomment-7145742780)), **não dos três TARs**. O produtor usa `docker save` por ID e exige ausência de RepoTags. Não pressupor que `docker load` preserve a referência de registry `postgres@sha256:...` (RepoDigests). O roteiro `scripts/qa-staging-postgres-http.sh` ainda exige essa referência upstream e pode tentar buscá-la; portanto ele NÃO é um ensaio offline de imagens recebidas. Antes de executá-lo sobre imagens importadas, revisar um caminho específico de QA com vínculo ao ID PG comprovado, sem pull, sem simular variáveis GitHub Actions e sem enfraquecer o caminho CI já aprovado. Não substituir o pin de staging, nem atribuir um digest de registry por meio de tag local.

Procedimento de aceite proposto, **não autorizado a executar por este documento**:

1. Operador autorizado deve disponibilizar daemon local exclusivo e descartável, em ambiente separado da VPS Imagine e de qualquer daemon compartilhado. Registrar identidade efetiva e isolamento de rede, inventário inicial sem imagens/contêineres/volumes próprios ou de terceiros (redes nativas são esperadas), capacidade de disco/inodes, ausência de segredos e ausência de acesso a registries. Não usar um contexto Docker chamado default como prova de isolamento. Sem aprovação explícita, parar antes de importar.
2. Receber os três TARs da MESMA execução que produziu a prova de origem; obter SHA/run/attempt e checksum da prova por canal autenticado independente. Usar o verificador de transporte existente antes do load. Se os TARs foram descartados, não reconstruir e atribuir os bytes à revisão anterior; nova execução de origem e retenção autorizada são necessárias.
3. Após a importação futuramente autorizada, verificar exatamente os três IDs (não tags), ausência de imagens extras e não permitir pull/rebuild. Preservar observações reais do inventário antes do load, imediatamente depois e após descarte; cada snapshot é um JSON de strings sha256:HEX, sem duplicatas. Registrar daemon, horário e resultado diretamente no ensaio autenticado, não em declarações fabricadas. O inventário das imagens não substitui inspeção de contêineres, redes e volumes, nem prova operações do daemon.
4. Com as imagens recebidas, repetir apenas as provas que mudaram com o transporte: SQL efetivo autenticado e local antes das migrations, runtime separado do owner, health/negação e rollback ao ID anterior, com os controles negativos e descarte do roteiro existente. Provar backup/restauração sintéticos no destino e observar tempos; isso não comprova backup real nem rollback de duas revisões. Não usar conteúdo ou clientes reais. Qualquer ausência, pull, divergência ou resíduo implica HOLD.
5. Depois de capturar os três snapshots reais no ambiente autorizado, o mesmo verificador de transporte pode cruzar os IDs e hashes dos arquivos de inventário com a prova ancorada, **sem chamar Docker**:

```bash
node scripts/check-uni-image-transport.mjs "$ABS_DIR" "$SOURCE_SHA" "$RUN_ID" "$RUN_ATTEMPT" "$TRUSTED_PROVENANCE_SHA256" \
  --inventory "$BEFORE_JSON" "$LOADED_JSON" "$AFTER_JSON"
```

Os caminhos devem ser absolutos, canônicos e distintos. Antes/depois esperam `[]`; o snapshot após load deve conter somente os três IDs aprovados. Essa opção verifica consistência de arquivos fornecidos pelo operador, não sua autenticidade, daemon, importação ou limpeza. Mesmo em sucesso, `daemon_identity_verified`, `import_proven`, `cleanup_proven`, `import_executed` e `portable_image_artifact` permanecem false; `HOLD_NO_GO` é invariável. A interface anterior de cinco argumentos não muda.

Nenhum ensaio de importação, instalação, migração de destino ou gate foi executado nesta revisão. Os 13 gates, deny-all e o aceite humano #149 permanecem intocados.
