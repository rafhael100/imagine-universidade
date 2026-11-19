"use strict";
(function(){
  const items=REVIEW_ITEMS;
  if(items.length!==35)throw Error("Acervo editorial incompleto");
  const $=id=>document.getElementById(id);
  const state=new Map(items.map(item=>[item.course_slug+"/"+item.lesson_slug,{
    status:"PENDING_HUMAN_REVIEW",reviewer:"",evidence:"",notes:""
  }]));
  let current=0,dirty=false,importing=false,exportPendingSnapshot=null;
  // An initiated browser download does not prove that the file reached disk.
  function invalidateExportAcknowledgement(){
    exportPendingSnapshot=null;
    $("confirm-export").disabled=true;
  }
  function confirmExport(){
    if(importing){
      message("Conclua a importação antes de confirmar o salvamento.",true);
      return;
    }
    if(exportPendingSnapshot===null||JSON.stringify([...state])!==exportPendingSnapshot){
      invalidateExportAcknowledgement();
      message("O rascunho mudou desde a exportação. Exporte o CSV novamente.",true);
      return;
    }
    dirty=false;
    invalidateExportAcknowledgement();
    message("Salvamento confirmado por você nesta sessão. Isso não autentica aprovação.");
  }
  const key=item=>item.course_slug+"/"+item.lesson_slug;
  const courses=[...new Set(items.map(item=>item.course_slug))];
  function message(value,error=false){
    const target=$("message");
    // This is an aria-live region: reassigning the identical text on every
    // keystroke causes duplicate announcements for assistive technology.
    if(target.textContent!==value)target.textContent=value;
    target.classList.toggle("error",error);
  }
  function counts(){
    const stats={PENDING_HUMAN_REVIEW:0,NEEDS_CHANGES:0,CLAIMED_HUMAN_APPROVED:0};
    for(const row of state.values())stats[row.status]++;
    const summary=stats.PENDING_HUMAN_REVIEW+" pendentes · "+
      stats.NEEDS_CHANGES+" pedem ajustes · "+stats.CLAIMED_HUMAN_APPROVED+
      " declarações humanas NÃO autenticadas";
    if($("summary").textContent!==summary)$("summary").textContent=summary;
    for(const button of $("courses").querySelectorAll(".course-item")){
      const slug=button.dataset.courseSlug;
      const rows=items.filter(item=>item.course_slug===slug);
      const pending=rows.filter(item=>state.get(key(item)).status==="PENDING_HUMAN_REVIEW").length;
      const label=rows[0].course_title+" ("+pending+" pendentes / "+rows.length+")";
      // Do not rewrite the navigation label on every keystroke.
      if(button.textContent!==label)button.textContent=label;
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
    const countLabel=active
      ?matches.length+" aulas encontradas neste filtro"
      :"Digite para localizar uma aula ou selecione uma situação.";
    // Only actual changes should enter this aria-live region.
    if($("review-search-count").textContent!==countLabel)
      $("review-search-count").textContent=countLabel;
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
    // C185: prevent an in-flight file read from racing with edits, even if a
    // script dispatches input events on disabled form fields.
    if(importing){
      render();
      message("Importação em andamento: edição bloqueada até concluir.");
      return;
    }
    const row=state.get(key(items[current]));
    row.status=$("status").value;
    row.reviewer=$("reviewer").value;
    row.evidence=$("evidence").value;
    row.notes=$("notes").value;
    dirty=true;invalidateExportAcknowledgement();counts();
    updateReviewResults();
    message("Alterações apenas na memória. Exporte o CSV antes de sair.");
  }
  // Invisible Unicode format characters, including zero-width space and BOM,
  // can spoof a reviewer or conceal a spreadsheet formula. Mirror the CLI fence.
  function unsafeDisplayControl(value){
    // Cf includes further bidi and soft-hyphen controls; extend to invisible
    // combining grapheme joiner and variation selectors outside category Cf.
    return /[\p{Cf}\u034f\u180e\u2028\u2029\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/u.test(value);
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
        /[\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(row.reviewer)||unsafeDisplayControl(row.reviewer)||
        /^\s*[=+\-@]/u.test(row.reviewer))
        throw Error("Informe revisor válido: "+id);
      if(!/^https:\/\/github\.com\/rafhael100\/imagine-universidade\/(?:issues|pull)\/[1-9]\d*(?:#issuecomment-[1-9]\d*)?$/iu.test(row.evidence))
        throw Error("Informe issue/PR de evidência da Universidade: "+id);
    }
  }
  const csv=v=>'"'+String(v).replaceAll('"','""')+'"';
  function exportCsv(){
    if(importing){
      message("Conclua a importação antes de exportar.",true);
      return;
    }
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
      // Do not clear the unsaved-work guard until the reviewer personally
      // confirms that revisao.csv exists on their device.
      exportPendingSnapshot=JSON.stringify([...state]);
      dirty=true;
      $("confirm-export").disabled=false;
      message("Download solicitado. Confira revisao.csv no dispositivo e confirme o salvamento.");
    }catch(error){message(String(error.message),true);}
  }
  function exportSummary(){
    if(importing){
      message("Conclua a importação antes de gerar o resumo.",true);
      return;
    }
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
      // Prefix every continuation of an untrusted multiline note. Otherwise
      // a reviewer could visually spoof a report heading or aggregate count.
      const displayNote=note=>note.replace(/\r\n?/gu,"\n").split("\n")
        .map((line,i)=>(i===0?"Observações não autenticadas: ":"  | ")+line)
        .join("\n");
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
          if(record.notes)lines.push(displayNote(record.notes));
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
    if(importing){
      message("Outra importação já está em andamento.",true);
      return;
    }
    // Capture the selected operation BEFORE file I/O: a mode switch during
    // an awaited read must not turn a merge into a destructive replacement.
    const mode=$("import-mode").value;
    const editors=["status","reviewer","evidence","notes"];
    const confirmationWasEnabled=!$("confirm-export").disabled;
    importing=true;
    $("import").disabled=true;
    $("import-mode").disabled=true;
    for(const id of editors)$(id).disabled=true;
    for(const id of ["export","export-summary","confirm-export"])$(id).disabled=true;
    message("Importação em andamento; edição e exportação temporariamente bloqueadas.");
    try{
      if(file.size>1000000)throw Error("CSV excede 1 MB.");
      // File.text() can silently replace damaged UTF-8 with U+FFFD.
      let decoded;
      try{decoded=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());}
      catch{throw Error("CSV deve usar UTF-8 válido; arquivo não foi importado.");}
      const parsed=parseCsv(decoded);
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
      if(mode==="replace"){
        // A clean editor may still have a valid prior CSV or an accidental
        // mode selection. Always ask before discarding a differing draft.
        const differences=[...next].filter(([id,item])=>
          JSON.stringify(state.get(id))!==JSON.stringify(item)).length;
        if(differences===0){
          message("CSV idêntico: sem diferenças para substituir. Rascunho preservado.");
          return;
        }
        const warning="Substituir "+differences+" de 35 aula(s) pelo CSV recebido? "+
          "Esta ação descarta qualquer revisão local divergente."+
          (dirty?" Há alterações locais ainda não exportadas.":"")+
          " Nenhum aceite será autenticado.";
        if(!window.confirm(warning)){
          message("Substituição cancelada; revisões existentes preservadas.");
          return;
        }
        for(const [id,item] of next)state.set(id,item);
        dirty=true;invalidateExportAcknowledgement();render();
        message("CSV carregado por substituição: "+differences+
          " aula(s) alterada(s). Nenhuma aprovação foi autenticada.");
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
      dirty=true;invalidateExportAcknowledgement();render();
      message("CSV carregado por mesclagem: "+updated+
        " aula(s) incorporada(s). Exporte o CSV; nenhum aceite foi autenticado.");
    }catch(error){
      message("Importação recusada: "+String(error.message),true);
    }finally{
      importing=false;
      $("import-mode").disabled=false;
      $("import").disabled=false;
      for(const id of editors)$(id).disabled=false;
      $("export").disabled=false;
      $("export-summary").disabled=false;
      // A rejected or unchanged CSV must not destroy an existing acknowledgment.
      $("confirm-export").disabled=!(confirmationWasEnabled&&
        exportPendingSnapshot!==null&&JSON.stringify([...state])===exportPendingSnapshot);
      $("import").value="";
    }
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
  $("confirm-export").addEventListener("click",confirmExport);
  $("export-summary").addEventListener("click",exportSummary);
  $("import").addEventListener("change",e=>{void importCsv(e.target.files[0]);});
  window.addEventListener("beforeunload",e=>{
    if(dirty){e.preventDefault();e.returnValue="";}
  });
  render();
  message("35 aulas em rascunho. Somente revisão offline, sem acesso a clientes.");
})();