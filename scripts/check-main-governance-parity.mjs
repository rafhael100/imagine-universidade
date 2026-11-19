#!/usr/bin/env node
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";

const reviewedMainSha="dac4e242981fb57e4abfbbe68f7fd5d79ebd0b04";
const files={
  "docs/00-governanca/DECISAO-UNI-C00-RESPONSAVEL-REVISAO-2026-11-04.md":"d1d0707c953dd2bfa00961d6ba38fcd46d727be5",
  "docs/00-governanca/DECISAO-UNI-C00-TETO-ZERO-E-REVISAO-2026-11-04.md":"550ecf3001e931e8404d04d25f5faa7a77d12a85",
  "docs/00-governanca/PRE-GATE-C-BLOCO-B-RESPONSAVEIS-ORCAMENTO-E-TETO-C00-v0.1-2026-11-04.md":"de44a19fa95aed885e18fbb1c05761d866b684a1",
  "docs/00-governanca/PRE-GATE-C-BLOCO-C-MINUTA-AUTORIZACAO-C00-v0.1-2026-11-04.md":"cea7bbebf79fde1cbf15f34e4b5a74e69559fbf7",
  "docs/00-governanca/PRE-GATE-C-CHECKLIST-ORCAMENTO-E-AUTORIZACAO-v0.1-2026-11-04.md":"a25dc89b3d7d6eded015d07dd0e94b630f640456",
  "docs/00-governanca/REGISTRO-UNI-C00-CODIGO-INICIAL-EM-REVISAO-2026-11-04.md":"7d148a5688c9bf84bb9425d5b5ea947d000f1367"
};
for(const [path,expected] of Object.entries(files)){
  const contents=readFileSync(new URL("../"+path,import.meta.url));
  const hash=createHash("sha1")
    .update(Buffer.from("blob "+contents.length+"\0")).update(contents).digest("hex");
  assert.equal(hash,expected,"Governance file differs from main "+reviewedMainSha+": "+path);
}
const readme=readFileSync(new URL("../README.md",import.meta.url),"utf8");
assert.match(readme,/## Desenvolvimento em andamento/);
assert.match(readme,/## Histórico do planejamento/);
assert.match(readme,/HOLD_NO_GO|release-gates\.json/);
console.log("PASS: six governance blobs identical to reviewed main "+reviewedMainSha+
  "; README divergent but explicitly acknowledges draft and release gates; no merge.");
