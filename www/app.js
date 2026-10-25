(() => {
"use strict";
const KEY="ld_manutencao_industrial_v3";
const OLD_KEYS=["manutencaoIndustrialLD_equipamentos","ld_manutencao_industrial_v1"];
const DEFAULT={
  assets:[],
  orders:[],
  inventory:[],
  inventoryMoves:[],
  settings:{
    technician:"Léo",
    technicianSignature:""
  },
  nextAsset:1,
  nextOrder:1
};
let state=loadState(),view="dashboard",query="",filter="Todos",modalHandler=null,pads={};

function loadState(){
  try{
    const saved=localStorage.getItem(KEY);
    if(saved){const s=JSON.parse(saved);return {...structuredClone(DEFAULT),...s,settings:{...DEFAULT.settings,...(s.settings||{})}};}
  }catch(e){console.warn(e);}
  const migrated={...structuredClone(DEFAULT)};
  try{
    const old=JSON.parse(localStorage.getItem(OLD_KEYS[0])||"[]");
    if(Array.isArray(old)) migrated.assets=old.map((a,i)=>({id:String(a.id||("EQ-"+String(i+1).padStart(3,"0"))),code:a.identificacao||a.codigo||("EQ-"+String(i+1).padStart(3,"0")),name:a.nome||a.name||"Equipamento",client:a.cliente||"",sector:a.setor||"",brand:a.marca||"",model:a.modelo||"",status:normalizeStatus(a.status),notes:a.observacoes||"",created:a.criadoEm||new Date().toISOString(),nextMaintenance:""}));
  }catch(e){}
  try{
    const old=JSON.parse(localStorage.getItem(OLD_KEYS[1])||"null");
    if(old&&Array.isArray(old.assets)){migrated.assets=old.assets.map(a=>({...a,code:a.code||a.id,status:normalizeStatus(a.status)}));migrated.orders=old.orders||[];}
  }catch(e){}
  return migrated;
}
function normalizeStatus(s){return ({"Operacional":"Em operação","Parado":"Parado","Em manutenção":"Em manutenção","Aguardando peças":"Aguardando peças","Desativado":"Desativado"})[s]||"Em operação";}
function saveState(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){alert("O armazenamento ficou cheio. Tente usar fotos menores ou exportar um backup antes de continuar.");return false;}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function nextId(prefix,key){const n=Number(state[key]||1);state[key]=n+1;return prefix+"-"+String(n).padStart(3,"0");}
function fmtDate(v){if(!v)return "—";const d=new Date(v.length===10?v+"T12:00:00":v);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("pt-BR");}
function statusClass(s){return ({"Em operação":"operacional","Em manutenção":"manutencao","Parado":"parado","Aguardando peças":"aguardando","Desativado":"desativado","Concluída":"concluida","Aberta":"aberta"})[s]||"";}
function pill(s){return `<span class="pill ${statusClass(s)}">${esc(s)}</span>`;}
function assetById(id){return state.assets.find(a=>String(a.id)===String(id));}
function orderAsset(o){return assetById(o.assetId)?.name||"Equipamento não encontrado";}
function render(){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===view));

  const root=document.getElementById("app");

  root.innerHTML=
    view==="dashboard"?dashboard():
    view==="assets"?assetsView():
    view==="inventory"?inventoryView():
    view==="orders"?ordersView():
    view==="calendar"?calendarView():
    view==="reports"?reportsView():
    settingsView();

  bind();
}
function dashboard(){
  const open=state.orders.filter(o=>o.status!=="Concluída").length;
  const stopped=state.assets.filter(a=>["Parado","Em manutenção","Aguardando peças"].includes(a.status)).length;
  const due=state.assets.filter(a=>a.nextMaintenance&&new Date(a.nextMaintenance+"T23:59:59")<new Date()&&a.status!=="Desativado").length;
  const recent=[...state.orders].sort((a,b)=>(b.created||"").localeCompare(a.created||"")).slice(0,4);
  return `<div class="section-head"><div><h2>Visão geral</h2><div class="sub">Controle dos equipamentos e serviços da LD AUTOMAÇÃO</div></div><button class="btn primary" data-action="new-order">+ Nova manutenção</button></div>
  <div class="stats"><div class="stat"><div class="label">Equipamentos</div><div class="num">${state.assets.length}</div><div class="sub">Cadastrados</div></div><div class="stat"><div class="label">Em operação</div><div class="num green">${state.assets.filter(a=>a.status==="Em operação").length}</div><div class="sub">Disponíveis</div></div><div class="stat"><div class="label">OS em aberto</div><div class="num yellow">${open}</div><div class="sub">Aguardando conclusão</div></div><div class="stat"><div class="label">Preventivas vencidas</div><div class="num ${due?"red":"green"}">${due}</div><div class="sub">Verifique as datas</div></div></div>
  <div class="section-head"><div><h2>Últimas manutenções</h2><div class="sub">Histórico recente</div></div><button class="btn secondary" data-view="orders">Ver histórico</button></div>
  ${recent.length?`<div class="cards">${recent.map(orderCard).join("")}</div>`:`<div class="empty">Ainda não há manutenções registradas.<br><br>Cadastre um equipamento e toque em “Nova manutenção”.</div>`}
  <div class="toolbar"><button class="btn secondary" data-action="backup">Exportar backup</button><button class="btn secondary" data-action="restore">Importar backup</button><button class="btn secondary" data-action="tech-signature">Assinatura do técnico</button></div>
  <div class="note">Os dados são guardados neste aparelho. Exporte um backup regularmente, principalmente antes de atualizar ou reinstalar o aplicativo.</div>`;
}
function maintenanceSummary(a){
 const preventive=state.orders.filter(o=>o.assetId===a.id&&o.type==="Preventiva"&&o.status==="Concluída").sort((x,y)=>(y.serviceDate||y.created||"").localeCompare(x.serviceDate||x.created||""));
 return preventive[0]?.serviceDate||a.lastMaintenance||"";
}
function assetDetail(a){
 if(!a)return;
 const list=state.orders.filter(o=>o.assetId===a.id).sort((x,y)=>(y.serviceDate||y.created||"").localeCompare(x.serviceDate||x.created||""));
 const item=(label,value)=>`<div class="detail-item"><span>${label}</span><strong>${esc(value||"—")}</strong></div>`;
 openModal("Ficha técnica do equipamento",`<div class="detail-heading"><h3>${esc(a.name)}</h3>${pill(a.status)}</div>
 <div class="detail-section"><h3>Identificação</h3><div class="detail-grid">${item("Código",a.code||a.id)}${item("Cliente / unidade",a.client)}${item("Setor / localização",a.sector)}${item("Fabricante / marca",a.brand)}${item("Modelo",a.model)}${item("Número de série",a.serialNumber)}</div></div>
 <div class="detail-section"><h3>Dados técnicos</h3><div class="detail-grid">${item("Tensão nominal",a.voltage)}${item("Potência nominal",a.power)}${item("Corrente nominal",a.current)}${item("Data de instalação",fmtDate(a.installationDate))}</div><p class="detail-notes"><b>Observações:</b> ${esc(a.notes||"—")}</p></div>
 <div class="detail-section"><h3>Plano preventivo</h3><div class="detail-grid">${item("Periodicidade",a.frequency)}${item("Última preventiva",fmtDate(maintenanceSummary(a)))}${item("Próxima manutenção",fmtDate(a.nextMaintenance))}</div></div>
 <div class="detail-section"><h3>Histórico de manutenções (${list.length})</h3>${list.length?list.map(o=>`<div class="history-item"><b>${fmtDate(o.serviceDate||o.created)} · ${esc(o.type||"Manutenção")} · ${esc(o.id)}</b><p>${esc(o.service||"—")}</p><p class="mini">Técnico: ${esc(o.technician||"—")}</p><div class="actions"><button type="button" class="btn secondary" data-action="view-order" data-id="${esc(o.id)}">Detalhes</button><button type="button" class="btn secondary" data-action="pdf" data-id="${esc(o.id)}">PDF</button></div></div>`).join(""):`<div class="empty">Nenhuma manutenção registrada para esta máquina.</div>`}</div>
 <div class="actions"><button type="button" class="btn primary" data-action="asset-new-order" data-id="${esc(a.id)}">+ Nova OS</button><button type="button" class="btn secondary" data-action="asset-edit" data-id="${esc(a.id)}">Editar ficha</button></div>`,null);
}
function inventoryView(){
  const items=Array.isArray(state.inventory)?state.inventory:[];

  const totalUnits=items.reduce(
    (sum,item)=>sum+Number(item.quantity||0),0
  );

  const lowStock=items.filter(
    item=>Number(item.quantity||0)<=Number(item.minStock||0)
  ).length;

  const sorted=[...items].sort((a,b)=>
    String(a.name||"").localeCompare(
      String(b.name||""),"pt-BR",{sensitivity:"base"}
    )
  );

  return `
    <div class="section-head">
      <div>
        <h2>Estoque de Peças e Materiais</h2>
        <div class="sub">Controle de materiais da LD Automação</div>
      </div>
      <button class="btn primary" data-action="new-inventory-item">
        + Cadastrar material
      </button>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="label">Itens cadastrados</div>
        <div class="num">${items.length}</div>
      </div>

      <div class="stat">
        <div class="label">Unidades disponíveis</div>
        <div class="num green">${totalUnits}</div>
      </div>

      <div class="stat">
        <div class="label">Estoque baixo</div>
        <div class="num ${lowStock?"red":"green"}">${lowStock}</div>
      </div>
    </div>

    ${sorted.length?`
      <div class="cards">
        ${sorted.map(item=>`
          <article class="card">
            <div class="card-top">
              <div>
                <h3>${esc(item.name)}</h3>
                <div class="sub">
                  ${esc(item.code)} · ${esc(item.category)}
                </div>
              </div>
              ${Number(item.quantity)<=Number(item.minStock)
                ?'<span class="pill parado">Estoque baixo</span>'
                :'<span class="pill operacional">Disponível</span>'}
            </div>

            <p>
              <b>Saldo:</b> ${Number(item.quantity)} ${esc(item.unit)}<br>
              <b>Estoque mínimo:</b> ${Number(item.minStock)} ${esc(item.unit)}<br>
              <b>Localização:</b> ${esc(item.location||"—")}
            </p>
            <div class="actions">
  <button class="btn primary"
    data-action="inventory-entry"
    data-id="${esc(item.id)}">
    + Entrada
  </button>

  <button class="btn secondary"
    data-action="inventory-exit"
    data-id="${esc(item.id)}">
    − Saída
  </button>
</div>
</article>
        `).join("")}
      </div>
    `:`
      <div class="empty">
        Nenhuma peça cadastrada no estoque.
      </div>
    `}
  `;
}
function newInventoryItem(){
  openModal(
    "Cadastrar material",
    `
    <div class="grid2">
      ${field("Nome do material *","name")}
      ${field("Código *","code")}
    </div>

    <div class="grid2">
      ${selectField("Categoria","category",[
        "Elétrica",
        "Automação",
        "Refrigeração",
        "Mecânica",
        "Outros"
      ],"Elétrica")}

      ${selectField("Unidade","unit",[
        "UN","M","KG","L","CX"
      ],"UN")}
    </div>

    <div class="grid2">
      ${field("Quantidade inicial *","quantity","0","number",'min="0" step="1" required')}
      ${field("Estoque mínimo *","minStock","0","number",'min="0" step="1" required')}
    </div>

    ${field("Localização","location")}
    ${textarea("Observações","notes")}
    `,
    fd=>{
      const name=String(fd.get("name")||"").trim();
      const code=String(fd.get("code")||"").trim();
      const quantity=Number(fd.get("quantity"));
      const minStock=Number(fd.get("minStock"));

      if(!name)throw Error("Informe o nome do material.");
      if(!code)throw Error("Informe o código do material.");

      if(state.inventory.some(i=>
        String(i.code).toLowerCase()===code.toLowerCase()
      )){
        throw Error("Já existe um material com esse código.");
      }

      if(!Number.isSafeInteger(quantity)||quantity<0){
        throw Error("Informe uma quantidade inicial válida.");
      }

      if(!Number.isSafeInteger(minStock)||minStock<0){
        throw Error("Informe um estoque mínimo válido.");
      }

      const item={
        id:"item-"+Date.now()+"-"+Math.random().toString(16).slice(2),
        name,
        code,
        category:String(fd.get("category")||"Outros"),
        unit:String(fd.get("unit")||"UN"),
        quantity,
        minStock,
        location:String(fd.get("location")||"").trim(),
        notes:String(fd.get("notes")||"").trim(),
        created:new Date().toISOString()
      };
     const previous=state.inventory;
     const previousMoves=state.inventoryMoves;

state.inventory=[...state.inventory,item];

if(quantity>0){
  state.inventoryMoves=[
    ...state.inventoryMoves,
    {
      id:"mov-"+Date.now()+"-"+Math.random().toString(16).slice(2),
      itemId:item.id,
      itemName:item.name,
      type:"Entrada inicial",
      quantity,
      previousQuantity:0,
      newQuantity:quantity,
      destination:"Cadastro inicial",
      notes:"Saldo inicial do material",
      created:new Date().toISOString()
    }
  ];
}

if(!saveState()){
  state.inventory=previous;
  state.inventoryMoves=previousMoves;
  throw Error("Não foi possível salvar o material.");
} 
      }
    }
  );
} 
function inventoryMovement(id,type){
  const item=state.inventory.find(i=>i.id===id);

  if(!item){
    alert("Material não encontrado.");
    return;
  }

  const entry=type==="entry";

  openModal(
    entry?"Entrada de material":"Saída de material",
    `
    <div class="note">
      <b>${esc(item.name)}</b><br>
      Código: ${esc(item.code)}<br>
      Saldo atual: ${Number(item.quantity)} ${esc(item.unit)}
    </div>

    ${field("Quantidade *","quantity","1","number",'min="1" step="1" required')}

    ${field(
      entry?"Origem / fornecedor":"Destino / equipamento",
      "destination"
    )}

    ${textarea("Motivo / observações","notes")}
    `,
    fd=>{
      const quantity=Number(fd.get("quantity"));
      const current=Number(item.quantity);

      if(!Number.isSafeInteger(quantity)||quantity<=0){
        throw Error("Informe uma quantidade válida.");
      }

      if(!Number.isSafeInteger(current)||current<0){
        throw Error("O saldo atual do material é inválido.");
      }

      if(!entry&&quantity>current){
        throw Error(
          "Estoque insuficiente. Disponível: "+
          current+" "+item.unit
        );
      }

      const newQuantity=entry
        ?current+quantity
        :current-quantity;

      if(!Number.isSafeInteger(newQuantity)){
        throw Error("A quantidade ultrapassa o limite permitido.");
      }

      const movement={
        id:"mov-"+Date.now()+"-"+Math.random().toString(16).slice(2),
        itemId:item.id,
        itemName:item.name,
        type:entry?"Entrada":"Saída",
        quantity,
        previousQuantity:current,
        newQuantity,
        destination:String(fd.get("destination")||"").trim(),
        notes:String(fd.get("notes")||"").trim(),
        created:new Date().toISOString()
      };

      const previousInventory=state.inventory;
      const previousMoves=state.inventoryMoves;

      state.inventory=state.inventory.map(i=>
        i.id===id?{...i,quantity:newQuantity}:i
      );

      state.inventoryMoves=[
        ...state.inventoryMoves,
        movement
      ];

      if(!saveState()){
        state.inventory=previousInventory;
        state.inventoryMoves=previousMoves;
        throw Error("Não foi possível salvar a movimentação.");
      }
    }
  );
}
  
function assetsView(){
  const list=[...state.assets].sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pt-BR",{sensitivity:"base"})).filter(a=>([a.name,a.code,a.client,a.sector,a.brand,a.model].join(" ").toLowerCase().includes(query.toLowerCase()))&&(filter==="Todos"||a.status===filter));
  return `<div class="section-head"><div><h2>Equipamentos</h2><div class="sub">Cadastre uma máquina uma vez e reutilize nas próximas visitas</div></div><button class="btn primary" data-action="new-asset">+ Cadastrar equipamento</button></div>
  <div class="list-head"><input id="search" placeholder="Buscar por nome, código ou cliente..." value="${esc(query)}"><select id="filter"><option>Todos</option>${["Em operação","Em manutenção","Parado","Aguardando peças","Desativado"].map(s=>`<option ${filter===s?"selected":""}>${s}</option>`).join("")}</select></div>
  ${list.length?`<div class="cards">${list.map(a=>`<article class="card"><div class="card-top"><div><h3>${esc(a.name)}</h3><div class="sub">${esc(a.code||a.id)} · ${esc(a.client||"Cliente não informado")}</div></div>${pill(a.status)}</div>
  <p>Setor: ${esc(a.sector||"—")}<br>Marca/modelo: ${esc([a.brand,a.model].filter(Boolean).join(" / ")||"—")}<br>Próxima manutenção: ${fmtDate(a.nextMaintenance)}</p>
  <div class="actions"><button class="btn primary" data-action="new-order" data-id="${esc(a.id)}">Nova manutenção</button><button class="btn secondary" data-action="asset-detail" data-id="${esc(a.id)}">Ficha técnica</button><button class="btn secondary" data-action="edit-asset" data-id="${esc(a.id)}">Editar</button><button class="btn secondary" data-action="delete-asset" data-id="${esc(a.id)}">Excluir</button></div></article>`).join("")}</div>`:`<div class="empty">Nenhum equipamento encontrado.</div>`}`;
}
function orderCard(o){
  return `<article class="card"><div class="card-top"><div><h3>${esc(o.id)} · ${esc(o.type||"Manutenção")}</h3><div class="sub">${esc(orderAsset(o))} · ${fmtDate(o.serviceDate||o.created)}</div></div>${pill(o.status||"Concluída")}</div>
  <p><b>Serviço:</b> ${esc(o.service||o.title||"—")}<br><b>Técnico:</b> ${esc(o.technician||"—")}<br><b>Próxima manutenção:</b> ${fmtDate(o.nextMaintenance)}</p>
  <div class="actions"><button class="btn secondary" data-action="view-order" data-id="${esc(o.id)}">Detalhes</button><button class="btn primary" data-action="pdf" data-id="${esc(o.id)}">Gerar PDF / compartilhar</button></div></article>`;
}
function ordersView(){
  const list=[...state.orders].filter(o=>([o.id,o.type,o.service,o.title,orderAsset(o),o.technician].join(" ").toLowerCase().includes(query.toLowerCase()))&&(filter==="Todos"||o.type===filter)).sort((a,b)=>(b.created||"").localeCompare(a.created||""));
  return `<div class="section-head"><div><h2>Histórico de manutenções</h2><div class="sub">Cada visita gera um novo registro e um novo relatório</div></div><button class="btn primary" data-action="new-order">+ Nova manutenção</button></div>
  <div class="list-head"><input id="search" placeholder="Buscar manutenção ou equipamento..." value="${esc(query)}"><select id="filter"><option>Todos</option><option ${filter==="Preventiva"?"selected":""}>Preventiva</option><option ${filter==="Corretiva"?"selected":""}>Corretiva</option></select></div>
  ${list.length?`<div class="cards">${list.map(orderCard).join("")}</div>`:`<div class="empty">Nenhuma manutenção registrada.</div>`}`;
}
function calendarView(){
 const entries=state.assets.filter(a=>a.nextMaintenance).map(a=>({date:a.nextMaintenance,asset:a})).sort((a,b)=>a.date.localeCompare(b.date));
 return `<div class="section-head"><div><h2>Agenda preventiva</h2><div class="sub">Próximas datas registradas nos equipamentos</div></div><button class="btn primary" data-view="assets">Ver equipamentos</button></div>
 ${entries.length?`<div class="agenda-list">${entries.map(({date,asset})=>`<article class="card"><div class="agenda-date">${fmtDate(date)}</div><div class="agenda-row"><div><h3>${esc(asset.name)}</h3><p>${esc(asset.code||asset.id)} · ${esc(asset.sector||"Setor não informado")}</p></div><button class="btn primary" data-action="new-order" data-id="${esc(asset.id)}">Nova OS</button></div></article>`).join("")}</div>`:`<div class="empty">Nenhuma data preventiva cadastrada. Defina a próxima manutenção ao cadastrar ou editar um equipamento.</div>`}`;
}
function reportsView(){
 const completed=state.orders.filter(o=>o.status==="Concluída").length;
 return `<div class="section-head"><div><h2>Relatórios</h2><div class="sub">Documentação das manutenções realizadas</div></div></div>
 <div class="stats"><div class="stat"><div class="label">OS registradas</div><div class="num">${state.orders.length}</div></div><div class="stat"><div class="label">Concluídas</div><div class="num green">${completed}</div></div></div>
 <div class="note">Para gerar ou compartilhar o PDF profissional de uma OS, selecione o relatório abaixo. A assinatura e a marca-d'água permanecem na base original.</div>
 ${state.orders.length?`<div class="cards">${[...state.orders].sort((a,b)=>(b.created||"").localeCompare(a.created||"")).map(orderCard).join("")}</div>`:`<div class="empty">Ainda não há relatórios. Cadastre uma manutenção para gerar o primeiro PDF.</div>`}
 <div class="toolbar"><button class="btn secondary" data-action="backup">Exportar backup dos dados</button></div>`;
}
function settingsView(){
  return `<div class="section-head"><div><h2>Configurações</h2><div class="sub">Personalize os relatórios da LD AUTOMAÇÃO</div></div></div>
  <article class="card"><h3>Assinatura do técnico</h3><p>Salve sua assinatura uma vez. Ela poderá ser incluída automaticamente nos próximos PDFs.</p><div class="actions"><button class="btn primary" data-action="tech-signature">Cadastrar / atualizar assinatura</button></div>${state.settings.technicianSignature?`<p class="mini">Assinatura salva neste aparelho.</p>`:`<p class="mini">Nenhuma assinatura cadastrada.</p>`}</article>
  <article class="card" style="margin-top:10px"><h3>Backup dos dados</h3><p>Exporte seus equipamentos, histórico, fotos e configurações para guardar uma cópia.</p><div class="actions"><button class="btn secondary" data-action="backup">Exportar backup</button><button class="btn secondary" data-action="restore">Importar backup</button></div></article>
  <div class="note">Os registros e as assinaturas ficam salvos localmente neste aparelho. Para não perder os dados, mantenha um backup atualizado.</div>`;
}
function field(label,name,value="",type="text",extra=""){return `<div class="field"><label for="f_${name}">${label}</label><input id="f_${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;}
function selectField(label,name,options,value){return `<div class="field"><label for="f_${name}">${label}</label><select id="f_${name}" name="${name}">${options.map(o=>`<option ${o===value?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`;}
function textarea(label,name,value=""){return `<div class="field"><label for="f_${name}">${label}</label><textarea id="f_${name}" name="${name}">${esc(value)}</textarea></div>`;}
function openModal(title,html,handler){document.querySelector("#modal .modal-actions").innerHTML=`<button class="btn secondary" value="cancel">Cancelar</button><button class="btn primary" id="modalSave" value="default">Salvar</button>`;document.getElementById("modalBody").innerHTML=`<h2>${title}</h2>${html}`;modalHandler=handler;pads={};document.getElementById("modal").showModal();bindModalActions();}
function bindModalActions(){document.querySelectorAll("#modal [data-action]").forEach(b=>b.addEventListener("click",()=>{const action=b.dataset.action,id=b.dataset.id;if(action==="clear-pad")clearPad(b.dataset.pad);if(action==="pdf")generatePdf(state.orders.find(o=>o.id===id));if(action==="view-order")viewOrder(state.orders.find(o=>o.id===id));if(action==="asset-edit")newAsset(assetById(id));if(action==="asset-new-order"){document.getElementById("modal").close();newOrder(id);}}));}
async function scheduleReminder(asset){
  const plugin=window.Capacitor?.Plugins?.LocalNotifications;
  if(!plugin||!asset?.nextMaintenance||asset.status==="Desativado")return;
  const numericId=Math.abs(Array.from(String(asset.id)).reduce((n,ch)=>((n*31)+ch.charCodeAt(0))|0,7))||7;
  try{
    const due=new Date(asset.nextMaintenance+"T09:00:00");
    const remind=new Date(due.getTime()-24*60*60*1000);
    await plugin.cancel({notifications:[{id:numericId}]});
    if(remind.getTime()>Date.now()){
      const permission=await plugin.checkPermissions();
      if(permission.display!=="granted"){const asked=await plugin.requestPermissions();if(asked.display!=="granted")return;}
      await plugin.schedule({notifications:[{id:numericId,title:"Manutenção programada — LD",body:`Amanhã está prevista a manutenção de ${asset.name}.`,schedule:{at:remind},extra:{assetId:asset.id}}]});
    }
  }catch(e){console.warn("Lembrete local não pôde ser agendado.",e);}
}
function newAsset(a){
 const editing=!!a,modal=document.getElementById("modal"),save=document.getElementById("modalSave");
 const steps=[
 `<div class="grid2">${field("Nome do equipamento *","name",a?.name||"")}${field("Código / identificação","code",a?.code||"")}</div>
 <div class="grid2">${field("Cliente / unidade","client",a?.client||"")}${field("Setor / localização","sector",a?.sector||"")}</div>
 <div class="grid2">${field("Fabricante / marca","brand",a?.brand||"")}${field("Modelo","model",a?.model||"")}</div>`,
 `<div class="grid2">${field("Número de série","serialNumber",a?.serialNumber||"")}${field("Data de instalação","installationDate",a?.installationDate||"","date")}</div>
 <div class="grid2">${field("Tensão nominal (ex.: 380 V)","voltage",a?.voltage||"")}${field("Potência nominal (ex.: 7,5 cv)","power",a?.power||"")}</div>
 ${field("Corrente nominal (ex.: 14 A)","current",a?.current||"")}${textarea("Observações técnicas","notes",a?.notes||"")}`,
 `<div class="grid2">${selectField("Periodicidade preventiva","frequency",["Não definida","Mensal","Bimestral","Trimestral","Semestral","Anual","Personalizada"],a?.frequency||"Não definida")}${field("Última manutenção preventiva","lastMaintenance",a?.lastMaintenance||"","date")}</div>
 ${field("Próxima manutenção","nextMaintenance",a?.nextMaintenance||"","date")}
 ${selectField("Situação atual","status",["Em operação","Em manutenção","Parado","Aguardando peças","Desativado"],a?.status||"Em operação")}`
 ];
 const names=["Identificação","Dados técnicos","Plano preventivo"];
 let step=0;const values={};
 openModal(editing?"Editar ficha técnica":"Cadastrar equipamento",`<div id="assetWizard"></div>`,null);
 const form=document.getElementById("modalForm");
 const oldActions=form.querySelector(".modal-actions");
 oldActions.innerHTML=`<button type="button" class="btn secondary" id="wizardCancel">Cancelar</button><button type="button" class="btn secondary" id="wizardBack">Voltar</button><button type="button" class="btn primary" id="wizardNext">Avançar</button><button type="submit" class="btn primary" id="wizardSave">Salvar equipamento</button>`;
 const collect=()=>{new FormData(form).forEach((v,k)=>{values[k]=String(v);});};
 const show=()=>{document.getElementById("assetWizard").innerHTML=`<div class="wizard-progress"><span>Etapa ${step+1} de 3</span><strong>${names[step]}</strong></div><div class="wizard-steps">${names.map((n,i)=>`<span class="${i===step?"current":i<step?"done":""}">${i+1}. ${n}</span>`).join("")}</div>${steps[step]}`;
 document.getElementById("wizardBack").hidden=step===0;document.getElementById("wizardNext").hidden=step===2;document.getElementById("wizardSave").hidden=step!==2;
 document.querySelectorAll("#assetWizard [name]").forEach(el=>{if(Object.prototype.hasOwnProperty.call(values,el.name))el.value=values[el.name];});
 modal.scrollTop=0;};
 const validFirst=()=>{if(step===0&&!String(form.elements.name?.value||"").trim()){alert("Informe o nome do equipamento.");form.elements.name?.focus();return false;}return true;};
 document.getElementById("wizardCancel").onclick=()=>modal.close();
 document.getElementById("wizardBack").onclick=()=>{collect();step=Math.max(0,step-1);show();};
 document.getElementById("wizardNext").onclick=()=>{if(!validFirst())return;collect();step=Math.min(2,step+1);show();};
 modalHandler=()=>{
  collect();const name=String(values.name||"").trim();if(!name)throw Error("Informe o nome do equipamento.");
  const code=String(values.code||"").trim()||a?.code||"EQ-"+String(state.nextAsset||1).padStart(3,"0");
  if(state.assets.some(x=>x.code===code&&x.id!==a?.id))throw Error("Já existe equipamento com esse código.");
  const obj={...(a||{}),id:a?.id||("asset-"+Date.now()+"-"+Math.random().toString(16).slice(2)),code,name,
  client:values.client||"",sector:values.sector||"",brand:values.brand||"",model:values.model||"",serialNumber:values.serialNumber||"",installationDate:values.installationDate||"",voltage:values.voltage||"",power:values.power||"",current:values.current||"",notes:values.notes||"",frequency:values.frequency||"Não definida",lastMaintenance:values.lastMaintenance||"",nextMaintenance:values.nextMaintenance||"",status:values.status||"Em operação",created:a?.created||new Date().toISOString()};
  const previous=state.assets,previousNext=state.nextAsset;
  if(editing)state.assets=state.assets.map(x=>x.id===a.id?obj:x);else{state.assets.push(obj);if(!values.code?.trim())state.nextAsset=Number(state.nextAsset||1)+1;}
  if(!saveState()){state.assets=previous;state.nextAsset=previousNext;throw Error("Não foi possível salvar o equipamento.");}
  scheduleReminder(obj);
 };
 const reset=()=>{oldActions.innerHTML=`<button class="btn secondary" value="cancel">Cancelar</button><button class="btn primary" id="modalSave" value="default">Salvar</button>`;};
 modal.addEventListener("close",reset,{once:true});show();
}
 function deleteAsset(id){
  const asset=state.assets.find(a=>a.id===id);

  if(!asset){
    alert("Equipamento não encontrado.");
    return;
  }

  const linkedOrders=state.orders.filter(o=>o.assetId===id);

  if(linkedOrders.length>0){
    alert(
      "Não é possível excluir este equipamento.\n\n" +
      "Existem " + linkedOrders.length +
      " ordem(ns) de serviço vinculada(s).\n\n" +
      "Para preservar o histórico, edite o equipamento e altere sua situação para Desativado."
    );
    return;
  }

  const confirmed=confirm(
    'Deseja realmente excluir o equipamento "' + asset.name + '"?\n\n' +
    "Esta operação não poderá ser desfeita sem restaurar um backup."
  );

  if(!confirmed)return;

  const previous=state.assets;
  state.assets=state.assets.filter(a=>a.id!==id);

  if(!saveState()){
    state.assets=previous;
    alert("Não foi possível salvar a exclusão. O equipamento foi preservado.");
    return;
  }

  alert("Equipamento excluído com sucesso.");
  render();
} 
function photoFields(which,label){
  return `<div class="photo-box"><b>${label}</b><div class="field"><label>Escolher da galeria</label><input type="file" name="${which}Gallery" accept="image/*"></div><div class="field"><label>Tirar foto agora</label><input type="file" name="${which}Camera" accept="image/*" capture="environment"></div><img id="preview_${which}" class="preview hidden" alt="Prévia da foto"></div>`;
}
function newOrder(assetId=""){
  if(!state.assets.length){alert("Cadastre um equipamento antes de registrar uma manutenção.");view="assets";render();return;}
  const asset=assetById(assetId)||state.assets[0];
  const today=new Date().toISOString().slice(0,10);
  openModal("Nova manutenção",`${selectField("Equipamento *","assetId",state.assets.map(a=>a.id+"|"+a.code+" — "+a.name),asset.id+"|"+asset.code+" — "+asset.name)}
  <div class="grid2">${selectField("Tipo de manutenção","type",["Corretiva","Preventiva"],"Corretiva")}${selectField("Situação após o serviço","assetStatus",["Em operação","Em manutenção","Parado","Aguardando peças","Desativado"],asset.status)}</div>
  <div class="grid2">${field("Data do serviço *","serviceDate",today,"date")}${field("Técnico responsável","technician",state.settings.technician||"Léo")}</div>
  ${field("Defeito / motivo da visita","defect","")}${textarea("Diagnóstico","diagnosis","")}${textarea("Serviço executado *","service","")}${textarea("Peças substituídas","parts","")}
  <div class="photo-grid">${photoFields("before","Foto ANTES")}${photoFields("after","Foto DEPOIS")}</div>
  ${textarea("Recomendações","recommendation","")}${field("Próxima manutenção","nextMaintenance",asset.nextMaintenance||"","date")}
  <div class="field"><label>Assinatura do responsável pelo cliente (opcional)</label><canvas id="clientPad" class="signature-pad" width="600" height="180"></canvas><div class="pad-actions"><button type="button" class="btn secondary" data-action="clear-pad" data-pad="clientPad">Limpar assinatura</button></div><div class="mini">Assine com o dedo dentro do quadro branco.</div></div>`,
  async fd=>{
    const service=fd.get("service").trim();if(!service)throw Error("Descreva o serviço executado.");
    const selected=String(fd.get("assetId")).split("|")[0],a=assetById(selected);if(!a)throw Error("Selecione um equipamento válido.");
    const before=await readPhoto(fd.get("beforeGallery"),fd.get("beforeCamera"));
    const after=await readPhoto(fd.get("afterGallery"),fd.get("afterCamera"));
    const clientPad=document.getElementById("clientPad");
    const clientSignature=pads.clientPad?.drawn&&clientPad?clientPad.toDataURL("image/png"):"";
    const o={id:nextId("OS","nextOrder"),assetId:a.id,type:fd.get("type"),serviceDate:fd.get("serviceDate"),technician:fd.get("technician"),defect:fd.get("defect"),diagnosis:fd.get("diagnosis"),service,parts:fd.get("parts"),recommendation:fd.get("recommendation"),nextMaintenance:fd.get("nextMaintenance"),photoBefore:before,photoAfter:after,clientSignature,technicianSignature:state.settings.technicianSignature||"",status:"Concluída",created:new Date().toISOString()};
    state.orders.push(o);a.status=fd.get("assetStatus");a.nextMaintenance=o.nextMaintenance||a.nextMaintenance;
    if(saveState()){document.getElementById("modal").close();modalHandler=null;render();scheduleReminder(a);setTimeout(()=>{if(confirm("Manutenção salva. Deseja gerar o PDF e compartilhar agora?"))generatePdf(o);},100);}
  });
  initSignaturePad("clientPad");
  bindPhotoPreviews();
}
function initSignaturePad(id){
  const c=document.getElementById(id);if(!c)return;
  const ctx=c.getContext("2d");ctx.lineWidth=3;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#111";
  pads[id]={drawn:false,drawing:false};
  const point=e=>{const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};};
  c.addEventListener("pointerdown",e=>{e.preventDefault();c.setPointerCapture(e.pointerId);const p=point(e);pads[id].drawing=true;pads[id].drawn=true;ctx.beginPath();ctx.moveTo(p.x,p.y);});
  c.addEventListener("pointermove",e=>{if(!pads[id]?.drawing)return;e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
  const end=()=>{if(pads[id])pads[id].drawing=false;};c.addEventListener("pointerup",end);c.addEventListener("pointercancel",end);
}
function clearPad(id){const c=document.getElementById(id);if(c){c.getContext("2d").clearRect(0,0,c.width,c.height);if(pads[id])pads[id].drawn=false;}}
function bindPhotoPreviews(){
  ["before","after"].forEach(which=>["Gallery","Camera"].forEach(suffix=>{const input=document.querySelector(`[name="${which}${suffix}"]`);if(input)input.addEventListener("change",()=>{const f=input.files?.[0];if(!f)return;const img=document.getElementById("preview_"+which);img.src=URL.createObjectURL(f);img.classList.remove("hidden");});}));
}
function readPhoto(gallery,camera){
  const file=(gallery&&gallery.size?gallery:null)||(camera&&camera.size?camera:null);
  if(!file)return Promise.resolve("");
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("Não foi possível ler uma das fotos."));reader.onload=()=>{const img=new Image();img.onload=()=>{const max=1100,scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",0.68));};img.onerror=()=>reject(new Error("Arquivo de imagem inválido."));img.src=reader.result;};reader.readAsDataURL(file);});
}
function assetHistory(a){
  const list=state.orders.filter(o=>o.assetId===a.id).sort((x,y)=>(y.serviceDate||y.created||"").localeCompare(x.serviceDate||x.created||""));
  openModal("Histórico do equipamento",`<h3>${esc(a.name)} · ${esc(a.code)}</h3><p>${esc(a.client||"Cliente não informado")} · ${esc(a.sector||"Setor não informado")}</p><p>Situação atual: ${esc(a.status)}</p><hr>
  ${list.length?list.map(o=>`<div class="history-item"><b>${fmtDate(o.serviceDate||o.created)} · ${esc(o.type)}</b><p>${esc(o.service||"—")}</p><p class="mini">Técnico: ${esc(o.technician||"—")} · OS ${esc(o.id)}</p><div class="actions"><button type="button" class="btn secondary" data-action="pdf" data-id="${esc(o.id)}">PDF</button><button type="button" class="btn secondary" data-action="view-order" data-id="${esc(o.id)}">Detalhes</button></div></div>`).join(""):`<div class="empty">Ainda não há manutenções para este equipamento.</div>`}`,()=>{});
}
function viewOrder(o){
  const a=assetById(o.assetId);
  openModal("Detalhes da manutenção",`<div class="note"><b>${esc(o.id)} · ${esc(o.type)}</b><br>${esc(a?.name||"Equipamento")} · ${fmtDate(o.serviceDate)}</div>
  <p><b>Defeito / motivo:</b> ${esc(o.defect||"—")}</p><p><b>Diagnóstico:</b><br>${esc(o.diagnosis||"—")}</p><p><b>Serviço executado:</b><br>${esc(o.service||"—")}</p><p><b>Peças substituídas:</b><br>${esc(o.parts||"—")}</p><p><b>Recomendações:</b><br>${esc(o.recommendation||"—")}</p><p><b>Próxima manutenção:</b> ${fmtDate(o.nextMaintenance)}</p>
  <div class="photo-grid">${o.photoBefore?`<div><b>ANTES</b><img class="preview" src="${o.photoBefore}"></div>`:""}${o.photoAfter?`<div><b>DEPOIS</b><img class="preview" src="${o.photoAfter}"></div>`:""}</div>
  <div class="actions"><button type="button" class="btn primary" data-action="pdf" data-id="${esc(o.id)}">Gerar PDF / compartilhar</button></div>`,()=>{});
}
function techSignature(){
  openModal("Assinatura do técnico",`<p>Faça sua assinatura uma vez. Ela será incluída nos próximos relatórios.</p><div class="field"><canvas id="techPad" class="signature-pad" width="600" height="180"></canvas><div class="pad-actions"><button type="button" class="btn secondary" data-action="clear-pad" data-pad="techPad">Limpar</button></div></div>`,()=>{
    const c=document.getElementById("techPad");if(!c||!pads.techPad?.drawn)throw Error("Faça a assinatura no quadro antes de salvar.");
    state.settings.technicianSignature=c.toDataURL("image/png");saveState();render();
  });
  initSignaturePad("techPad");
  const c=document.getElementById("techPad");if(c&&state.settings.technicianSignature){const img=new Image();img.onload=()=>c.getContext("2d").drawImage(img,0,0,c.width,c.height);img.src=state.settings.technicianSignature;pads.techPad.drawn=true;}
}
function addText(doc,text,x,y,width=175,size=10){
  doc.setFontSize(size);const lines=doc.splitTextToSize(String(text||"—"),width);const h=lines.length*(size*0.48)+2;
  if(y+h>278){doc.addPage();y=18;}
  doc.text(lines,x,y);return y+h;
}
async function generatePdf(o){
  try{
    if(!window.jspdf?.jsPDF){alert("O gerador de PDF não carregou. Verifique a versão do aplicativo.");return;}
    const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"}),a=assetById(o.assetId);
    const GREEN=[28,126,78],DARK=[20,43,37],PALE=[232,246,237],INK=[38,51,46],MUTED=[100,115,107],WHITE=[255,255,255];
    const pageW=210,left=14,right=196,width=182;let y=0,watermarkData='';
    try{const response=await fetch('assets/ld-logo-watermark.png');if(response.ok){const blob=await response.blob();watermarkData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}}catch(e){console.warn('Logo da marca-d’água não carregada.',e);}
    function watermark(){if(!watermarkData)return;try{doc.addImage(watermarkData,'PNG',57,91,96,96,undefined,'FAST');}catch(e){console.warn('Não foi possível aplicar a marca-d’água.',e);}}
    function header(){
      doc.setFillColor(...DARK);doc.rect(0,0,pageW,34,"F");
      doc.setFillColor(...GREEN);doc.rect(0,34,pageW,2.5,"F");
      doc.setTextColor(...WHITE);doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("LD AUTOMAÇÃO",left,12);
      doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text("Transformando Energia em Resultados",left,19);
      doc.setFont("helvetica","bold");doc.setFontSize(13);doc.text("RELATÓRIO DE CONCLUSÃO DE SERVIÇO",left,28);
    }
    function footer(){
      const total=doc.getNumberOfPages();
      for(let i=1;i<=total;i++){doc.setPage(i);doc.setDrawColor(...GREEN);doc.setLineWidth(.5);doc.line(left,284,right,284);doc.setTextColor(...MUTED);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text("LD AUTOMAÇÃO  ·  Transformando Energia em Resultados",left,290);doc.text(`Página ${i} de ${total}`,right,290,{align:"right"});}
    }
    function newPage(){doc.addPage();header();watermark();y=44;}
    function section(title,content){
      if(y>263)newPage();
      doc.setFillColor(...GREEN);doc.roundedRect(left,y,width,8,1.5,1.5,"F");
      doc.setTextColor(...WHITE);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(title.toUpperCase(),left+4,y+5.3);y+=12;
      const value=String(content||"—");doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(...INK);
      const lines=doc.splitTextToSize(value,width-8),h=Math.max(10,lines.length*4.8+5);
      if(y+h>278){newPage();}
      doc.setFillColor(...PALE);doc.roundedRect(left,y,width,h,1.5,1.5,"F");
      doc.text(lines,left+4,y+6);y+=h+5;
    }
    function labelValue(label,value,x,yy,w){
      doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...MUTED);doc.text(label.toUpperCase(),x,yy);
      doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(...INK);
      const lines=doc.splitTextToSize(String(value||"—"),w);doc.text(lines,x,yy+5);return Math.max(12,lines.length*4.5+7);
    }
    header();watermark();y=43;
    doc.setFillColor(...PALE);doc.roundedRect(left,y,width,39,2,2,"F");
    const col1=left+5,col2=left+96;
    const h1=labelValue("Equipamento",a?.name,col1,y+7,83);
    labelValue("Código / identificação",a?.code||a?.id,col2,y+7,80);
    labelValue("Cliente / unidade",a?.client,col1,y+21,83);
    labelValue("Setor / localização",a?.sector,col2,y+21,80);
    y+=45;
    doc.setFillColor(247,250,248);doc.roundedRect(left,y,width,18,2,2,"F");
    labelValue("Data do serviço",fmtDate(o.serviceDate),left+5,y+6,45);
    labelValue("Tipo de manutenção",o.type,left+57,y+6,50);
    labelValue("Técnico responsável",o.technician,left+119,y+6,58);y+=24;
    section("Defeito / motivo",o.defect);
    section("Diagnóstico",o.diagnosis);
    section("Serviço executado",o.service);
    section("Peças substituídas",o.parts);
    section("Recomendações",o.recommendation);
    section("Próxima manutenção",fmtDate(o.nextMaintenance));
    if(o.photoBefore||o.photoAfter){
      newPage();
      doc.setFillColor(...GREEN);doc.roundedRect(left,y,width,9,1.5,1.5,"F");doc.setTextColor(...WHITE);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("REGISTRO FOTOGRÁFICO",left+4,y+6);y+=16;
      const photoW=83,photoH=100,gap=12;
      for(const [label,data,x] of [["ANTES",o.photoBefore,left],["DEPOIS",o.photoAfter,left+photoW+gap]]){
        if(!data)continue;
        doc.setFillColor(...PALE);doc.roundedRect(x,y,photoW,photoH,2,2,"F");doc.setTextColor(...GREEN);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(label,x+4,y+8);
        try{const fmt=data.startsWith("data:image/png")?"PNG":"JPEG";doc.addImage(data,fmt,x+4,y+14,photoW-8,photoH-20,undefined,"FAST");}catch(e){doc.setTextColor(...INK);doc.setFontSize(8);doc.text("Imagem indisponível",x+4,y+25);}
      }
      y+=photoH+10;
    }
    const tech=o.technicianSignature||state.settings.technicianSignature,client=o.clientSignature;
    if(tech||client){if(y>245)newPage();else y+=4;
      doc.setFillColor(...GREEN);doc.roundedRect(left,y,width,9,1.5,1.5,"F");doc.setTextColor(...WHITE);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("ASSINATURAS",left+4,y+6);y+=14;
      const sigW=80,sigH=29;
      if(tech){doc.setFillColor(...PALE);doc.roundedRect(left,y,sigW,sigH,2,2,"F");try{doc.addImage(tech,"PNG",left+4,y+1,sigW-8,18);}catch(e){}doc.setDrawColor(...GREEN);doc.line(left+5,y+20,left+sigW-5,y+20);doc.setTextColor(...INK);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text("Técnico responsável",left+sigW/2,y+26,{align:"center"});}
      if(client){const x=left+sigW+10;doc.setFillColor(...PALE);doc.roundedRect(x,y,sigW,sigH,2,2,"F");try{doc.addImage(client,"PNG",x+4,y+1,sigW-8,18);}catch(e){}doc.setDrawColor(...GREEN);doc.line(x+5,y+20,x+sigW-5,y+20);doc.setTextColor(...INK);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text("Responsável pelo cliente",x+sigW/2,y+26,{align:"center"});}
    }
    footer();
    const filename=`Relatorio-${(o.id||"OS").replace(/[^a-zA-Z0-9-]/g,"")}.pdf`;
    const dataUri=doc.output("datauristring"),base64=dataUri.split(",")[1];
    const cap=window.Capacitor,plugins=cap?.Plugins||{};
    if(plugins.Filesystem&&plugins.Share){
      const saved=await plugins.Filesystem.writeFile({path:filename,data:base64,directory:"CACHE",recursive:true});
      await plugins.Share.share({title:"Relatório de manutenção LD",text:`Relatório ${o.id} - ${a?.name||"equipamento"}`,url:saved.uri,dialogTitle:"Compartilhar relatório PDF"});
    }else{
      const blob=doc.output("blob"),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
      if(navigator.share&&navigator.canShare){try{const file=new File([blob],filename,{type:"application/pdf"});if(navigator.canShare({files:[file]}))await navigator.share({files:[file],title:"Relatório de manutenção LD"});}catch(e){}}
    }
  }catch(e){console.error(e);alert("Não foi possível gerar/compartilhar o PDF. Confira se a versão instalada foi compilada com os plugins atualizados.");}
}

async function exportBackup(){
  const nome = "backup-manutencao-industrial-ld.json";
  const conteudo = JSON.stringify({
    app: "Manutenção Industrial LD",
    version: 3,
    exportedAt: new Date().toISOString(),
    state
  }, null, 2);

  try {
    const capacitor = window.Capacitor;
    const filesystem = capacitor?.Plugins?.Filesystem;
    const share = capacitor?.Plugins?.Share;

    if (capacitor?.isNativePlatform?.() && filesystem && share) {
      const arquivo = await filesystem.writeFile({
        path: nome,
        data: conteudo,
        directory: "CACHE",
        encoding: "utf8"
      });

      await share.share({
        title: "Backup Manutenção Industrial LD",
        text: "Arquivo de backup do aplicativo.",
        url: arquivo.uri,
        dialogTitle: "Salvar ou compartilhar backup"
      });

      return;
    }

    // Alternativa para uso pelo navegador.
    const blob = new Blob([conteudo], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

  } catch (erro) {
    console.error("Falha ao exportar backup:", erro);
    alert("Não foi possível exportar o backup. Tente novamente.");
  }
}
function importBackup(){
  const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=()=>{const f=input.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result),s=d.state||d;if(!Array.isArray(s.assets)||!Array.isArray(s.orders))throw Error();if(confirm("Importar backup e substituir os dados atuais deste aparelho?")){state={...structuredClone(DEFAULT),...s,settings:{...DEFAULT.settings,...(s.settings||{})}};saveState();render();alert("Backup importado com sucesso.");}}catch(e){alert("Arquivo de backup inválido.");}};r.readAsText(f);};input.click();
}
function bind(){
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{view=b.dataset.view;query="";filter="Todos";render();}));
  document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>{
    const action=b.dataset.action,id=b.dataset.id;
if(action==="asset-detail")assetDetail(assetById(id));
if(action==="new-asset")newAsset();
if(action==="new-inventory-item")newInventoryItem();
if(action==="inventory-entry")inventoryMovement(id,"entry");
if(action==="inventory-exit")inventoryMovement(id,"exit");    
if(action==="edit-asset")newAsset(assetById(id));
if(action==="delete-asset")deleteAsset(id);
if(action==="new-order")newOrder(id||"");
if(action==="asset-history")assetHistory(assetById(id));
    if(action==="view-order")viewOrder(state.orders.find(o=>o.id===id));if(action==="pdf")generatePdf(state.orders.find(o=>o.id===id));
    if(action==="tech-signature")techSignature();if(action==="backup")exportBackup();if(action==="restore")importBackup();
    if(action==="clear-pad")clearPad(b.dataset.pad);
  }));
  const s=document.getElementById("search"),f=document.getElementById("filter");
  if(s)s.addEventListener("input",()=>{query=s.value;const pos=s.selectionStart;render();const ns=document.getElementById("search");if(ns){ns.focus();ns.setSelectionRange(pos,pos);}});
  if(f)f.addEventListener("change",()=>{filter=f.value;render();});
}
document.getElementById("modalForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!modalHandler)return;
  try{const handler=modalHandler;await handler(new FormData(e.currentTarget));if(document.getElementById("modal").open){document.getElementById("modal").close();modalHandler=null;render();}}
  catch(err){console.error(err);alert(err.message||"Não foi possível salvar os dados.");}
});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{view=b.dataset.view;query="";filter="Todos";render();}));
render();
})();
