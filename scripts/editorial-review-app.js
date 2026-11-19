"use strict";
(function(){
  const items=REVIEW_ITEMS;
  if(items.length!==35)throw Error("Acervo editorial incompleto");
  const $=id=>document.getElementById(id);
  const state=new Map(items.map(item=>[item.course_slug+"/"+item.lesson_slug,{
    status:"PENDING_HUMAN_REVIEW",reviewer:"",evidence:"",notes:""
  }]));
  let current=0,dirty=false;
  const key=item=>item.course_slug+"/"+item.lesson_slug;
  const courses=[...new Set(items.map(item=>item.course_slug))];
  function message(value,error=false){
    $("message").textContent=value;
    $("message").classList.toggle("error",error);
  }
  function counts(){
    const stats={PENDING_HUMAN_REVIEW:0,NEEDS_CHANGES:0,CLAIMED_HUMAN_APPROVED:0};
    for(const row of state.values())stats[row.status]++;
    $("summary").textContent=stats.PENDING_HUMAN_REVIEW+" pendentes · "+
      stats.NEEDS_CHANGES+" pedem ajustes · "+stats.CLAIMED_HUMAN_APPROVED+
      " declarações humanas NÃO autenticadas";
    for(const button of $("courses").querySelectorAll(".course-item")){
      const slug=button.dataset.courseSlug;
      const rows=items.filter(item=>item.course_slug===slug);
      const pending=rows.filter(item=>state.get(key(item)).status==="PENDING_HUMAN_REVIEW").length;
      button.textContent=rows[0].course_title+" ("+pending+" pendentes / "+rows.length+")";
    }
    $("next-pending").disabled=stats.PENDING_HUMAN_REVIEW===0;
    $("next-adjustment").disabled=stats.NEEDS_CHANGES===0;
  }
  function render(){
    const lesson=items[current],row=state.get(key(lesson));
    const nav=$("courses");
    nav.replaceChildren();
    for(const slug of courses){
      const first=items.findIndex(item=>item.course_slug===slug);
      const button=document.createElement("button");
      button.type="button";
      button.className="course-item";
      button.dataset.courseSlug=slug;
      const rows=items.filter(item=>item.course_slug===slug);
      const pending=rows.filter(item=>state.get(key(item)).status==="PENDING_HUMAN_REVIEW").length;
      button.textContent=items[first].course_title+" ("+pending+" pendentes / "+rows.length+")";
      button.setAttribute("aria-current",slug===lesson.course_slug?"true":"false");
      button.addEventListener("click",()=>choose(first));
      nav.append(button);
    }
    const picker=$("lessons");picker.replaceChildren();
    items.forEach((item,i)=>{
      if(item.course_slug!==lesson.course_slug)return;
      const option=document.createElement("option");
      option.value=String(i);option.textContent=item.lesson_title;
      picker.append(option);
    });
    picker.value=String(current);
    $("title").textContent=lesson.lesson_title;
    $("course-title").textContent=lesson.course_title;
    $("body").textContent=lesson.body;
    $("identity").textContent=key(lesson)+" · SHA-256: "+lesson.content_sha256;
    $("status").value=row.status;
    $("reviewer").value=row.reviewer;
    $("evidence").value=row.evidence;
    $("notes").value=row.notes;
    $("position").textContent=(current+1)+" / "+items.length+" aulas";
    $("previous").disabled=current===0;
    $("next").disabled=current===items.length-1;
    counts();
  }
  function choose(i){
    if(!Number.isInteger(i)||i<0||i>=items.length)return;
    current=i;render();$("title").focus();
  }
  function jumpToStatus(wanted){
    for(let n=1;n<=items.length;n++){
      const idx=(current+n)%items.length;
      if(state.get(key(items[idx])).status===wanted){
        choose(idx);
        return;
      }
    }
    message("Não há aulas nesta situação para navegar.");
  }
  function update(){
    const row=state.get(key(items[current]));
    row.status=$("status").value;
    row.reviewer=$("reviewer").value;
    row.evidence=$("evidence").value;
    row.notes=$("notes").value;
    dirty=true;counts();
    message("Alterações apenas na memória. Exporte o CSV antes de sair.");
  }
  function valid(row,id){
    if(!["PENDING_HUMAN_REVIEW","NEEDS_CHANGES","CLAIMED_HUMAN_APPROVED"].includes(row.status))
      throw Error("Situação inválida: "+id);
    if(row.notes.length>2000||/^\s*[=+\-@]/u.test(row.notes))
      throw Error("Observações incorretas ou iniciadas como fórmula: "+id);
    if(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u.test(row.notes))
      throw Error("Caracteres de controle nas observações: "+id);
    if(row.status==="PENDING_HUMAN_REVIEW"){
      if(row.reviewer||row.evidence)throw Error("Apague nome/evidência do registro pendente: "+id);
    }else{
      if(row.reviewer.trim().length<3||row.reviewer.length>120||
        /[\r\n]/u.test(row.reviewer)||/^\s*[=+\-@]/u.test(row.reviewer))
        throw Error("Informe revisor válido: "+id);
      if(!/^https:\/\/github\.com\/rafhael100\/imagine-universidade\/(?:issues|pull)\/[1-9]\d*(?:#issuecomment-[1-9]\d*)?$/iu.test(row.evidence))
        throw Error("Informe issue/PR de evidência da Universidade: "+id);
    }
  }
  const csv=v=>'"'+String(v).replaceAll('"','""')+'"';
  function exportCsv(){
    try{
      const rows=[["course_slug","lesson_slug","content_sha256","review_status",
        "reviewer","evidence_ref","notes"]];
      for(const item of items){
        const record=state.get(key(item));
        valid(record,key(item));
        rows.push([item.course_slug,item.lesson_slug,item.content_sha256,
          record.status,record.reviewer,record.evidence,record.notes]);
      }
      const content=rows.map(row=>row.map(csv).join(",")).join("\r\n")+"\r\n";
      const url=URL.createObjectURL(new Blob(["\uFEFF",content],{
        type:"text/csv;charset=utf-8"
      }));
      const link=document.createElement("a");
      link.href=url;link.download="revisao.csv";
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      dirty=false;
      message("CSV exportado. Declarações NÃO são aprovação verificada ou publicação.");
    }catch(error){message(String(error.message),true);}
  }
  // Existing CSV can be imported locally to resume review on another day.
  // Hashes and 35 unique lesson identities must match the CURRENT source.
  function parseCsv(text){
    if(typeof text!=="string"||text.length>1000000)throw Error("CSV excede 1 MB.");
    const raw=text.replace(/^\uFEFF/u,"");
    const delimiter=raw.split(/\r?\n/u,1)[0].includes('";"')?";":",";
    const rows=[];
    let row=[],field="",quoted=false,atStart=true;
    for(let i=0;i<raw.length;i++){
      const ch=raw[i];
      if(quoted){
        if(ch==='"'){
          if(raw[i+1]==='"'){field+='"';i++;}
          else quoted=false;
        }else field+=ch;
      }else if(ch==='"'&&atStart){quoted=true;atStart=false;}
      else if(ch===delimiter){row.push(field);field="";atStart=true;}
      else if(ch==='\n'){row.push(field);rows.push(row);row=[];field="";atStart=true;}
      else if(ch==='\r'){
        if(raw[i+1]!=='\n')throw Error("Quebra de linha CSV inválida.");
      }else{
        if(ch==='"')throw Error("Aspas CSV inválidas.");
        field+=ch;atStart=false;
      }
    }
    if(quoted)throw Error("Aspas CSV não fechadas.");
    if(field!==""||row.length){row.push(field);rows.push(row);}
    return rows;
  }
  async function importCsv(file){
    if(!file)return;
    try{
      if(file.size>1000000)throw Error("CSV excede 1 MB.");
      if(dirty&&!window.confirm("Importar substituirá as observações não exportadas. Continuar?"))
        return;
      const parsed=parseCsv(await file.text());
      const header=["course_slug","lesson_slug","content_sha256","review_status",
        "reviewer","evidence_ref","notes"];
      if(parsed.length!==36||JSON.stringify(parsed[0])!==JSON.stringify(header))
        throw Error("CSV deve conter as 35 aulas e o cabeçalho original.");
      const expected=new Map(items.map(item=>[key(item),item]));
      const next=new Map();
      for(const values of parsed.slice(1)){
        if(values.length!==7)throw Error("Colunas CSV inválidas.");
        const id=values[0]+"/"+values[1],lesson=expected.get(id);
        if(!lesson||next.has(id))throw Error("Aula inexistente ou duplicada: "+id);
        if(values[2]!==lesson.content_sha256)throw Error("Hash desatualizado: "+id);
        const item={status:values[3],reviewer:values[4],evidence:values[5],notes:values[6]};
        valid(item,id);
        next.set(id,item);
      }
      if(next.size!==35)throw Error("CSV incompleto.");
      // All-or-nothing: a malformed file never replaces one existing row.
      for(const [id,item] of next)state.set(id,item);
      dirty=true;
      render();
      message("CSV carregado localmente. Nenhuma aprovação humana foi autenticada.");
    }catch(error){
      message("Importação recusada: "+String(error.message),true);
    }finally{$("import").value="";}
  }
  $("lessons").addEventListener("change",e=>choose(Number(e.target.value)));
  $("previous").addEventListener("click",()=>choose(current-1));
  $("next").addEventListener("click",()=>choose(current+1));
  $("next-pending").addEventListener("click",()=>jumpToStatus("PENDING_HUMAN_REVIEW"));
  $("next-adjustment").addEventListener("click",()=>jumpToStatus("NEEDS_CHANGES"));
  ["status","reviewer","evidence","notes"].forEach(id=>$(id).addEventListener("input",update));
  $("export").addEventListener("click",exportCsv);
  $("import").addEventListener("change",e=>{void importCsv(e.target.files[0]);});
  window.addEventListener("beforeunload",e=>{
    if(dirty){e.preventDefault();e.returnValue="";}
  });
  render();
  message("35 aulas em rascunho. Somente revisão offline, sem acesso a clientes.");
})();