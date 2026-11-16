# UNI C-98 — exportação de progresso com lista explícita de campos

**16/11/2026 | Universidade Imagine | PR #81 DRAFT | Sem acesso de clientes reais**

## Risco tratado

O navegador convertia o JSON retornado pela API privada em um download integral. Se uma versão futura da API incluir acidentalmente dados internos de empresa, assunto de sessão, e-mail ou outros campos, o arquivo poderia incorporá-los sem intenção. Um duplo clique ou erro de contrato também exigia tratamento previsível.

## Implementação candidata

1. `sanitizedProgressExport` só aceita `schema_version = 1`, `scope = current_authenticated_student` e vetor de até **5.000** conclusões.
2. Cada registro é reconstituído com **somente** `course_slug`, `course_version`, `lesson_slug` e `completed_at`, mediante formato/limites estritos. Campos extras no nível do objeto ou dos registros **não são serializados**. Histórico malformado ou acima do limite é recusado, não truncado.
3. Exportações simultâneas são bloqueadas por `state.exportLoading` no mesmo painel. O arquivo temporário é criado apenas após validação e a URL de objeto é revogada posteriormente.
4. A API existente continua a exigir `university:view`, vinculação aluno/empresa e revalidação de grant após leitura. A camada visual é uma defesa adicional, **não** comprovação de autorização por si.
5. Requisição 403/419 revoga a sessão e desativa a exportação; 503 não gera arquivo de dados antigos.

## Evidências

- `scripts/check-ui-contract.mjs`: execução da função real de sanitização com versão/scope inválidos, dados pessoais extras, datas/IDs malformados, limite 5.001 e histórico vazio.
- `scripts/qa-browser-synthetic.cjs`: download real interceptado pelo Chromium para verificar campos exatos, duplo clique de um único request, resposta 200 com esquema errado sem download, e 503 sem vazamento de histórico.
- A validação usa dados *sintéticos* no runner isolado. Não autoriza compartilhamento de dados nem descarta revisão LGPD.

## Continuidade

A integração comercial oficial do Portal, SSO/MFA, revogação independente e os 13 gates de liberação continuam **HOLD_NO_GO**. Nenhum merge, deploy, cobrança ou operação de cliente foi executado.
