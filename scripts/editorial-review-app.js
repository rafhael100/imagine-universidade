"use strict";
(function(){
  const items=REVIEW_ITEMS;
  if(items.length!==35)throw Error("Acervo editorial incompleto");
  const $=id=>document.getElementById(id);
  const state=new Map(items.map(item=>[item.course_slug+"/"+item.lesson_slug,{
    status:"PENDING_HUMAN_REVIEW",reviewer:"",evidence:"",notes:""
  }]));
  let current=0,dirty=false,importing=false,exportPendingSnapshot=null;
  let lastAuditErrorIndex=null;
  // An initiated browser download does not prove that the file reached disk.
  function invalidateExportAcknowledgement(){
    exportPendingSnapshot=null;
    $("confirm-export").disabled=true;
  }
  // ERD-R62: an audit result is a temporary observation of the local draft,
  // never a persisted editorial signoff. A subsequent edit invalidates it.
  function invalidateAudit(){
    lastAuditErrorIndex=null;
    $("audit-first-error").disabled=true;
    if($("audit-result").textContent!=="")$("audit-result").textContent="";
    // R65: never leave a stale invalid-record list after an edit/import.
    const list=$("audit-errors");
    if(list.childElementCount)list.replaceChildren();
    list.hidden=true;
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
  // ERD-R53: name all editorial states per course; a declaration is NOT signoff.
  function courseReviewCounts(slug){
    const group=items.filter(item=>item.course_slug===slug);
    const statuses=group.map(item=>state.get(key(item)).status);
    return {total:group.length,
      pending:statuses.filter(status=>status==="PENDING_HUMAN_REVIEW").length,
      changes:statuses.filter(status=>status==="NEEDS_CHANGES").length,
      claims:statuses.filter(status=>status==="CLAIMED_HUMAN_APPROVED").length};
  }
  function courseNavigationLabel(slug){
    const first=items.find(item=>item.course_slug===slug);
    const stats=courseReviewCounts(slug);
    return first.course_title+" ("+stats.pending+" pendentes / "+stats.total+
      " · "+stats.changes+" com ajustes · "+stats.claims+
      " declarações não verificadas)";
  }
  // ERD-R54: selecting a course starts at the next pending lesson, then
  // a needs-changes lesson, and only then a non-authenticated claim.
  function firstActionableLesson(slug){
    const indices=items.map((item,i)=>item.course_slug===slug?i:-1).filter(i=>i>=0);
    for(const wanted of ["PENDING_HUMAN_REVIEW","NEEDS_CHANGES"]){
      const match=indices.find(i=>state.get(key(items[i])).status===wanted);
      if(match!==undefined)return match;
    }
    return indices[0];
  }
  // R57: continue within the same course without jumping to other courses.
  // The current lesson is not another pending item.
  function hasAnotherPendingInCourse(){
    return items.some((item,i)=>i!==current&&
      item.course_slug===items[current].course_slug&&
      state.get(key(item)).status==="PENDING_HUMAN_REVIEW");
  }
  // R59: next adjustment must be restricted to the current course.
  function hasAnotherAdjustmentInCourse(){
    return items.some((item,i)=>i!==current&&
      item.course_slug===items[current].course_slug&&
      state.get(key(item)).status==="NEEDS_CHANGES");
  }
  function message(value,error=false){
    const target=$("message");
    // This is an aria-live region: reassigning the identical text on every
    // keystroke causes duplicate announcements for assistive technology.
    // ERD-R48: errors need assertive announcements; normal state changes
    // remain polite to avoid repeated interruptions for screen reader users.
    const role=error?"alert":"status",live=error?"assertive":"polite";
    if(target.getAttribute("role")!==role)target.setAttribute("role",role);
    if(target.getAttribute("aria-live")!==live)target.setAttribute("aria-live",live);
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
      const label=courseNavigationLabel(slug);
      // Do not rewrite the navigation label on every keystroke.
      if(button.textContent!==label)button.textContent=label;
    }
    $("next-pending").disabled=stats.PENDING_HUMAN_REVIEW===0;
    $("next-adjustment").disabled=stats.NEEDS_CHANGES===0;
    $("next-pending-course").disabled=!hasAnotherPendingInCourse();
    $("next-adjustment-course").disabled=!hasAnotherAdjustmentInCourse();
    // R56: expose each lesson's state in the native picker, preserving option
    // identity and not rewriting its accessible name on ordinary note edits.
    for(const option of $("lessons").options){
      const lesson=items[Number(option.value)];
      if(!lesson)continue;
      const label=lessonPickerLabel(lesson);
      if(option.textContent!==label)option.textContent=label;
    }
  }
  function normalizeSearch(value){
    return value.normalize("NFKD").replace(/\p{M}/gu,"").toLocaleLowerCase("pt-BR").trim();
  }
  // ERD-R50: distinguish backlog states in every local search result.
  // Never present a mere declaration as authenticated editorial approval.
  const reviewStatusLabels={
    PENDING_HUMAN_REVIEW:"Pendente",
    NEEDS_CHANGES:"Requer ajustes",
    CLAIMED_HUMAN_APPROVED:"Aceite declarado (não autenticado)"
  };
  const lessonPickerLabel=lesson=>lesson.lesson_title+" · "+
    reviewStatusLabels[state.get(key(lesson)).status];
  const reviewResultLabel=lesson=>lesson.course_title+" · "+lesson.lesson_title+
    " · Situação: "+reviewStatusLabels[state.get(key(lesson)).status];
  function updateReviewResults(){
    const term=normalizeSearch($("review-search").value);
    const status=$("review-filter").value;
    const matches=[];
    items.forEach((lesson,i)=>{
      if(status!=="ALL"&&state.get(key(lesson)).status!==status)return;
      // ERD-R01: local-only search includes the reviewer draft, without rendering
      // untrusted notes in result labels or sending them to a server.
      const draft=state.get(key(lesson));
      const searchable=normalizeSearch(lesson.course_title+" "+lesson.lesson_title+
        " "+draft.notes+" "+draft.reviewer);
      if(term!==""&&!searchable.includes(term))return;
      matches.push([i,lesson]);
    });
    const active=term!==""||status!=="ALL",holder=$("review-results");
    // R60: result filtering can detach a focused keyboard target. Capture it
    // before hiding or replacing children; never leave focus on <body>.
    const focusedResult=holder.contains(document.activeElement)
      ?document.activeElement.closest(".review-result"):null;
    const focusedLessonIndex=focusedResult?.dataset.lessonIndex;
    holder.hidden=!active;
    const countLabel=active
      ?(matches.length===1?"1 aula encontrada neste filtro":matches.length+" aulas encontradas neste filtro")
      :"Digite para localizar uma aula ou selecione uma situação.";
    // Only actual changes should enter this aria-live region.
    if($("review-search-count").textContent!==countLabel)
      $("review-search-count").textContent=countLabel;
    if(!active){
      if(holder.childElementCount)holder.replaceChildren();
      if(focusedResult)$("review-search").focus();
      return;
    }
    // ERD-R04: do not destroy identical result buttons on each keystroke.
    // Keeping their DOM identity preserves keyboard focus and avoids noisy
    // re-announcements while the search result identities remain unchanged.
    const buttons=[...holder.querySelectorAll(".review-result")];
    const sameResults=buttons.length===matches.length&&
      buttons.every((button,j)=>button.dataset.lessonIndex===String(matches[j][0]));
    if(!sameResults){
      holder.replaceChildren();
      for(const [i,lesson] of matches){
        const b=document.createElement("button");
        b.className="review-result";
        b.type="button";
        b.dataset.lessonIndex=String(i);
        b.textContent=reviewResultLabel(lesson);
        b.addEventListener("click",()=>choose(i));
        holder.append(b);
      }
      if(focusedResult){
        const survivor=[...holder.querySelectorAll(".review-result")]
          .find(button=>button.dataset.lessonIndex===focusedLessonIndex);
        (survivor||$("review-search")).focus();
      }
    }
    // Selection can change without changing the result identities.
    for(const button of holder.querySelectorAll(".review-result")){
      const lesson=items[Number(button.dataset.lessonIndex)];
      // Keep button identity and focus while refreshing its live draft state.
      const nextLabel=reviewResultLabel(lesson);
      if(button.textContent!==nextLabel)button.textContent=nextLabel;
      const selected=button.dataset.lessonIndex===String(current);
      if(button.getAttribute("aria-current")!==(selected?"true":"false"))
        button.setAttribute("aria-current",selected?"true":"false");
    }
  }
  function render(){
    const lesson=items[current],row=state.get(key(lesson));
    const nav=$("courses");
    nav.replaceChildren();
    for(const slug of courses){
      const button=document.createElement("button");
      button.type="button";
      button.className="course-item";
      button.dataset.courseSlug=slug;
      button.textContent=courseNavigationLabel(slug);
      button.setAttribute("aria-current",slug===lesson.course_slug?"true":"false");
      button.addEventListener("click",()=>choose(firstActionableLesson(slug)));
      nav.append(button);
    }
    const picker=$("lessons");picker.replaceChildren();
    items.forEach((item,i)=>{
      if(item.course_slug!==lesson.course_slug)return;
      const option=document.createElement("option");
      option.value=String(i);option.textContent=lessonPickerLabel(item);
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
  function jumpToNextPendingInCourse(){
    const course=items[current].course_slug;
    for(let n=1;n<items.length;n++){
      const idx=(current+n)%items.length;
      if(items[idx].course_slug===course&&
        state.get(key(items[idx])).status==="PENDING_HUMAN_REVIEW"){
        choose(idx);return;
      }
    }
    message("Não há outra aula pendente neste curso.");
  }
  function jumpToNextAdjustmentInCourse(){
    const course=items[current].course_slug;
    for(let n=1;n<items.length;n++){
      const idx=(current+n)%items.length;
      if(items[idx].course_slug===course&&
        state.get(key(items[idx])).status==="NEEDS_CHANGES"){
        choose(idx);return;
      }
    }
    message("Não há outra aula com ajustes neste curso.");
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
    dirty=true;invalidateExportAcknowledgement();invalidateAudit();counts();
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
    // C191: C1 NEL/CSI can spoof report boundaries.
    if(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/u.test(row.notes)||unsafeDisplayControl(row.notes))
      throw Error("Caracteres de controle ou direção invisível nas observações: "+id);
    if(row.status==="PENDING_HUMAN_REVIEW"){
      if(row.reviewer||row.evidence)throw Error("Apague nome/evidência do registro pendente: "+id);
    }else{
      if(row.reviewer.trim().length<3||row.reviewer.length>120||
        /[\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/u.test(row.reviewer)||unsafeDisplayControl(row.reviewer)||
        /^\s*[=+\-@]/u.test(row.reviewer))
        throw Error("Informe revisor válido: "+id);
      if(!/^https:\/\/github\.com\/rafhael100\/imagine-universidade\/(?:issues|pull)\/[1-9]\d*(?:#issuecomment-[1-9]\d*)?$/iu.test(row.evidence))
        throw Error("Informe issue/PR de evidência da Universidade: "+id);
    }
  }
  // ERD-R62: validate all 35 records before CSV export, collect failures
  // without sending notes, names or any draft data over the network.
  // Only a human-triggered audit changes the live-region summary.
  function auditDraft(){
    if(importing){
      message("Conclua a importação antes de verificar o rascunho.",true);
      return;
    }
    const errors=[];
    const list=$("audit-errors");
    list.replaceChildren();
    list.hidden=true;
    items.forEach((item,index)=>{
      try{valid(state.get(key(item)),key(item));}
      catch(error){errors.push({index,reason:String(error.message)});}
    });
    if(errors.length===0){
      lastAuditErrorIndex=null;
      $("audit-first-error").disabled=true;
      $("audit-result").textContent=
        "35 registros válidos para exportação CSV. Isto NÃO autentica aceites nem libera publicação.";
      message("Validação local concluída. Exporte o CSV para preservar a revisão.");
      return;
    }
    // R65: enumerate all 35 potential failures as keyboard-operable,
    // text-only buttons. Do not interpolate reviewer notes as HTML.
    for(const error of errors){
      const button=document.createElement("button");
      button.type="button";
      button.className="audit-error";
      button.textContent=String(error.index+1)+"/35 · "+
        items[error.index].lesson_title+" · "+error.reason;
      button.addEventListener("click",()=>choose(error.index));
      list.append(button);
    }
    list.hidden=false;
    lastAuditErrorIndex=errors[0].index;
    $("audit-first-error").disabled=false;
    $("audit-result").textContent=errors.length+
      " registro(s) com inconsistências locais. Primeira: "+errors[0].reason+
      ". Corrija os campos e execute a verificação novamente. Nenhum aceite foi autenticado.";
    message("Verificação local encontrou "+errors.length+" registro(s) com inconsistências.",true);
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
    for(const id of ["export","export-summary","confirm-export","audit-draft","audit-first-error"])$(id).disabled=true;
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
        const changedIds=[...next].filter(([id,item])=>
          JSON.stringify(state.get(id))!==JSON.stringify(item)).map(([id])=>id);
        const differences=changedIds.length;
        if(differences===0){
          message("CSV idêntico: sem diferenças para substituir. Rascunho preservado.");
          return;
        }
        const warning="Substituir "+differences+" de 35 aula(s) pelo CSV recebido? "+
          "Esta ação descarta qualquer revisão local divergente."+
          (dirty?" Há alterações locais ainda não exportadas.":"")+
          " Nenhum aceite será autenticado."+ 
          "\n\nAulas divergentes (até 5):\n"+
          changedIds.slice(0,5).map(id=>"  - "+id).join("\n")+
          (differences>5?"\n  ... e mais "+(differences-5)+" aula(s).":"");
        if(!window.confirm(warning)){
          message("Substituição cancelada; revisões existentes preservadas.");
          return;
        }
        for(const [id,item] of next)state.set(id,item);
        dirty=true;invalidateExportAcknowledgement();invalidateAudit();render();
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
      dirty=true;invalidateExportAcknowledgement();invalidateAudit();render();
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
      $("audit-draft").disabled=false;
      $("audit-first-error").disabled=lastAuditErrorIndex===null;
      // A rejected or unchanged CSV must not destroy an existing acknowledgment.
      $("confirm-export").disabled=!(confirmationWasEnabled&&
        exportPendingSnapshot!==null&&JSON.stringify([...state])===exportPendingSnapshot);
      $("import").value="";
    }
  }
  $("review-search").addEventListener("input",updateReviewResults);
  $("review-filter").addEventListener("change",updateReviewResults);
  // ERD-R05: keyboard access to the actual result buttons. Arrow keys never
  // modify draft data, and native Enter/Space activation remains intact.
  const resultButtons=()=>[...$("review-results").querySelectorAll("button.review-result")];
  $("review-search").addEventListener("keydown",event=>{
    if(event.key!=="ArrowDown")return;
    const buttons=resultButtons();
    if(!buttons.length)return;
    event.preventDefault();
    buttons[0].focus();
  });
  $("review-results").addEventListener("keydown",event=>{
    const buttons=resultButtons(),index=buttons.indexOf(event.target);
    if(index<0)return;
    if(event.key==="Escape"){
      event.preventDefault();
      $("review-search").focus();
    }else if(event.key==="ArrowUp"){
      event.preventDefault();
      if(index===0)$("review-search").focus();
      else buttons[index-1].focus();
    }else if(event.key==="ArrowDown"){
      event.preventDefault();
      buttons[Math.min(index+1,buttons.length-1)].focus();
    }else if(event.key==="Home"){
      event.preventDefault();
      buttons[0].focus();
    }else if(event.key==="End"){
      event.preventDefault();
      buttons[buttons.length-1].focus();
    }
  });
  $("lessons").addEventListener("change",e=>choose(Number(e.target.value)));
  $("previous").addEventListener("click",()=>choose(current-1));
  $("next").addEventListener("click",()=>choose(current+1));
  $("next-pending").addEventListener("click",()=>jumpToStatus("PENDING_HUMAN_REVIEW"));
  $("next-pending-course").addEventListener("click",jumpToNextPendingInCourse);
  $("next-adjustment-course").addEventListener("click",jumpToNextAdjustmentInCourse);
  $("next-adjustment").addEventListener("click",()=>jumpToStatus("NEEDS_CHANGES"));
  ["status","reviewer","evidence","notes"].forEach(id=>$(id).addEventListener("input",update));
  $("export").addEventListener("click",exportCsv);
  $("confirm-export").addEventListener("click",confirmExport);
  $("export-summary").addEventListener("click",exportSummary);
  $("audit-draft").addEventListener("click",auditDraft);
  $("audit-first-error").addEventListener("click",()=>{
    if(lastAuditErrorIndex!==null&&!importing)choose(lastAuditErrorIndex);
  });
  $("import").addEventListener("change",e=>{void importCsv(e.target.files[0]);});
  window.addEventListener("beforeunload",e=>{
    if(dirty){e.preventDefault();e.returnValue="";}
  });
  render();
  message("35 aulas em rascunho. Somente revisão offline, sem acesso a clientes.");
})();