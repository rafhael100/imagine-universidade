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
  function normalizeSearch(value){
    return value.normalize("NFKD").replace(/\p{M}/gu,"").toLocaleLowerCase("pt-BR").trim();
  }
  function updateReviewResults(){
    const term=normalizeSearch($("review-search").value);
    const status=$("review-filter").value;
    const matches=[];
    items.forEach((lesson,i)=>{
      if(status!=="ALL"&&state.get(key(lesson)).status!==status)return;
      const searchable=normalizeSearch(lesson.course_title+" "+lesson.lesson_title);
      if(term!==""&&!searchable.includes(term))return;
      matches.push([i,lesson]);
    });
    const active=term!==""||status!=="ALL",holder=$("review-results");
    holder.hidden=!active;
    holder.replaceChildren();
    $("review-search-count").textContent=active
      ?matches.length+" aulas encontradas neste filtro"
      :"Digite para localizar uma aula ou selecione uma situação.";
    if(!active)return;
    for(const [i,lesson] of matches){
      const b=document.createElement("button");
      b.className="review-result";
      b.type="button";
      b.dataset.lessonIndex=String(i);
      b.textContent=lesson.course_title+" · "+lesson.lesson_title;
      b.setAttribute("aria-current",i===current?"true":"false");
      b.addEventListener("click",()=>choose(i));
      holder.append(b);
    }
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
    updateReviewResults();
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
    updateReviewResults();
    message("Alterações apenas na memória. Exporte o CSV antes de sair.");
  }
  // Invisible direction overrides can visually spoof an otherwise valid reviewer,
  // note or exported CSV. Keep the local editor aligned with the CLI validator.
  function unsafeDisplayControl(value){
    return /[\u200e\u200f\u2028-\u202e\u2066-\u2069]/u.test(value);
  }
  function valid(row,id){
    if(!["PENDING_HUMAN_REVIEW","NEEDS_CHANGES","CLAIMED_HUMAN_APPROVED"].includes(row.status))
      throw Error("Situação inválida: "+id);
    if(row.notes.length>2000||/^\s*[=+\-@]/u.test(row.notes))
      throw Error("Observações incorretas ou iniciadas como fórmula: "+id);
    if(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u.test(row.notes)||unsafeDisplayControl(row.notes))
      throw Error("Caracteres de controle ou direção invisível nas observações: "+id);
    if(row.status==="PENDING_HUMAN_REVIEW"){
      if(row.reviewer||row.evidence)throw Error("Apague nome/evidência do registro pendente: "+id);
    }else{
      if(row.reviewer.trim().length<3||row.reviewer.length>120||
        /[\r\n]/u.test(row.reviewer)||unsafeDisplayControl(row.reviewer)||
        /^\s*[=+\-@]/u.test(row.reviewer))
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
  function exportSummary(){
    try{
      // A summary is NOT a durable substitute for the editable CSV.
      // Keep dirty=true until the user explicitly exports the CSV.
      const rows=[];
      for(const item of items){
        const record=state.get(key(item));
        valid(record,key(item));
        rows.push({item,record});
      }
      const total=(status)=>rows.filter(x=>x.record.status===status).length;
      const lines=[
        "UNIVERSIDADE IMAGINE — RELATÓRIO EDITORIAL OFFLINE",
        "HOLD_NO_GO — NÃO É APROVAÇÃO NEM PUBLICAÇÃO",
        "Status de revisor é somente DECLARADO, não autenticado.",
        "35 aulas · 10 cursos · conteúdo verificado por hash no pacote",
        "Pendentes: "+total("PENDING_HUMAN_REVIEW"),
        "Precisam ajustes: "+total("NEEDS_CHANGES"),
        "Aceites declarados NÃO verificados: "+total("CLAIMED_HUMAN_APPROVED"),
        ""
      ];
      for(const slug of courses){
        const group=rows.filter(x=>x.item.course_slug===slug);
        const count=(status)=>group.filter(x=>x.record.status===status).length;
        lines.push(
          "CURSO: "+group[0].item.course_title,
          "Pendentes "+count("PENDING_HUMAN_REVIEW")+
            " | Ajustes "+count("NEEDS_CHANGES")+
            " | Declarações não verificadas "+count("CLAIMED_HUMAN_APPROVED"),
          ""
        );
        for(const {item,record} of group){
          lines.push(
            "["+record.status+"] "+item.lesson_title,
            "ID "+key(item),
            "SHA-256 "+item.content_sha256
          );
          if(record.reviewer)lines.push("Revisor informado (não autenticado): "+record.reviewer);
          if(record.evidence)lines.push("Evidência informada (não conferida): "+record.evidence);
          if(record.notes)lines.push("Observações: "+record.notes);
          lines.push("");
        }
      }
      lines.push(
        "Para continuar editando, é obrigatório exportar revisao.csv.",
        "13 gates operacionais continuam bloqueados; nenhuma aula foi publicada."
      );
      const url=URL.createObjectURL(new Blob([lines.join("\n")+"\n"],{type:"text/plain;charset=utf-8"}));
      const link=document.createElement("a");
      link.href=url;link.download="resumo-revisao.txt";
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      message("Resumo exportado. Exporte o CSV para preservar a revisão editável.");
    }catch(error){message(String(error.message),true);}
  }
  // Existing CSV can be imported locally to resume review on another day.
  // Hashes and 35 unique lesson identities must match the CURRENT source.
  function parseCsv(text){
    if(typeof text!=="string"||text.length>1000000)throw Error("CSV excede 1 MB.");
    const raw=text.replace(/^\uFEFF/u,"");
    const delimiter=raw.split(/\r?\n/u,1)[0].includes('";"')?";":",";
    const rows=[];
    let row=[],field="",quoted=false,atStart=true,closedQuote=false;
    for(let i=0;i<raw.length;i++){
      const ch=raw[i];
      // RFC 4180: after the closing quote only a delimiter or row break is legal.
      // Previously, '"ABC"DEF' could silently be interpreted as 'ABCDEF'.
      if(!quoted&&closedQuote&&ch!==delimiter&&ch!=='\n'&&ch!=='\r')
        throw Error("Texto após aspas fechadas no CSV.");
      if(quoted){
        if(ch==='"'){
          if(raw[i+1]==='"'){field+='"';i++;}
          else {quoted=false;closedQuote=true;}
        }else field+=ch;
      }else if(ch==='"'&&atStart){quoted=true;atStart=false;}
      else if(ch===delimiter){row.push(field);field="";atStart=true;closedQuote=false;}
      else if(ch==='\n'){row.push(field);rows.push(row);row=[];field="";atStart=true;closedQuote=false;}
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
      const mode=$("import-mode").value;
      if(mode==="replace"){
        // Validate the ENTIRE input before asking to discard existing work.
        if(dirty&&!window.confirm("Substituir todas as 35 linhas? Revisões locais não exportadas serão perdidas.")){
          message("Substituição cancelada; revisões existentes preservadas.");
          return;
        }
        for(const [id,item] of next)state.set(id,item);
        dirty=true;render();
        message("CSV carregado por substituição. Nenhuma aprovação foi autenticada.");
        return;
      }
      if(mode!=="merge")throw Error("Modo de importação inválido.");
      const proposed=new Map();
      let updated=0;
      for(const [id,incoming] of next){
        const currentRow=state.get(id);
        if(!currentRow)throw Error("Aula inexistente na sessão: "+id);
        let chosen=currentRow;
        if(currentRow.status==="PENDING_HUMAN_REVIEW"){
          // Pending fields may still hold unexported, invalid reviewer input.
          // Never overwrite these local buffers through a merge.
          if(currentRow.reviewer!==""||currentRow.evidence!=="")
            throw Error("Conflito: campos locais pendentes ainda preenchidos: "+id);
          if(incoming.status!=="PENDING_HUMAN_REVIEW"){
            if(currentRow.notes!==""&&currentRow.notes!==incoming.notes)
              throw Error("Conflito entre observação pendente e revisão recebida: "+id);
            chosen=incoming;
          }else if(currentRow.notes===""&&incoming.notes!==""){
            chosen=incoming;
          }else if(currentRow.notes!==""&&incoming.notes!==""
            &&currentRow.notes!==incoming.notes){
            throw Error("Conflito entre observações pendentes: "+id);
          }
        }else if(incoming.status!=="PENDING_HUMAN_REVIEW"){
          if(JSON.stringify(currentRow)!==JSON.stringify(incoming))
            throw Error("Conflito entre revisões já preenchidas: "+id);
        }else if(incoming.notes!==""&&incoming.notes!==currentRow.notes){
          throw Error("Conflito: observação pendente remota difere da revisão existente: "+id);
        }
        proposed.set(id,chosen);
        if(JSON.stringify(currentRow)!==JSON.stringify(chosen))updated++;
      }
      // All-or-nothing. No record changes until the entire merge succeeded.
      if(updated===0){
        message("CSV sem novidades; nenhuma revisão foi substituída.");
        return;
      }
      for(const [id,item] of proposed)state.set(id,item);
      dirty=true;render();
      message("CSV carregado por mesclagem: "+updated+
        " aula(s) incorporada(s). Exporte o CSV; nenhum aceite foi autenticado.");
    }catch(error){
      message("Importação recusada: "+String(error.message),true);
    }finally{$("import").value="";}
  }
  $("review-search").addEventListener("input",updateReviewResults);
  $("review-filter").addEventListener("change",updateReviewResults);
  $("lessons").addEventListener("change",e=>choose(Number(e.target.value)));
  $("previous").addEventListener("click",()=>choose(current-1));
  $("next").addEventListener("click",()=>choose(current+1));
  $("next-pending").addEventListener("click",()=>jumpToStatus("PENDING_HUMAN_REVIEW"));
  $("next-adjustment").addEventListener("click",()=>jumpToStatus("NEEDS_CHANGES"));
  ["status","reviewer","evidence","notes"].forEach(id=>$(id).addEventListener("input",update));
  $("export").addEventListener("click",exportCsv);
  $("export-summary").addEventListener("click",exportSummary);
  $("import").addEventListener("change",e=>{void importCsv(e.target.files[0]);});
  window.addEventListener("beforeunload",e=>{
    if(dirty){e.preventDefault();e.returnValue="";}
  });
  render();
  message("35 aulas em rascunho. Somente revisão offline, sem acesso a clientes.");
})();