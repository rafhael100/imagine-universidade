// Read-only transport preflight. Never loads images, starts Docker, or grants access.
// Trust anchor (provenance file SHA256) must be obtained independently from the
// authenticated exact-run review evidence, NOT from the transported directory.
import { openSync, closeSync, readSync, fstatSync, constants, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, isAbsolute } from "node:path";
function validateProof(p,expected){
  const require=(ok,msg)=>{if(!ok)throw new Error(msg)};
  const digest=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
  const image=x=>typeof x==="string"&&/^sha256:[a-f0-9]{64}$/.test(x);
  require(typeof expected.sha==="string"&&/^[a-f0-9]{40}$/.test(expected.sha),"bad expected SHA");
  require(typeof expected.run==="string"&&/^[1-9][0-9]*$/.test(expected.run),"bad run");
  require(typeof expected.attempt==="string"&&/^[1-9][0-9]*$/.test(expected.attempt),"bad attempt");
  require(p?.schema===2&&p.repository==="rafhael100/imagine-universidade"&&p.commit===expected.sha&&p.workflow_run_id===expected.run&&p.workflow_attempt===expected.attempt,"wrong provenance identity");
  require(p.release_decision==="HOLD_NO_GO"&&p.appsec_signoff===false&&p.registry_published===false&&p.full_sbom_complete===false,"unexpected scope");
  require(Array.isArray(p.images)&&p.images.length===3,"expected three images");
  const roles=["php","nginx","pg"];
  const ids=new Set();
  const result=p.images.map((i,k)=>{
    require(i?.role===roles[k]&&image(i.image_id)&&!ids.has(i.image_id)&&digest(i.image_tar_sha256),"wrong role or image identity");
    ids.add(i.image_id);
    const a=i.archive_verification;
    require(a&&a.scope==="local_docker_save_only"&&a.image_id===i.image_id&&a.archive_sha256===i.image_tar_sha256&&Number.isSafeInteger(a.ordered_layer_count)&&a.ordered_layer_count>0,"wrong archive proof");
    return {role:i.role,image_id:i.image_id,archive_sha256:i.image_tar_sha256,filename:"uni-p0-"+i.role+"-os-image.tar"};
  });
  require(p.postgres_runtime?.scope==="synthetic_3_service_runtime"&&p.postgres_runtime.image_id===result[2].image_id,"wrong PG runtime");
  return result;
}
function readStable(path,collect=false){
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try {
    const before=fstatSync(fd,{bigint:true});
    if(!before.isFile()||before.size<=0n||(collect&&before.size>1048576n))throw Error("not a bounded regular file: "+path);
    const h=createHash("sha256"),buf=Buffer.alloc(1024*1024),chunks=[];
    let n,total=0n;
    while((n=readSync(fd,buf,0,buf.length,null))>0){
      total+=BigInt(n);
      if(total>before.size)throw Error("file grew: "+path);
      const bytes=buf.subarray(0,n);h.update(bytes);
      if(collect)chunks.push(Buffer.from(bytes));
    }
    const after=fstatSync(fd,{bigint:true});
    if(total!==before.size||before.size!==after.size||before.mtimeNs!==after.mtimeNs||before.ctimeNs!==after.ctimeNs)throw Error("file changed during read: "+path);
    return {hash:h.digest("hex"),bytes:collect?Buffer.concat(chunks):null};
  } finally {closeSync(fd);}
}
function validateInventorySnapshots(before,loaded,after,images){
  const valid=x=>Array.isArray(x)&&x.every(id=>typeof id==="string"&&/^sha256:[a-f0-9]{64}$/.test(id))&&new Set(x).size===x.length;
  if(![before,loaded,after].every(valid))throw Error("invalid image inventory snapshot");
  if(before.length!==0||after.length!==0)throw Error("dedicated image inventory must be empty before load and after disposal");
  const expected=images.map(i=>i.image_id).sort();
  if(loaded.length!==expected.length||[...loaded].sort().some((id,i)=>id!==expected[i]))throw Error("loaded image inventory differs from reviewed IDs");
}
try {
  const args=process.argv.slice(2);
  if(args.length!==5&&!(args.length===9&&args[5]==="--inventory"))throw Error("usage: node scripts/check-uni-image-transport.mjs ABSOLUTE_DIR SOURCE_SHA RUN_ID RUN_ATTEMPT TRUSTED_PROVENANCE_SHA256 [--inventory BEFORE_JSON LOADED_JSON AFTER_JSON]");
  const [dir,sha,run,attempt,anchor]=args;
  if(!isAbsolute(dir)||realpathSync(dir)!==dir||!/^[a-f0-9]{64}$/.test(anchor))throw Error("noncanonical directory or invalid anchor");
  const proof=readStable(join(dir,"uni-p0-os-cve-scan-provenance.json"),true);
  if(proof.hash!==anchor)throw Error("provenance checksum mismatch");
  const images=validateProof(JSON.parse(proof.bytes.toString("utf8")),{sha,run,attempt});
  for(const i of images)if(readStable(join(dir,i.filename)).hash!==i.archive_sha256)throw Error("archive checksum mismatch: "+i.role);
  const result={scope:"read_only_transport_bytes_only",source_sha:sha,workflow_run_id:run,workflow_attempt:attempt,provenance_sha256:anchor,images,release_decision:"HOLD_NO_GO",import_executed:false,portable_image_artifact:false};
  if(args.length===9){
    const paths=args.slice(6);
    if(new Set(paths).size!==3||paths.some(p=>!isAbsolute(p)||realpathSync(p)!==p))throw Error("inventory snapshots require three distinct canonical files");
    const snapshots=paths.map(p=>readStable(p,true));
    validateInventorySnapshots(...snapshots.map(s=>JSON.parse(s.bytes.toString("utf8"))),images);
    result.inventory={scope:"operator_supplied_snapshots_only",ids_match:true,before_sha256:snapshots[0].hash,loaded_sha256:snapshots[1].hash,after_sha256:snapshots[2].hash,daemon_identity_verified:false,import_proven:false,cleanup_proven:false};
  }
  console.log(JSON.stringify(result));
} catch(e) {console.error("HOLD: "+e.message);process.exitCode=2;}
