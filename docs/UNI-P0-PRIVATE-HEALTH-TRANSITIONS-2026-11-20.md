# UNI P0 — prova dinâmica do healthcheck privado (NO-GO)

20/11/2026. Base imutável: PR #151 HEAD `268ea572081f31b2a5aea31f7a3068fad6e8779b`, push CI [#44808621487](https://github.com/rafhael100/imagine-universidade/actions/runs/44808621487) success; PR #85 é referência integrada histórica, sem ser base desta revisão. Não tocar na candidata de conteúdo #149.

## Lacuna comprovada e mudança de código

O healthcheck adicionado em #151 só foi verificado estaticamente por `docker compose config`; nada demonstrou que a resposta HTTP real muda após falha no PHP-FPM. O laboratório existente já testa PostgreSQL18, migração por owner diferente de runtime, `/up 200`, rotas privadas `403` e sessão sintética. Esta revisão **acrescenta a transição dinâmica negativa e recuperação**, sem criar serviços ou novas rotas:

1. `web` recebe no Docker descartável o mesmo comando `wget -q -T 3 -O /dev/null http://127.0.0.1:8080/up` da proposta Compose, com intervalos menores no laboratório para economizar runner.
2. Atesta Docker Health `healthy` sob Nginx → PHP-FPM → Laravel, depois interrompe **apenas o contêiner sintético** PHP-FPM e exige `wget` fracassado e estado `unhealthy` (nunca aceitar um 200 simulado).
3. Reinicia somente o mesmo contêiner descartável, exige retorno a `healthy` e repete a prova HTTP de rotas Cliente/Admin negadas com headers Portal forjados, mantendo default `UnavailablePortalAuthority`.
4. O teardown já existente apaga contêineres/rede/volume isolados; **não** há porta no host, tokens reais, publicação, alteração da VPS ou migração fora do banco `uni_staging_ci_only`.

O job isolado executa apenas ao receber push nesta branch, valida branch, contexto Docker local, ausência de arquivos de ambiente, composer.lock e 13 gates. A construção usa imagens públicas em runner efêmero; **não é prova de digest imutável de release**. Verificar a conclusão do workflow contra a HEAD exata, inclusive caso fique pendente/vermelho.

## Limites e próxima fila única

O resultado de Docker sintético, ainda que verde, não comprova o healthcheck em homologação privada da VPS, alta disponibilidade de DB, backup/restauração/rollback operacional, identidade/sessão business real ou elegibilidade. Portal [#848](https://github.com/rafhael100/imagine-portal/issues/848) e [#886](https://github.com/rafhael100/imagine-portal/issues/886) seguem sem fonte oficial de serviço vigente e revogação, owner comercial, política SKU ou autorização `university:view/manage`. O cliente real permanece **deny-all**.

Checklist único [Universidade #12](https://github.com/rafhael100/imagine-universidade/issues/12): 13 gates `NOT_VERIFIED`, decisão `HOLD_NO_GO`. Próxima lacuna independente: fixar e revisar digests de imagens/artefatos para release, preparar ensaio de rollback e, **após** autorizações próprias, executar homologaçao funcional privada. Aceite humano das 35 aulas permanece pendente e não é atribuído por CI.
