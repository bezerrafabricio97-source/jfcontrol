// T11 SPORTS v6 — Layout completo, sem bug de tela branca, fullscreen
import { useState, useEffect, useMemo } from "react";

const AUTH = { usuario: "fabricio", senha: "fabricio123" };
const DB_KEY = "jfcontrol_db";
const DB_KEY_LEGACY_CANDIDATES = ["jfcontrol_db","t11sports_v6","t11_db","jfcontrol"];
const TAMANHOS = ["P","M","G","GG","XGG"];
const TIMES = ["Bahia","Vitória","Flamengo","Corinthians","São Paulo","Palmeiras","Vasco","Outro"];
const UNIFORMES = ["Uniforme 1","Uniforme 2","Goleiro","Treino"];
const ST_PEDIDO = ["A Fazer","Pedido Feito","Em Transporte","Entregue","Cancelado"];
const ST_FORN = ["Lista de Espera","Pedido Feito","Chegou - Estoque","Chegou - Vendido"];
const CATS_DESP = ["Produto / Estoque","Taxa / Importação","Ferramenta / Software","Frete","Outros"];
const CATS_REC = ["Venda","Aporte de Sócio","Outros"];
const CATS_TAR = ["Pedido","Estoque","Financeiro","Cliente","Outro"];
const KANBAN = [
  {key:"A Fazer",label:"PRODUZIR",icon:"📦",color:"#f97316"},
  {key:"Pedido Feito",label:"ENTREGAR",icon:"✈️",color:"#2563eb"},
  {key:"Entregue",label:"ENVIADO",icon:"✅",color:"#16a34a"},
];
const ST_STYLE = {
  "A Fazer":         {bg:"#fff7ed",fg:"#ea580c",bd:"#fed7aa"},
  "Pedido Feito":    {bg:"#eff6ff",fg:"#2563eb",bd:"#bfdbfe"},
  "Em Transporte":   {bg:"#faf5ff",fg:"#7c3aed",bd:"#e9d5ff"},
  "Entregue":        {bg:"#f0fdf4",fg:"#16a34a",bd:"#bbf7d0"},
  "Cancelado":       {bg:"#fef2f2",fg:"#dc2626",bd:"#fecaca"},
  "Lista de Espera": {bg:"#f9fafb",fg:"#6b7280",bd:"#e5e7eb"},
  "Chegou - Estoque":{bg:"#f0fdf4",fg:"#16a34a",bd:"#bbf7d0"},
  "Chegou - Vendido":{bg:"#eff6ff",fg:"#2563eb",bd:"#bfdbfe"},
};

const r=(n)=>Number((n||0).toFixed(2));
const brl=(n)=>(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const pct=(n)=>`${(n||0).toFixed(1)}%`;
const hoje=()=>new Date().toISOString().slice(0,10);
const mesAtual=()=>new Date().toISOString().slice(0,7);
const mesPrev=()=>{const d=new Date();d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7);};
const semIni=()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());return d.toISOString().slice(0,10);};
const semFim=()=>{const d=new Date();d.setDate(d.getDate()+(6-d.getDay()));return d.toISOString().slice(0,10);};

function estoqueInicial(){
  const items=[];let id=1;
  ["Bahia","Vitória"].forEach(time=>{
    ["Uniforme 1","Uniforme 2"].forEach(uni=>{
      ["M","G","GG"].forEach(tam=>{
        const cor=time==="Bahia"?(uni==="Uniforme 1"?"Azul/Vermelho":"Branco"):(uni==="Uniforme 1"?"Vermelho/Preto":"Branco/Preto");
        items.push({id:id++,time,uniforme:uni,tamanho:tam,cor,qtd:2,qtdMin:1,custoProduto:45,custoTaxa:5,precoVenda:120,fornecedor:"Fornecedor Padrão"});
      });
    });
  });
  return items;
}

const DB0={produtos:[],pedidos:[],caixa:[],tarefas:[],pedidosFornecedor:[],
  meta:{pedidos:30,receita:3600,lucro:1500,posts:0,futebol:0},nextId:100};

// Mapeia status antigos para os status atuais do app, sem perder nenhum pedido
const STATUS_MIGRACAO={
  "Produzir":"A Fazer","produzir":"A Fazer",
  "Entregar":"Pedido Feito","entregar":"Pedido Feito",
  "Enviado":"Entregue","enviado":"Entregue",
  "Atrasado":"Cancelado","atrasado":"Cancelado",
};
function migrarDB(db){
  const out={...DB0,...db};
  out.produtos=(out.produtos||[]).map(p=>({qtdMin:1,...p}));
  out.pedidos=(out.pedidos||[]).map(p=>({
    ...p,
    status: ST_PEDIDO.includes(p.status) ? p.status : (STATUS_MIGRACAO[p.status]||"A Fazer"),
  }));
  out.caixa=out.caixa||[];
  out.tarefas=out.tarefas||[];
  out.pedidosFornecedor=out.pedidosFornecedor||[];
  out.meta={...DB0.meta,...(out.meta||{})};
  out.nextId=out.nextId||100;
  return out;
}

function loadDB(){
  try{
    const r=localStorage.getItem(DB_KEY);
    if(r)return migrarDB(JSON.parse(r));
  }catch(_){}
  // Fallback: procura em chaves antigas conhecidas, caso a principal esteja vazia
  for(const k of DB_KEY_LEGACY_CANDIDATES){
    try{
      const r=localStorage.getItem(k);
      if(r)return migrarDB(JSON.parse(r));
    }catch(_){}
  }
  const db=JSON.parse(JSON.stringify(DB0));db.produtos=estoqueInicial();return db;
}
function saveDB(db){try{localStorage.setItem(DB_KEY,JSON.stringify(db));}catch(_){}}

// ── ESTILOS BASE ─────────────────────────────────────────────
const INP={width:"100%",padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13,
  color:"#111",background:"#fff",boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
const LBL={fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",
  letterSpacing:"0.5px",display:"block",marginBottom:5};
const TH={textAlign:"left",padding:"9px 14px",fontSize:11,color:"#6b7280",fontWeight:700,
  textTransform:"uppercase",letterSpacing:"0.5px",borderBottom:"1px solid #e5e7eb",
  whiteSpace:"nowrap",background:"#fafafa"};
const TD={padding:"11px 14px",borderBottom:"1px solid #f5f5f5",fontSize:13,
  color:"#374151",verticalAlign:"middle"};

function Inp(p){return <input style={INP} {...p}/>;}
function Sel({children,...p}){return <select style={INP} {...p}>{children}</select>;}

function Btn({children,v="primary",onClick,disabled,style:sx}){
  const [h,setH]=useState(false);
  const V={
    primary:{background:"#111",color:"#fff",border:"none"},
    sec:{background:"#fff",color:"#374151",border:"1px solid #d1d5db"},
    sm:{background:"#f9fafb",color:"#374151",border:"1px solid #e5e7eb",padding:"5px 10px",fontSize:12},
    danger:{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",padding:"5px 10px",fontSize:12},
  };
  return(
    <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{padding:"9px 18px",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontWeight:700,
        fontSize:13,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,
        transition:"all 0.15s",transform:h&&!disabled?"translateY(-1px)":"none",
        boxShadow:h&&!disabled?"0 4px 12px rgba(0,0,0,0.12)":"none",
        opacity:disabled?0.6:1,...V[v],...sx}}>
      {children}
    </button>
  );
}

function Badge({status}){
  const c=ST_STYLE[status]||{bg:"#f3f4f6",fg:"#374151",bd:"#d1d5db"};
  return<span style={{background:c.bg,color:c.fg,border:`1px solid ${c.bd}`,
    padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{status}</span>;
}

function MargBadge({marg}){
  const bg=marg>=30?"#f0fdf4":marg>=15?"#fefce8":"#fef2f2";
  const fg=marg>=30?"#16a34a":marg>=15?"#ca8a04":"#dc2626";
  return<span style={{background:bg,color:fg,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700}}>{pct(marg)}</span>;
}

function StockBadge({qtd,qtdMin}){
  if(qtd===0)return<span style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>Sem estoque</span>;
  if(qtd<=qtdMin)return<span style={{background:"#fefce8",color:"#ca8a04",border:"1px solid #fde68a",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>Baixo</span>;
  return<span style={{background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>OK</span>;
}

function HRow({children,onClick}){
  const [h,setH]=useState(false);
  return<tr onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={onClick}
    style={{background:h?"#f9fafb":"#fff",transition:"background 0.12s",cursor:onClick?"pointer":"default"}}>{children}</tr>;
}

function HCard({children,style:sx,color,onClick}){
  const [h,setH]=useState(false);
  return(
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={onClick}
      style={{background:"#fff",border:"1px solid #e5e7eb",
        borderLeft:color?`4px solid ${color}`:"1px solid #e5e7eb",borderRadius:10,
        padding:"16px 18px",transition:"all 0.18s",transform:h?"translateY(-2px)":"none",
        boxShadow:h?"0 8px 24px rgba(0,0,0,0.1)":"0 1px 3px rgba(0,0,0,0.04)",
        cursor:onClick?"pointer":"default",...sx}}>
      {children}
    </div>
  );
}

function KPI({label,value,sub,color,dark}){
  const [h,setH]=useState(false);
  return(
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:dark?"#111":"#fff",border:dark?"none":"1px solid #e5e7eb",borderRadius:10,
        padding:"16px 18px",transition:"all 0.18s",transform:h?"translateY(-2px)":"none",
        boxShadow:h?"0 8px 24px rgba(0,0,0,0.12)":dark?"0 2px 8px rgba(0,0,0,0.3)":"0 1px 3px rgba(0,0,0,0.04)",
        cursor:"default"}}>
      <div style={{fontSize:11,color:dark?"rgba(255,255,255,0.45)":"#9ca3af",fontWeight:700,
        textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:dark?"#fff":(color||"#111"),letterSpacing:"-0.5px"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:dark?"rgba(255,255,255,0.3)":"#9ca3af",marginTop:4}}>{sub}</div>}
    </div>
  );
}

function Prog({value,max,color="#111"}){
  const p=max>0?Math.min(100,Math.max(0,(value/max)*100)):0;
  return(
    <div style={{height:6,background:"#f3f4f6",borderRadius:3,overflow:"hidden",margin:"6px 0 2px"}}>
      <div style={{width:`${p}%`,height:"100%",background:color,borderRadius:3,transition:"width 0.5s"}}/>
    </div>
  );
}

function Tabs({options,value,onChange}){
  return(
    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
      {options.map(({k,l})=>(
        <button key={k} onClick={()=>onChange(k)}
          style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${value===k?"#111":"#d1d5db"}`,
            background:value===k?"#111":"#fff",color:value===k?"#fff":"#374151",
            cursor:"pointer",fontSize:12,fontWeight:value===k?700:400,fontFamily:"inherit",transition:"all 0.15s"}}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Modal({title,onClose,children,wide}){
  useEffect(()=>{const h=e=>e.key==="Escape"&&onClose();window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:28,
        width:wide?680:520,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 25px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h2 style={{fontSize:17,fontWeight:800,color:"#111",margin:0}}>{title}</h2>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:24,color:"#9ca3af"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({label,children,half,third}){
  const flex=third?"0 0 calc(33.3% - 8px)":half?"0 0 calc(50% - 6px)":"1 1 100%";
  return<div style={{flex,minWidth:0,marginBottom:14}}><label style={LBL}>{label}</label>{children}</div>;
}

function MBtns({onClose,onSave,label="Salvar"}){
  return(
    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12,paddingTop:16,borderTop:"1px solid #f3f4f6"}}>
      <Btn v="sec" onClick={onClose}>Cancelar</Btn>
      <Btn onClick={onSave}>{label}</Btn>
    </div>
  );
}

function InfoBox({items}){
  return(
    <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,
      padding:"12px 16px",marginBottom:14,display:"flex",gap:20,flexWrap:"wrap"}}>
      {items.map(({label,value,color})=>(
        <div key={label}>
          <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
          <div style={{fontSize:16,fontWeight:800,color:color||"#111",marginTop:2}}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function Section({title,action,children}){
  return(
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:20,marginBottom:16}}>
      {(title||action)&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          {title&&<div style={{fontWeight:800,fontSize:15,color:"#111"}}>{title}</div>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Empty({msg,icon="📭"}){
  return<div style={{textAlign:"center",padding:"40px 20px",color:"#9ca3af"}}>
    <div style={{fontSize:32,marginBottom:10}}>{icon}</div>
    <div style={{fontSize:13}}>{msg}</div>
  </div>;
}

function Alert({type,children}){
  const s={warning:{bg:"#fffbeb",bd:"#f59e0b",fg:"#92400e"},
    error:{bg:"#fef2f2",bd:"#dc2626",fg:"#7f1d1d"},
    success:{bg:"#f0fdf4",bd:"#16a34a",fg:"#14532d"}}[type]||{bg:"#eff6ff",bd:"#2563eb",fg:"#1e3a5f"};
  return<div style={{background:s.bg,border:`1px solid ${s.bd}`,borderLeft:`4px solid ${s.bd}`,
    borderRadius:10,padding:"10px 16px",marginBottom:16,fontSize:13,color:s.fg,
    display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>{children}</div>;
}

// ── FORMULÁRIOS ──────────────────────────────────────────────
function FormPedido({inicial,produtos,onSave,onClose}){
  const vz={data:hoje(),cliente:"",time:"",uniforme:"Uniforme 1",tamanho:"M",qtd:1,
    precoVenda:0,valorRecebido:0,custoProduto:0,custoTaxa:0,status:"A Fazer",obs:""};
  const [f,setF]=useState(inicial?{...vz,...inicial}:vz);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));const n=(k,v)=>s(k,parseFloat(v)||0);
  const fill=t=>{const pd=produtos.find(x=>x.time===t);
    if(pd)setF(x=>({...x,time:t,custoProduto:pd.custoProduto,custoTaxa:pd.custoTaxa,precoVenda:pd.precoVenda,tamanho:pd.tamanho}));
    else s("time",t);};
  const v=r((f.precoVenda||0)*(f.qtd||1));const c=r(((f.custoProduto||0)+(f.custoTaxa||0))*(f.qtd||1));
  const l=r(v-c);const sb=r(v-(f.valorRecebido||0));const mg=v>0?r((l/v)*100):0;
  const times=[...new Set([...produtos.map(p=>p.time||p.nome).filter(Boolean),...TIMES])];
  return(<>
    <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
      <Field label="Data" half><Inp type="date" value={f.data} onChange={e=>s("data",e.target.value)}/></Field>
      <Field label="Status" half><Sel value={f.status} onChange={e=>s("status",e.target.value)}>{ST_PEDIDO.map(st=><option key={st}>{st}</option>)}</Sel></Field>
      <Field label="Nome do Cliente"><Inp value={f.cliente} onChange={e=>s("cliente",e.target.value)} placeholder="Nome completo" autoFocus/></Field>
      <Field label="Time / Camisa" half>
        <Inp list="lst-tp" value={f.time} onChange={e=>fill(e.target.value)} placeholder="ex: Bahia"/>
        <datalist id="lst-tp">{times.map(t=><option key={t} value={t}/>)}</datalist>
      </Field>
      <Field label="Uniforme" half><Sel value={f.uniforme} onChange={e=>s("uniforme",e.target.value)}>{UNIFORMES.map(u=><option key={u}>{u}</option>)}</Sel></Field>
      <Field label="Tamanho" third><Sel value={f.tamanho} onChange={e=>s("tamanho",e.target.value)}>{TAMANHOS.map(t=><option key={t}>{t}</option>)}</Sel></Field>
      <Field label="Quantidade" third><Inp type="number" min="1" value={f.qtd} onChange={e=>n("qtd",e.target.value)}/></Field>
      <Field label="Preço de Venda unit." third><Inp type="number" min="0" step="0.01" value={f.precoVenda} onChange={e=>n("precoVenda",e.target.value)}/></Field>
      <Field label="Valor já Recebido (R$)"><Inp type="number" min="0" step="0.01" value={f.valorRecebido} onChange={e=>n("valorRecebido",e.target.value)} placeholder="0 = não recebeu ainda"/></Field>
      <Field label="Custo Produto unit." half><Inp type="number" min="0" step="0.01" value={f.custoProduto} onChange={e=>n("custoProduto",e.target.value)}/></Field>
      <Field label="Custo Taxa unit." half><Inp type="number" min="0" step="0.01" value={f.custoTaxa} onChange={e=>n("custoTaxa",e.target.value)}/></Field>
      <Field label="Observação"><Inp value={f.obs} onChange={e=>s("obs",e.target.value)} placeholder="ex: parcelado, entrega especial..."/></Field>
    </div>
    <InfoBox items={[
      {label:"Total Vendido",value:brl(v)},
      {label:"Recebido",value:brl(f.valorRecebido||0),color:"#16a34a"},
      {label:"Saldo Pendente",value:brl(sb),color:sb>0?"#dc2626":"#16a34a"},
      {label:"Custo Total",value:brl(c),color:"#dc2626"},
      {label:"Lucro",value:brl(l),color:l>=0?"#16a34a":"#dc2626"},
      {label:"Margem",value:pct(mg),color:mg>=30?"#16a34a":mg>=15?"#ca8a04":"#dc2626"},
    ]}/>
    <MBtns onClose={onClose} onSave={()=>{if(!f.cliente.trim())return alert("Informe o cliente.");if(!f.time.trim())return alert("Informe a camisa.");onSave(f);}}/>
  </>);
}

function FormProduto({inicial,onSave,onClose}){
  const vz={time:"Bahia",uniforme:"Uniforme 1",tamanho:"M",cor:"",qtd:0,qtdMin:1,custoProduto:45,custoTaxa:5,precoVenda:120,fornecedor:""};
  const [f,setF]=useState(inicial?{...vz,...inicial}:vz);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));const n=(k,v)=>s(k,parseFloat(v)||0);
  const ct=r((f.custoProduto||0)+(f.custoTaxa||0));const mg=f.precoVenda>0?r(((f.precoVenda-ct)/f.precoVenda)*100):0;
  return(<>
    <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
      <Field label="Time" half>
        <Inp list="lst-te" value={f.time} onChange={e=>s("time",e.target.value)} placeholder="ex: Bahia" autoFocus/>
        <datalist id="lst-te">{TIMES.map(t=><option key={t} value={t}/>)}</datalist>
      </Field>
      <Field label="Uniforme" half><Sel value={f.uniforme} onChange={e=>s("uniforme",e.target.value)}>{UNIFORMES.map(u=><option key={u}>{u}</option>)}</Sel></Field>
      <Field label="Tamanho" third><Sel value={f.tamanho} onChange={e=>s("tamanho",e.target.value)}>{TAMANHOS.map(t=><option key={t}>{t}</option>)}</Sel></Field>
      <Field label="Cor" third><Inp value={f.cor} onChange={e=>s("cor",e.target.value)} placeholder="ex: Azul/Vermelho"/></Field>
      <Field label="Qtd Estoque" third><Inp type="number" min="0" value={f.qtd} onChange={e=>n("qtd",e.target.value)}/></Field>
      <Field label="Qtd Mínima" half><Inp type="number" min="0" value={f.qtdMin} onChange={e=>n("qtdMin",e.target.value)}/></Field>
      <Field label="Fornecedor" half><Inp value={f.fornecedor} onChange={e=>s("fornecedor",e.target.value)} placeholder="ex: Fornecedor Padrão"/></Field>
      <Field label="Custo Produto (R$)" third><Inp type="number" min="0" step="0.01" value={f.custoProduto} onChange={e=>n("custoProduto",e.target.value)}/></Field>
      <Field label="Custo Taxa (R$)" third><Inp type="number" min="0" step="0.01" value={f.custoTaxa} onChange={e=>n("custoTaxa",e.target.value)}/></Field>
      <Field label="Preço de Venda (R$)" third><Inp type="number" min="0" step="0.01" value={f.precoVenda} onChange={e=>n("precoVenda",e.target.value)}/></Field>
    </div>
    <InfoBox items={[
      {label:"Custo Total",value:brl(ct),color:"#dc2626"},
      {label:"Margem",value:pct(mg),color:mg>=30?"#16a34a":mg>=15?"#ca8a04":"#dc2626"},
      {label:"Lucro Unit.",value:brl(r(f.precoVenda-ct)),color:f.precoVenda-ct>=0?"#16a34a":"#dc2626"},
    ]}/>
    <MBtns onClose={onClose} onSave={()=>{if(!f.time.trim())return alert("Informe o time.");onSave(f);}}/>
  </>);
}

// ── DASHBOARD ────────────────────────────────────────────────
function PageDashboard({db,setDb}){
  const [mesSel,setMesSel]=useState(mesAtual());
  const [editMeta,setEditMeta]=useState(false);
  const [metaTemp,setMetaTemp]=useState({...db.meta});
  const meses=useMemo(()=>{const s=new Set(db.pedidos.map(p=>p.data?.slice(0,7)).filter(Boolean));s.add(mesAtual());return[...s].sort().reverse();},[db.pedidos]);
  const pm=db.pedidos.filter(p=>p.data?.startsWith(mesSel));
  const fat=pm.reduce((a,p)=>a+(p.precoVenda||0)*(p.qtd||1),0);
  const cus=pm.reduce((a,p)=>a+((p.custoProduto||0)+(p.custoTaxa||0))*(p.qtd||1),0);
  const luc=r(fat-cus);const marg=fat>0?r((luc/fat)*100):0;
  const receb=pm.reduce((a,p)=>a+(p.valorRecebido||0),0);const pend=r(fat-receb);
  const baixos=db.produtos.filter(p=>p.qtd<=p.qtdMin);
  const produzir=db.pedidos.filter(p=>p.status==="A Fazer").length;
  const emTransp=db.pedidos.filter(p=>p.status==="Em Transporte").length;
  const entregue=db.pedidos.filter(p=>p.status==="Entregue").length;
  const atrasados=db.pedidos.filter(p=>p.status==="Cancelado").length;
  const tarefasHj=db.tarefas.filter(t=>!t.feita&&t.data===hoje()).length;
  const vendas={};db.pedidos.forEach(p=>{const k=`${p.time||p.camisa} ${p.tamanho}`;vendas[k]=(vendas[k]||0)+(p.qtd||1);});
  const topVendas=Object.entries(vendas).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const now=new Date();
  const hora=now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  const dataStr=now.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const metasAtivas=[
    {label:"Pedidos",atual:pm.length,meta:db.meta.pedidos,fmtFn:v=>String(v),color:"#2563eb"},
    {label:"Receita",atual:fat,meta:db.meta.receita,fmtFn:brl,color:"#16a34a"},
    {label:"Lucro",atual:luc,meta:db.meta.lucro,fmtFn:brl,color:luc>=0?"#16a34a":"#dc2626"},
    {label:"Posts",atual:0,meta:db.meta.posts||0,fmtFn:v=>String(v),color:"#7c3aed"},
    {label:"Futebol",atual:0,meta:db.meta.futebol||0,fmtFn:v=>String(v),color:"#f97316"},
  ].filter(m=>m.meta>0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#0f0f0f 0%,#1a1a2e 100%)",borderRadius:14,
        padding:"24px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",
        boxShadow:"0 4px 24px rgba(0,0,0,0.2)"}}>
        <div>
          <div style={{fontSize:24,fontWeight:900,color:"#fff",letterSpacing:"-0.5px",marginBottom:4}}>
            Olá, Fabrício! ⚽
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",textTransform:"capitalize"}}>{dataStr}</div>
          {tarefasHj>0&&<div style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:6,
            background:"#f97316",borderRadius:20,padding:"5px 14px",fontSize:12,color:"#fff",fontWeight:700}}>
            📋 {tarefasHj} tarefa{tarefasHj>1?"s":""} para hoje
          </div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:48,fontWeight:900,color:"#fff",letterSpacing:"-3px",lineHeight:1}}>{hora}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:4}}>
            {now.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"})}
          </div>
        </div>
      </div>

      {/* Alertas */}
      {baixos.length>0&&(
        <Alert type="warning">
          <span style={{fontWeight:800}}>⚠ Estoque baixo:</span>
          {baixos.slice(0,5).map(p=><span key={p.id} style={{background:"#fde68a",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700}}>{p.time} {p.tamanho} ({p.qtd}un)</span>)}
          {baixos.length>5&&<span>+{baixos.length-5} mais</span>}
        </Alert>
      )}

      {/* 4 KPIs operacionais */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[
          {label:"Pedidos a Fazer",icon:"📦",value:produzir,color:"#f97316",top:"#f97316"},
          {label:"Em Transporte",  icon:"✈️", value:emTransp, color:"#2563eb",top:"#2563eb"},
          {label:"Entregue",       icon:"✅", value:entregue, color:"#16a34a",top:"#16a34a"},
          {label:"Atrasados",      icon:"🚨", value:atrasados,color:"#dc2626",top:"#dc2626"},
        ].map(({label,icon,value,color,top})=>{
          const [h,setH]=useState(false);
          return(
            <div key={label} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
              style={{background:"#fff",border:"1px solid #e5e7eb",borderTop:`4px solid ${top}`,
                borderRadius:12,padding:"20px 22px",transition:"all 0.18s",
                transform:h?"translateY(-3px)":"none",
                boxShadow:h?"0 10px 28px rgba(0,0,0,0.1)":"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",
                    letterSpacing:"0.5px",marginBottom:10}}>{label}</div>
                  <div style={{fontSize:40,fontWeight:900,color,lineHeight:1}}>{value}</div>
                </div>
                <div style={{width:48,height:48,borderRadius:12,background:`${color}15`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desempenho mensal */}
      <Section title="📊 Desempenho Mensal" action={
        <select value={mesSel} onChange={e=>setMesSel(e.target.value)}
          style={{...INP,width:150,padding:"6px 10px"}}>
          {meses.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      }>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:12}}>
          <KPI label="Pedidos"       value={pm.length}   dark/>
          <KPI label="Faturamento"   value={brl(fat)}    color="#16a34a"/>
          <KPI label="Custos"        value={brl(cus)}    color="#dc2626"/>
          <KPI label="Lucro Líquido" value={brl(luc)}    color={luc>=0?"#16a34a":"#dc2626"}/>
          <KPI label="Margem %"      value={pct(marg)}   color={marg>=30?"#16a34a":marg>=15?"#ca8a04":"#dc2626"}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          <KPI label="Recebido"    value={brl(receb)} color="#16a34a"/>
          <KPI label="A Receber"   value={brl(pend)}  color={pend>0?"#ca8a04":"#16a34a"}/>
          <KPI label="Ticket Médio" value={brl(pm.length>0?r(fat/pm.length):0)}/>
        </div>
      </Section>

      {/* Metas */}
      <Section title="🎯 Metas" action={
        <Btn v="sec" onClick={()=>{setMetaTemp({...db.meta});setEditMeta(true);}}>✏ Editar Metas</Btn>
      }>
        {metasAtivas.length===0?(
          <div style={{textAlign:"center",padding:"20px",color:"#9ca3af",fontSize:13}}>
            Nenhuma meta definida. Clique em <strong>Editar Metas</strong> para configurar.
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(metasAtivas.length,3)},1fr)`,gap:14}}>
            {metasAtivas.map(({label,atual,meta,fmtFn,color})=>{
              const p=meta>0?Math.min(100,(atual/meta)*100):0;
              const [h,setH]=useState(false);
              return(
                <div key={label} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
                  style={{background:"#f9fafb",borderRadius:10,padding:"16px 18px",
                    border:"1px solid #e5e7eb",transition:"all 0.15s",
                    transform:h?"translateY(-1px)":"none",
                    boxShadow:h?"0 4px 12px rgba(0,0,0,0.08)":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontWeight:700,fontSize:14,color:"#111"}}>{label}</span>
                    <span style={{fontWeight:900,fontSize:15,color}}>
                      {fmtFn(atual)} <span style={{fontWeight:400,color:"#9ca3af",fontSize:12}}>/ {fmtFn(meta)}</span>
                    </span>
                  </div>
                  <Prog value={Math.max(0,atual)} max={meta} color={color}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#9ca3af",marginTop:4}}>
                    <span>{p.toFixed(0)}% concluído</span>
                    {p>=100&&<span style={{color:"#16a34a",fontWeight:700}}>✅ Atingida!</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* IA */}
      <Section title="🏆 Análise de Vendas (IA)">
        {topVendas.length===0?<Empty msg="Cadastre pedidos para ver análise." icon="📊"/>:(
          <>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {topVendas.map(([nome,qtd],i)=>(
                <div key={nome} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",
                  borderBottom:i<topVendas.length-1?"1px solid #f5f5f5":"none"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",
                    background:i===0?"#111":"#f3f4f6",color:i===0?"#fff":"#6b7280",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:12,fontWeight:800,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#111"}}>{nome}</div>
                    <Prog value={qtd} max={topVendas[0][1]} color={i===0?"#111":"#d1d5db"}/>
                  </div>
                  <div style={{fontWeight:800,fontSize:14}}>{qtd} vendas</div>
                </div>
              ))}
            </div>
            <Alert type="success">💡 <strong>Sugestão IA:</strong> Priorize reposição de <strong>{topVendas[0]?.[0]}</strong>.</Alert>
          </>
        )}
      </Section>

      {/* Últimos pedidos */}
      <Section title="🕐 Últimos Pedidos">
        {db.pedidos.length===0?<Empty msg="Nenhum pedido cadastrado." icon="🛒"/>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Data","Cliente","Camisa","Tam.","Vendido","Recebido","Saldo","Status"].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {[...db.pedidos].reverse().slice(0,8).map(p=>{
                  const v=r((p.precoVenda||0)*(p.qtd||1));const sb=r(v-(p.valorRecebido||0));
                  return(
                    <HRow key={p.id}>
                      <td style={{...TD,color:"#9ca3af"}}>{p.data}</td>
                      <td style={{...TD,fontWeight:700,color:"#111"}}>{p.cliente}</td>
                      <td style={TD}>{p.time||p.camisa} {p.uniforme&&`(${p.uniforme})`}</td>
                      <td style={TD}>{p.tamanho}</td>
                      <td style={{...TD,fontWeight:700}}>{brl(v)}</td>
                      <td style={{...TD,color:"#16a34a",fontWeight:700}}>{brl(p.valorRecebido||0)}</td>
                      <td style={{...TD,fontWeight:700,color:sb>0?"#dc2626":"#16a34a"}}>{brl(sb)}</td>
                      <td style={TD}><Badge status={p.status}/></td>
                    </HRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Modal metas */}
      {editMeta&&(
        <Modal title="Editar Metas" onClose={()=>setEditMeta(false)}>
          <div style={{marginBottom:12,padding:"10px 14px",background:"#f0fdf4",borderRadius:8,fontSize:12,color:"#15803d"}}>
            💡 Coloque <strong>0</strong> para não exibir uma meta no dashboard.
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <Field label="🛒 Meta de Pedidos"><Inp type="number" min="0" value={metaTemp.pedidos} onChange={e=>setMetaTemp(m=>({...m,pedidos:parseInt(e.target.value)||0}))}/></Field>
            <Field label="💰 Meta de Receita (R$)"><Inp type="number" min="0" step="0.01" value={metaTemp.receita} onChange={e=>setMetaTemp(m=>({...m,receita:parseFloat(e.target.value)||0}))}/></Field>
            <Field label="📈 Meta de Lucro (R$)"><Inp type="number" min="0" step="0.01" value={metaTemp.lucro} onChange={e=>setMetaTemp(m=>({...m,lucro:parseFloat(e.target.value)||0}))}/></Field>
            <Field label="📱 Meta de Posts" half><Inp type="number" min="0" value={metaTemp.posts||0} onChange={e=>setMetaTemp(m=>({...m,posts:parseInt(e.target.value)||0}))}/></Field>
            <Field label="⚽ Meta de Futebol" half><Inp type="number" min="0" value={metaTemp.futebol||0} onChange={e=>setMetaTemp(m=>({...m,futebol:parseInt(e.target.value)||0}))}/></Field>
          </div>
          <MBtns onClose={()=>setEditMeta(false)} onSave={()=>{setDb(prev=>({...prev,meta:metaTemp}));setEditMeta(false);}} label="Salvar Metas"/>
        </Modal>
      )}
    </div>
  );
}

// ── ESTOQUE ──────────────────────────────────────────────────
function PageEstoque({db,onAdd,onEdit,onDelete}){
  const [busca,setBusca]=useState("");const [ft,setFt]=useState("Todos");
  const baixos=db.produtos.filter(p=>p.qtd<=p.qtdMin);
  const total=db.produtos.reduce((a,p)=>a+p.qtd,0);
  const valor=db.produtos.reduce((a,p)=>a+p.qtd*(p.custoProduto||0),0);
  const times=["Todos",...new Set(db.produtos.map(p=>p.time||p.nome).filter(Boolean))];
  const filtrados=db.produtos.filter(p=>
    (!busca||(p.time||p.nome||"").toLowerCase().includes(busca.toLowerCase())||p.tamanho?.toLowerCase().includes(busca.toLowerCase()))
    &&(ft==="Todos"||(p.time||p.nome)===ft));
  const vendas={};db.pedidos.forEach(p=>{const k=`${p.time} ${p.tamanho}`;vendas[k]=(vendas[k]||0)+(p.qtd||1);});
  const sugestoes=Object.entries(vendas).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return(
    <div>
      {baixos.length>0&&<Alert type="error"><span style={{fontWeight:800}}>⚠ Estoque baixo:</span>{baixos.map(p=><span key={p.id} style={{background:"#fecaca",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700}}>{p.time} {p.uniforme} {p.tamanho} ({p.qtd}un)</span>)}</Alert>}
      {sugestoes.length>0&&<Alert type="success">💡 <strong>IA — Repor:</strong> {sugestoes.map(([k,v])=>`${k} (${v}vnd)`).join(" · ")}</Alert>}
      <div style={{display:"flex",gap:14,marginBottom:16}}>
        <HCard style={{flex:1}}><div style={{fontSize:11,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>📦 TOTAL PEÇAS</div><div style={{fontSize:28,fontWeight:900,color:"#111"}}>{total}</div></HCard>
        <HCard style={{flex:1}} color="#ca8a04"><div style={{fontSize:11,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>⚠ ESTOQUE BAIXO</div><div style={{fontSize:28,fontWeight:900,color:baixos.length>0?"#ca8a04":"#16a34a"}}>{baixos.length}</div></HCard>
        <HCard style={{flex:1}}><div style={{fontSize:11,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>💰 VALOR EM ESTOQUE</div><div style={{fontSize:22,fontWeight:900,color:"#111"}}>{brl(valor)}</div></HCard>
      </div>
      <Section>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div style={{fontWeight:800,fontSize:15,color:"#111"}}>{filtrados.length} produto{filtrados.length!==1?"s":""}</div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <Tabs options={times.map(t=>({k:t,l:t}))} value={ft} onChange={setFt}/>
            <Inp value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar produto..." style={{...INP,width:180}}/>
            <Btn onClick={onAdd}>+ Produto</Btn>
          </div>
        </div>
        {filtrados.length===0?<Empty msg="Nenhum produto encontrado." icon="📦"/>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Produto","Categoria","Cor / Tam","QTD","Custo","Fornecedor","Status",""].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {filtrados.map(p=>{
                  const ct=r((p.custoProduto||0)+(p.custoTaxa||0));
                  return(
                    <HRow key={p.id}>
                      <td style={TD}><div style={{fontWeight:700,color:"#111"}}>{p.time||p.nome}</div>{p.uniforme&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{p.uniforme}</div>}</td>
                      <td style={{...TD,color:"#6b7280"}}>Camisa</td>
                      <td style={TD}>{p.cor} / {p.tamanho}</td>
                      <td style={TD}><span style={{fontWeight:700,color:p.qtd===0?"#dc2626":p.qtd<=p.qtdMin?"#ca8a04":"#111"}}>{p.qtd}</span><span style={{fontSize:10,color:"#9ca3af",marginLeft:4}}>(min {p.qtdMin})</span></td>
                      <td style={TD}>{brl(ct)}</td>
                      <td style={{...TD,color:"#6b7280"}}>{p.fornecedor||"—"}</td>
                      <td style={TD}><StockBadge qtd={p.qtd} qtdMin={p.qtdMin}/></td>
                      <td style={TD}><div style={{display:"flex",gap:5}}><Btn v="sm" onClick={()=>onEdit(p)}>✏</Btn><Btn v="danger" onClick={()=>onDelete(p.id)}>🗑</Btn></div></td>
                    </HRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── PEDIDOS ──────────────────────────────────────────────────
function PagePedidos({db,onAdd,onEdit,onDelete,onUpdateMeta}){
  const [filtro,setFiltro]=useState("mes");const [busca,setBusca]=useState("");
  const [mm,setMm]=useState(false);const [mt,setMt]=useState({...db.meta});
  const m=mesAtual();const hj=hoje();const sw=semIni();const mp=mesPrev();
  const filtrados=db.pedidos.filter(p=>{
    const mf=filtro==="todos"?true:filtro==="hoje"?p.data===hj:filtro==="semana"?p.data>=sw:filtro==="mes_ant"?p.data?.startsWith(mp):p.data?.startsWith(m);
    return mf&&(!busca||p.cliente?.toLowerCase().includes(busca.toLowerCase())||p.time?.toLowerCase().includes(busca.toLowerCase()));
  });
  const pm=db.pedidos.filter(p=>p.data?.startsWith(m));
  const fat=pm.reduce((a,p)=>a+(p.precoVenda||0)*(p.qtd||1),0);
  const cus=pm.reduce((a,p)=>a+((p.custoProduto||0)+(p.custoTaxa||0))*(p.qtd||1),0);
  const luc=r(fat-cus);const rec=pm.reduce((a,p)=>a+(p.valorRecebido||0),0);
  const FILTROS=[{k:"hoje",l:"Hoje"},{k:"semana",l:"Esta semana"},{k:"mes",l:"Este mês"},{k:"mes_ant",l:"Mês passado"},{k:"todos",l:"Todos"}];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div><div style={{fontSize:22,fontWeight:800,color:"#111"}}>Pedidos</div><div style={{fontSize:13,color:"#9ca3af"}}>Meta mensal vs realizado</div></div>
        <div style={{display:"flex",gap:8}}><Btn v="sec" onClick={()=>{setMt({...db.meta});setMm(true);}}>🎯 Meta</Btn><Btn onClick={onAdd}>+ Pedido</Btn></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        <KPI label="Pedidos Mês" value={pm.length} dark/>
        <KPI label="Faturamento" value={brl(fat)} color="#16a34a"/>
        <KPI label="Custo Mês" value={brl(cus)} color="#dc2626"/>
        <KPI label="Lucro Líquido" value={brl(luc)} color={luc>=0?"#16a34a":"#dc2626"}/>
        <KPI label="A Receber" value={brl(r(fat-rec))} color={fat-rec>0?"#ca8a04":"#16a34a"}/>
      </div>
      <Section title={`🎯 Meta de ${m}`}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
          {[{l:"Pedidos",a:pm.length,m:db.meta.pedidos,f:v=>String(v)},{l:"Receita",a:fat,m:db.meta.receita,f:brl},{l:"Lucro",a:luc,m:db.meta.lucro,f:brl}].map(({l,a,m,f})=>{
            const p=m>0?Math.min(100,(a/m)*100):0;
            return(<div key={l}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:2}}><span>{l}: <strong>{f(a)}</strong> / {f(m)}</span><span style={{fontWeight:700}}>{p.toFixed(0)}%</span></div><Prog value={Math.max(0,a)} max={m} color="#111"/></div>);
          })}
        </div>
      </Section>
      <Section action={
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <Tabs options={FILTROS} value={filtro} onChange={setFiltro}/>
          <Inp value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar..." style={{...INP,width:180}}/>
        </div>
      }>
        <div style={{fontWeight:800,fontSize:15,color:"#111",marginBottom:14}}>Pedidos</div>
        {filtrados.length===0?<Empty msg="Nenhum pedido encontrado." icon="🛒"/>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Data","ID","Produto","QTD","Valor","Custo/Taxa","Lucro","Status",""].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {[...filtrados].reverse().map(p=>{
                  const v=r((p.precoVenda||0)*(p.qtd||1));const c=r(((p.custoProduto||0)+(p.custoTaxa||0))*(p.qtd||1));
                  const l=r(v-c);const mg=v>0?r((l/v)*100):0;const sb=r(v-(p.valorRecebido||0));
                  return(
                    <HRow key={p.id}>
                      <td style={{...TD,color:"#9ca3af"}}>{p.data}</td>
                      <td style={{...TD,color:"#6b7280",fontSize:12}}>#{p.id}</td>
                      <td style={TD}><div style={{fontWeight:700,color:"#111"}}>{p.time||p.camisa} {p.tamanho}</div><div style={{fontSize:11,color:"#9ca3af"}}>{p.cliente}{sb>0&&<span style={{color:"#dc2626"}}> · Receber {brl(sb)}</span>}</div></td>
                      <td style={{...TD,textAlign:"center"}}>{p.qtd||1}</td>
                      <td style={{...TD,fontWeight:700}}>{brl(v)}</td>
                      <td style={TD}>{brl(c)} <MargBadge marg={mg}/></td>
                      <td style={{...TD,fontWeight:700,color:l>=0?"#16a34a":"#dc2626"}}>{brl(l)}</td>
                      <td style={TD}><Badge status={p.status}/></td>
                      <td style={TD}><div style={{display:"flex",gap:5}}><Btn v="sm" onClick={()=>onEdit(p)}>✏</Btn><Btn v="danger" onClick={()=>onDelete(p.id)}>🗑</Btn></div></td>
                    </HRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {mm&&<Modal title="Editar Meta Mensal" onClose={()=>setMm(false)}>
        <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
          <Field label="Meta de Pedidos"><Inp type="number" min="0" value={mt.pedidos} onChange={e=>setMt(m=>({...m,pedidos:parseInt(e.target.value)||0}))}/></Field>
          <Field label="Meta de Receita (R$)"><Inp type="number" min="0" step="0.01" value={mt.receita} onChange={e=>setMt(m=>({...m,receita:parseFloat(e.target.value)||0}))}/></Field>
          <Field label="Meta de Lucro (R$)"><Inp type="number" min="0" step="0.01" value={mt.lucro} onChange={e=>setMt(m=>({...m,lucro:parseFloat(e.target.value)||0}))}/></Field>
        </div>
        <MBtns onClose={()=>setMm(false)} onSave={()=>{onUpdateMeta(mt);setMm(false);}} label="Salvar Meta"/>
      </Modal>}
    </div>
  );
}

// ── GESTÃO KANBAN ─────────────────────────────────────────────
function PageGestao({db,onEdit,onAdd}){
  const [filtro,setFiltro]=useState("mes");
  const m=mesAtual();const hj=hoje();const sw=semIni();const mp=mesPrev();
  const FILTROS=[{k:"hoje",l:"Hoje"},{k:"semana",l:"Esta semana"},{k:"mes",l:"Este mês"},{k:"mes_ant",l:"Mês passado"},{k:"todos",l:"Todos"}];
  const filtrados=db.pedidos.filter(p=>{
    if(filtro==="hoje")return p.data===hj;if(filtro==="semana")return p.data>=sw;
    if(filtro==="mes_ant")return p.data?.startsWith(mp);if(filtro==="todos")return true;
    return p.data?.startsWith(m);
  });
  return(
    <div>
      <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:22,fontWeight:800,color:"#111"}}>Gestão de Pedidos</div><div style={{fontSize:13,color:"#9ca3af"}}>Esteira de produção e envio</div></div>
        <Btn onClick={onAdd}>+ Pedido</Btn>
      </div>
      <div style={{marginBottom:16}}><Tabs options={FILTROS} value={filtro} onChange={setFiltro}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {KANBAN.map(col=>{
          const peds=filtrados.filter(p=>p.status===col.key);
          return(
            <div key={col.key}>
              <div style={{background:col.color,borderRadius:"10px 10px 0 0",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#fff",letterSpacing:"1px"}}>{col.icon} {col.label}</div>
                <span style={{background:"rgba(255,255,255,0.25)",color:"#fff",borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:800}}>{peds.length}</span>
              </div>
              <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderTop:"none",borderRadius:"0 0 10px 10px",padding:12,minHeight:200,display:"flex",flexDirection:"column",gap:8}}>
                {peds.length===0?<div style={{textAlign:"center",color:"#d1d5db",fontSize:13,padding:"20px 0"}}>Nenhum pedido</div>:(
                  peds.map(p=>{
                    const v=r((p.precoVenda||0)*(p.qtd||1));const sb=r(v-(p.valorRecebido||0));
                    const [h,setH]=useState(false);
                    return(
                      <div key={p.id} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={()=>onEdit(p)}
                        style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"12px 14px",cursor:"pointer",transition:"all 0.15s",transform:h?"translateY(-1px)":"none",boxShadow:h?"0 4px 12px rgba(0,0,0,0.1)":"0 1px 3px rgba(0,0,0,0.05)"}}>
                        <div style={{fontWeight:700,fontSize:13,color:"#111",marginBottom:4}}>{p.cliente}</div>
                        <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>{p.time} {p.uniforme&&`(${p.uniforme})`} · {p.tamanho} · {p.qtd||1}un</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontWeight:800,fontSize:13,color:"#111"}}>{brl(v)}</span>
                          {sb>0&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>⏳ {brl(sb)}</span>}
                        </div>
                        {p.data&&<div style={{fontSize:10,color:"#d1d5db",marginTop:4}}>{p.data}</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CUSTO/LUCRO ───────────────────────────────────────────────
function PageCusto({db,setDb}){
  const [filtro,setFiltro]=useState("mes");const [modalD,setModalD]=useState(false);
  const [fd,setFd]=useState({data:hoje(),categoria:"Produto / Estoque",descricao:"",valor:0});
  const m=mesAtual();const hj=hoje();const sw=semIni();const mp=mesPrev();
  const FILTROS=[{k:"hoje",l:"Hoje"},{k:"semana",l:"Esta semana"},{k:"mes",l:"Este mês"},{k:"mes_ant",l:"Mês passado"},{k:"todos",l:"Todos"}];
  const fd2=x=>{const d=x.data||"";if(filtro==="hoje")return d===hj;if(filtro==="semana")return d>=sw;if(filtro==="mes_ant")return d.startsWith(mp);if(filtro==="todos")return true;return d.startsWith(m);};
  const peds=db.pedidos.filter(fd2);
  const rec=peds.reduce((a,p)=>a+(p.precoVenda||0)*(p.qtd||1),0);
  const cusProd=peds.reduce((a,p)=>a+(p.custoProduto||0)*(p.qtd||1),0);
  const cusTaxa=peds.reduce((a,p)=>a+(p.custoTaxa||0)*(p.qtd||1),0);
  const despesas=db.caixa.filter(c=>c.tipo==="Saída"&&fd2(c));
  const totDesp=despesas.reduce((a,c)=>a+(c.valor||0),0);
  const lucLiq=r(rec-cusProd-cusTaxa-totDesp);
  const salvD=()=>{if(!fd.descricao.trim())return alert("Informe a descrição.");if(!fd.valor||fd.valor<=0)return alert("Informe o valor.");setDb(prev=>{const id=prev.nextId+1;return{...prev,nextId:id,caixa:[...prev.caixa,{...fd,tipo:"Saída",id}]};});setFd({data:hoje(),categoria:"Produto / Estoque",descricao:"",valor:0});setModalD(false);};
  const delD=id=>{if(!window.confirm("Excluir?"))return;setDb(prev=>({...prev,caixa:prev.caixa.filter(c=>c.id!==id)}));};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div><div style={{fontSize:22,fontWeight:800,color:"#111"}}>Custo / Lucro</div><div style={{fontSize:13,color:"#9ca3af"}}>Despesas e resultado</div></div>
        <Btn onClick={()=>setModalD(true)}>+ Despesa</Btn>
      </div>
      <div style={{marginBottom:16}}><Tabs options={FILTROS} value={filtro} onChange={setFiltro}/></div>
      <Section>
        <div style={{fontWeight:800,fontSize:13,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:16}}>RESUMO</div>
        {[{icon:"💰",label:"Receita Total",value:brl(rec),color:"#111"},{icon:"📦",label:"Custo Produtos",value:`- ${brl(cusProd)}`,color:"#dc2626"},{icon:"📋",label:"Taxas / Importação",value:`- ${brl(cusTaxa)}`,color:"#dc2626"},{icon:"📊",label:"Despesas",value:`- ${brl(totDesp)}`,color:"#dc2626"}].map(({icon,label,value,color})=>(
          <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f5f5f5"}}>
            <span style={{fontSize:14,color:"#374151"}}>{icon} {label}</span>
            <span style={{fontSize:15,fontWeight:600,color}}>{value}</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderTop:"2px solid #e5e7eb",marginTop:4}}>
          <span style={{fontSize:16,fontWeight:800,color:"#111"}}>🎯 Lucro Líquido</span>
          <span style={{fontSize:20,fontWeight:900,color:lucLiq>=0?"#16a34a":"#dc2626"}}>{brl(lucLiq)}</span>
        </div>
      </Section>
      <Section title="Despesas">
        {despesas.length===0?<Empty msg="Nenhuma despesa neste período." icon="📊"/>:(
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Categoria","Descrição","Valor",""].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>{[...despesas].reverse().map(c=>(
              <HRow key={c.id}>
                <td style={{...TD,color:"#9ca3af"}}>{c.data}</td>
                <td style={TD}><span style={{background:"#f3f4f6",color:"#374151",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{c.categoria}</span></td>
                <td style={{...TD,fontWeight:600,color:"#111"}}>{c.descricao}</td>
                <td style={{...TD,fontWeight:700,color:"#dc2626"}}>{brl(c.valor)}</td>
                <td style={TD}><Btn v="danger" onClick={()=>delD(c.id)}>🗑</Btn></td>
              </HRow>
            ))}</tbody>
          </table></div>
        )}
      </Section>
      {modalD&&<Modal title="Nova Despesa" onClose={()=>setModalD(false)}>
        <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
          <Field label="Data" half><Inp type="date" value={fd.data} onChange={e=>setFd(p=>({...p,data:e.target.value}))}/></Field>
          <Field label="Categoria" half><Sel value={fd.categoria} onChange={e=>setFd(p=>({...p,categoria:e.target.value}))}>{CATS_DESP.map(c=><option key={c}>{c}</option>)}</Sel></Field>
          <Field label="Descrição"><Inp value={fd.descricao} onChange={e=>setFd(p=>({...p,descricao:e.target.value}))} placeholder="ex: 21 unid. Bahia..." autoFocus/></Field>
          <Field label="Valor (R$)"><Inp type="number" min="0" step="0.01" value={fd.valor} onChange={e=>setFd(p=>({...p,valor:parseFloat(e.target.value)||0}))}/></Field>
        </div>
        <MBtns onClose={()=>setModalD(false)} onSave={salvD}/>
      </Modal>}
    </div>
  );
}

// ── CAIXA ────────────────────────────────────────────────────
function PageCaixa({db,setDb}){
  const [filtro,setFiltro]=useState("mes");const [modal,setModal]=useState(false);
  const [f,setF]=useState({data:hoje(),tipo:"Entrada",descricao:"",valor:0,categoria:"Venda"});
  const m=mesAtual();const hj=hoje();const sw=semIni();const mp=mesPrev();
  const FILTROS=[{k:"hoje",l:"Hoje"},{k:"semana",l:"Esta semana"},{k:"mes",l:"Este mês"},{k:"mes_ant",l:"Mês passado"},{k:"todos",l:"Todos"}];
  const fd2=c=>{const d=c.data||"";if(filtro==="hoje")return d===hj;if(filtro==="semana")return d>=sw;if(filtro==="mes_ant")return d.startsWith(mp);if(filtro==="todos")return true;return d.startsWith(m);};
  const itens=db.caixa.filter(fd2);
  const ent=itens.filter(c=>c.tipo==="Entrada").reduce((a,c)=>a+(c.valor||0),0);
  const sai=itens.filter(c=>c.tipo==="Saída").reduce((a,c)=>a+(c.valor||0),0);
  const saldo=r(ent-sai);
  const salv=()=>{if(!f.descricao.trim())return alert("Informe a descrição.");if(!f.valor||f.valor<=0)return alert("Informe o valor.");setDb(prev=>{const id=prev.nextId+1;return{...prev,nextId:id,caixa:[...prev.caixa,{...f,id}]};});setF({data:hoje(),tipo:"Entrada",descricao:"",valor:0,categoria:"Venda"});setModal(false);};
  const del=id=>{if(!window.confirm("Excluir?"))return;setDb(prev=>({...prev,caixa:prev.caixa.filter(c=>c.id!==id)}));};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div><div style={{fontSize:22,fontWeight:800,color:"#111"}}>Caixa</div><div style={{fontSize:13,color:"#9ca3af"}}>Entradas, saídas e saldo</div></div>
        <Btn onClick={()=>setModal(true)}>+ Receita</Btn>
      </div>
      <div style={{marginBottom:16}}><Tabs options={FILTROS} value={filtro} onChange={setFiltro}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
        <HCard color="#16a34a"><div style={{fontSize:11,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>ENTRADAS</div><div style={{fontSize:28,fontWeight:900,color:"#16a34a"}}>{brl(ent)}</div><div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Saques + Extras</div></HCard>
        <HCard color="#dc2626"><div style={{fontSize:11,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>SAÍDAS (DESPESAS)</div><div style={{fontSize:28,fontWeight:900,color:"#dc2626"}}>{brl(sai)}</div><div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Total de despesas</div></HCard>
        <HCard color={saldo>=0?"#16a34a":"#dc2626"}><div style={{fontSize:11,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>SALDO EM CAIXA</div><div style={{fontSize:28,fontWeight:900,color:saldo>=0?"#16a34a":"#dc2626"}}>{brl(saldo)}</div><div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Entradas – Despesas</div></HCard>
      </div>
      <Section title="Movimentações">
        {itens.length===0?<Empty msg="Nenhum lançamento neste período." icon="💳"/>:(
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Descrição","Tipo","Valor",""].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>{[...itens].reverse().map(c=>(
              <HRow key={c.id}>
                <td style={{...TD,color:"#9ca3af"}}>{c.data}</td>
                <td style={{...TD,fontWeight:600,color:"#111"}}>{c.descricao}</td>
                <td style={TD}><span style={{background:c.tipo==="Entrada"?"#f0fdf4":"#fef2f2",color:c.tipo==="Entrada"?"#16a34a":"#dc2626",border:`1px solid ${c.tipo==="Entrada"?"#bbf7d0":"#fecaca"}`,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{c.categoria||c.tipo}</span></td>
                <td style={{...TD,fontWeight:700,color:c.tipo==="Entrada"?"#16a34a":"#dc2626"}}>{c.tipo==="Entrada"?"+ ":"- "}{brl(c.valor)}</td>
                <td style={TD}><Btn v="danger" onClick={()=>del(c.id)}>🗑</Btn></td>
              </HRow>
            ))}</tbody>
          </table></div>
        )}
      </Section>
      {modal&&<Modal title="Novo Lançamento" onClose={()=>setModal(false)}>
        <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
          <Field label="Data" half><Inp type="date" value={f.data} onChange={e=>setF(p=>({...p,data:e.target.value}))}/></Field>
          <Field label="Tipo" half><Sel value={f.tipo} onChange={e=>setF(p=>({...p,tipo:e.target.value}))}><option>Entrada</option><option>Saída</option></Sel></Field>
          <Field label="Descrição"><Inp value={f.descricao} onChange={e=>setF(p=>({...p,descricao:e.target.value}))} placeholder="ex: Venda camisa Bahia..." autoFocus/></Field>
          <Field label="Categoria" half>
            <Sel value={f.categoria} onChange={e=>setF(p=>({...p,categoria:e.target.value}))}>
              <optgroup label="Entradas">{CATS_REC.map(c=><option key={c}>{c}</option>)}</optgroup>
              <optgroup label="Saídas">{CATS_DESP.map(c=><option key={c}>{c}</option>)}</optgroup>
            </Sel>
          </Field>
          <Field label="Valor (R$)" half><Inp type="number" min="0" step="0.01" value={f.valor} onChange={e=>setF(p=>({...p,valor:parseFloat(e.target.value)||0}))}/></Field>
        </div>
        <MBtns onClose={()=>setModal(false)} onSave={salv}/>
      </Modal>}
    </div>
  );
}

// ── TAREFAS ──────────────────────────────────────────────────
function PageTarefas({db,setDb}){
  const [modal,setModal]=useState(false);const [aba,setAba]=useState("hoje");
  const [f,setF]=useState({titulo:"",descricao:"",data:hoje(),prioridade:"Normal",categoria:"Outro",feita:false});
  const hj=hoje();const sw=semIni();const fw=semFim();
  const lista=db.tarefas.filter(t=>aba==="hoje"?t.data===hj&&!t.feita:aba==="semana"?t.data>=sw&&t.data<=fw:aba==="feitas"?t.feita:true);
  const hjCnt=db.tarefas.filter(t=>t.data===hj&&!t.feita).length;
  const fCnt=db.tarefas.filter(t=>t.feita).length;
  const pCnt=db.tarefas.filter(t=>!t.feita).length;
  const fSem=db.tarefas.filter(t=>t.data>=sw&&t.data<=fw&&t.feita).length;
  const tSem=db.tarefas.filter(t=>t.data>=sw&&t.data<=fw).length;
  const prog=tSem>0?Math.round((fSem/tSem)*100):0;
  const salv=()=>{if(!f.titulo.trim())return alert("Informe o título.");setDb(prev=>{const id=prev.nextId+1;return{...prev,nextId:id,tarefas:[...prev.tarefas,{...f,id}]};});setF({titulo:"",descricao:"",data:hj,prioridade:"Normal",categoria:"Outro",feita:false});setModal(false);};
  const toggle=id=>setDb(prev=>({...prev,tarefas:prev.tarefas.map(t=>t.id===id?{...t,feita:!t.feita}:t)}));
  const del=id=>{if(!window.confirm("Excluir?"))return;setDb(prev=>({...prev,tarefas:prev.tarefas.filter(t=>t.id!==id)}));};
  const priC={Alta:"#dc2626",Normal:"#111",Baixa:"#9ca3af"};
  const ABAS=[{k:"hoje",l:`Hoje (${hjCnt})`},{k:"semana",l:"Semana"},{k:"todas",l:"Todas"},{k:"feitas",l:`Feitas (${fCnt})`}];
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <KPI label="Hoje" value={hjCnt} color={hjCnt>0?"#dc2626":"#16a34a"}/>
        <KPI label="Pendentes" value={pCnt} color={pCnt>0?"#ca8a04":"#16a34a"}/>
        <KPI label="Concluídas" value={fCnt} color="#16a34a"/>
      </div>
      <div style={{background:"#111",borderRadius:12,padding:"18px 22px",marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:14,color:"#fff",marginBottom:12}}>📋 Relatório Semanal</div>
        <div style={{display:"flex",gap:24,alignItems:"center"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#fff"}}>{fSem}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>FEITAS</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#fbbf24"}}>{tSem-fSem}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>PENDENTES</div></div>
          <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:4}}><span>Progresso semanal</span><span>{prog}%</span></div><div style={{height:8,background:"rgba(255,255,255,0.1)",borderRadius:4}}><div style={{width:`${prog}%`,height:"100%",background:prog>=70?"#4ade80":"#fbbf24",borderRadius:4,transition:"width 0.5s"}}/></div></div>
        </div>
      </div>
      <Section action={<div style={{display:"flex",gap:8,alignItems:"center"}}><Tabs options={ABAS} value={aba} onChange={setAba}/><Btn onClick={()=>setModal(true)}>+ Tarefa</Btn></div>}>
        {lista.length===0?<Empty msg="Nenhuma tarefa nesta aba." icon="📋"/>:(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {lista.sort((a,b)=>({Alta:0,Normal:1,Baixa:2}[a.prioridade]||1)-({Alta:0,Normal:1,Baixa:2}[b.prioridade]||1)).map(t=>{
              const [h,setH]=useState(false);
              return(
                <div key={t.id} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
                  style={{display:"flex",alignItems:"flex-start",gap:12,padding:14,border:`1px solid ${h?"#d1d5db":"#e5e7eb"}`,borderLeft:`4px solid ${t.feita?"#d1d5db":priC[t.prioridade]||"#111"}`,borderRadius:10,background:t.feita?"#fafafa":"#fff",opacity:t.feita?0.6:1,transition:"all 0.15s",transform:h&&!t.feita?"translateX(2px)":"none"}}>
                  <button onClick={()=>toggle(t.id)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${t.feita?"#16a34a":"#d1d5db"}`,background:t.feita?"#16a34a":"none",cursor:"pointer",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12}}>{t.feita?"✓":""}</button>
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:"#111",textDecoration:t.feita?"line-through":"none"}}>{t.titulo}</div>{t.descricao&&<div style={{fontSize:12,color:"#9ca3af",marginTop:3}}>{t.descricao}</div>}<div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}><span style={{fontSize:11,color:"#9ca3af"}}>📅 {t.data}</span><span style={{fontSize:11,color:priC[t.prioridade]||"#111",fontWeight:700}}>● {t.prioridade}</span><span style={{fontSize:11,color:"#9ca3af"}}>{t.categoria}</span></div></div>
                  <Btn v="danger" onClick={()=>del(t.id)}>✕</Btn>
                </div>
              );
            })}
          </div>
        )}
      </Section>
      {modal&&<Modal title="Nova Tarefa" onClose={()=>setModal(false)}>
        <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
          <Field label="Título"><Inp value={f.titulo} onChange={e=>setF(p=>({...p,titulo:e.target.value}))} placeholder="O que precisa fazer?" autoFocus/></Field>
          <Field label="Descrição"><Inp value={f.descricao} onChange={e=>setF(p=>({...p,descricao:e.target.value}))} placeholder="Detalhes (opcional)"/></Field>
          <Field label="Data" third><Inp type="date" value={f.data} onChange={e=>setF(p=>({...p,data:e.target.value}))}/></Field>
          <Field label="Prioridade" third><Sel value={f.prioridade} onChange={e=>setF(p=>({...p,prioridade:e.target.value}))}>{["Alta","Normal","Baixa"].map(p=><option key={p}>{p}</option>)}</Sel></Field>
          <Field label="Categoria" third><Sel value={f.categoria} onChange={e=>setF(p=>({...p,categoria:e.target.value}))}>{CATS_TAR.map(c=><option key={c}>{c}</option>)}</Sel></Field>
        </div>
        <MBtns onClose={()=>setModal(false)} onSave={salv}/>
      </Modal>}
    </div>
  );
}

// ── FORNECEDOR ────────────────────────────────────────────────
function PageFornecedor({db,setDb}){
  const [modal,setModal]=useState(null);
  const [f,setF]=useState({data:hoje(),cliente:"",time:"",uniforme:"Uniforme 1",tamanho:"M",qtd:1,precoVenda:0,status:"Lista de Espera",custoProduto:0,custoTaxa:0,obs:""});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));const n=(k,v)=>s(k,parseFloat(v)||0);
  const abrirN=()=>{setF({data:hoje(),cliente:"",time:"",uniforme:"Uniforme 1",tamanho:"M",qtd:1,precoVenda:0,status:"Lista de Espera",custoProduto:0,custoTaxa:0,obs:""});setModal("novo");};
  const abrirE=item=>{setF({...item});setModal("editar");};
  const salv=()=>{if(!f.time?.trim())return alert("Informe a camisa.");setDb(prev=>{if(modal==="editar")return{...prev,pedidosFornecedor:prev.pedidosFornecedor.map(p=>p.id===f.id?f:p)};const id=prev.nextId+1;return{...prev,nextId:id,pedidosFornecedor:[...prev.pedidosFornecedor,{...f,id}]};});setModal(null);};
  const del=id=>{if(!window.confirm("Excluir?"))return;setDb(prev=>({...prev,pedidosFornecedor:prev.pedidosFornecedor.filter(p=>p.id!==id)}));};
  const mover=(id,st)=>setDb(prev=>({...prev,pedidosFornecedor:prev.pedidosFornecedor.map(p=>p.id===id?{...p,status:st}:p)}));
  const times=[...new Set([...db.produtos.map(p=>p.time||p.nome).filter(Boolean),...TIMES])].filter((v,i,a)=>a.indexOf(v)===i);
  const grupos=ST_FORN.reduce((acc,st)=>{acc[st]=db.pedidosFornecedor.filter(p=>p.status===st);return acc;},{});
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {ST_FORN.map(st=><KPI key={st} label={st} value={grupos[st].length} color={st==="Chegou - Vendido"?"#16a34a":"#111"}/>)}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><Btn onClick={abrirN}>+ Novo Pedido</Btn></div>
      {db.pedidosFornecedor.length===0&&(
        <Section>
          <Empty msg="Nenhum pedido de fornecedor cadastrado." icon="🚚"/>
        </Section>
      )}
      {ST_FORN.map(st=>grupos[st].length===0?null:(
        <Section key={st} title={<span style={{display:"flex",alignItems:"center",gap:10}}><Badge status={st}/><span style={{fontSize:13,color:"#9ca3af"}}>{grupos[st].length} item{grupos[st].length>1?"s":""}</span></span>}>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Cliente","Camisa","Tam.","Qtd","Preço Venda","Custo","Status",""].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>{grupos[st].map(p=>{
              const ct=r(((p.custoProduto||0)+(p.custoTaxa||0))*(p.qtd||1));
              return(
                <HRow key={p.id}>
                  <td style={{...TD,color:"#9ca3af"}}>{p.data}</td>
                  <td style={{...TD,fontWeight:700,color:"#111"}}>{p.cliente||"—"}</td>
                  <td style={TD}>{p.time} {p.uniforme&&<span style={{color:"#9ca3af"}}>({p.uniforme})</span>}</td>
                  <td style={TD}>{p.tamanho}</td>
                  <td style={{...TD,textAlign:"center"}}>{p.qtd}</td>
                  <td style={{...TD,fontWeight:700}}>{brl(p.precoVenda)}</td>
                  <td style={TD}>{brl(ct)}</td>
                  <td style={TD}>
                    <select value={p.status} onChange={e=>mover(p.id,e.target.value)}
                      style={{...INP,width:160,padding:"5px 8px",fontSize:12}}>
                      {ST_FORN.map(s2=><option key={s2}>{s2}</option>)}
                    </select>
                  </td>
                  <td style={TD}><div style={{display:"flex",gap:5}}>
                    <Btn v="sm" onClick={()=>abrirE(p)}>✏</Btn>
                    <Btn v="danger" onClick={()=>del(p.id)}>🗑</Btn>
                  </div></td>
                </HRow>
              );
            })}</tbody>
          </table></div>
        </Section>
      ))}
      {(modal==="novo"||modal==="editar")&&(
        <Modal title={modal==="editar"?"Editar Pedido Fornecedor":"Novo Pedido Fornecedor"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <Field label="Data" half><Inp type="date" value={f.data} onChange={e=>s("data",e.target.value)}/></Field>
            <Field label="Status" half><Sel value={f.status} onChange={e=>s("status",e.target.value)}>{ST_FORN.map(st=><option key={st}>{st}</option>)}</Sel></Field>
            <Field label="Cliente (opcional)"><Inp value={f.cliente} onChange={e=>s("cliente",e.target.value)} placeholder="Se já tem cliente reservado"/></Field>
            <Field label="Time / Camisa" half>
              <Inp list="lst-tf" value={f.time} onChange={e=>s("time",e.target.value)} placeholder="ex: Bahia" autoFocus/>
              <datalist id="lst-tf">{times.map(t=><option key={t} value={t}/>)}</datalist>
            </Field>
            <Field label="Uniforme" half><Sel value={f.uniforme} onChange={e=>s("uniforme",e.target.value)}>{UNIFORMES.map(u=><option key={u}>{u}</option>)}</Sel></Field>
            <Field label="Tamanho" third><Sel value={f.tamanho} onChange={e=>s("tamanho",e.target.value)}>{TAMANHOS.map(t=><option key={t}>{t}</option>)}</Sel></Field>
            <Field label="Quantidade" third><Inp type="number" min="1" value={f.qtd} onChange={e=>n("qtd",e.target.value)}/></Field>
            <Field label="Preço de Venda unit." third><Inp type="number" min="0" step="0.01" value={f.precoVenda} onChange={e=>n("precoVenda",e.target.value)}/></Field>
            <Field label="Custo Produto unit." half><Inp type="number" min="0" step="0.01" value={f.custoProduto} onChange={e=>n("custoProduto",e.target.value)}/></Field>
            <Field label="Custo Taxa unit." half><Inp type="number" min="0" step="0.01" value={f.custoTaxa} onChange={e=>n("custoTaxa",e.target.value)}/></Field>
            <Field label="Observação"><Inp value={f.obs} onChange={e=>s("obs",e.target.value)} placeholder="ex: encomenda especial..."/></Field>
          </div>
          <MBtns onClose={()=>setModal(null)} onSave={salv}/>
        </Modal>
      )}
    </div>
  );
}
// ── ÍCONES (SVG inline, sem dependências) ──────────────────────
function Ico({path,size=18,color="currentColor",strokeW=2}){
  return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}
const ICONS = {
  dashboard:<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  estoque:<><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>,
  pedidos:<><circle cx="9" cy="21" r="1.5"/><circle cx="19" cy="21" r="1.5"/><path d="M2 3h2l2.4 12.4a2 2 0 002 1.6h9.2a2 2 0 002-1.6L22 7H6"/></>,
  gestao:<><rect x="3" y="3" width="6" height="6" rx="1.2"/><rect x="15" y="3" width="6" height="6" rx="1.2"/><rect x="3" y="15" width="6" height="6" rx="1.2"/><rect x="15" y="15" width="6" height="6" rx="1.2"/></>,
  custo:<><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
  caixa:<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>,
  tarefas:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 11l2 2 4-4"/></>,
  fornecedor:<><path d="M3 9l9-6 9 6"/><path d="M4 10v9h16v-9"/><path d="M9 19v-5h6v5"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></>,
  refresh:<><path d="M21 12a9 9 0 10-2.6 6.3"/><path d="M21 5v7h-7"/></>,
  bell:<><path d="M6 8a6 6 0 1112 0c0 4 1.5 5.5 1.5 6.5H4.5C4.5 13.5 6 12 6 8z"/><path d="M9.5 18a2.5 2.5 0 005 0"/></>,
  logout:<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></>,
};

function MenuIco({k,active}){
  return <Ico path={ICONS[k]} size={17} color={active?"#fff":"#9ca3af"} strokeW={1.8}/>;
}

// ── LOGIN ────────────────────────────────────────────────────
function Login({onLogin}){
  const [usuario,setUsuario]=useState("");
  const [senha,setSenha]=useState("");
  const [erro,setErro]=useState("");
  const [carregando,setCarregando]=useState(false);
  const entrar=()=>{
    setErro("");
    if(!usuario.trim()||!senha.trim()){setErro("Informe usuário e senha.");return;}
    setCarregando(true);
    setTimeout(()=>{
      if(usuario.trim().toLowerCase()===AUTH.usuario&&senha===AUTH.senha){
        onLogin();
      }else{
        setErro("Usuário ou senha incorretos.");
        setCarregando(false);
      }
    },350);
  };
  const onKey=e=>{if(e.key==="Enter")entrar();};
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0f0f 0%,#1a1a2e 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:"40px 36px",width:380,maxWidth:"95vw",
        boxShadow:"0 25px 60px rgba(0,0,0,0.35)"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:14,background:"#111",display:"flex",
            alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:14}}>⚽</div>
          <div style={{fontSize:20,fontWeight:900,color:"#111",letterSpacing:"-0.5px"}}>T11 Sports</div>
          <div style={{fontSize:12,color:"#9ca3af",fontWeight:700,letterSpacing:"0.5px",marginTop:2}}>GESTÃO DA LOJA</div>
        </div>
        {erro&&<Alert type="error">{erro}</Alert>}
        <div style={{marginBottom:14}}>
          <label style={LBL}>Usuário</label>
          <Inp value={usuario} onChange={e=>setUsuario(e.target.value)} onKeyDown={onKey}
            placeholder="Seu usuário" autoFocus/>
        </div>
        <div style={{marginBottom:22}}>
          <label style={LBL}>Senha</label>
          <Inp type="password" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={onKey}
            placeholder="Sua senha"/>
        </div>
        <Btn onClick={entrar} disabled={carregando} style={{width:"100%",justifyContent:"center"}}>
          {carregando?"Entrando...":"Entrar"}
        </Btn>
        <div style={{textAlign:"center",fontSize:11,color:"#d1d5db",marginTop:20}}>
          Dados salvos automaticamente neste dispositivo
        </div>
      </div>
    </div>
  );
}

// ── LAYOUT (Sidebar + Topbar) ──────────────────────────────────
const MENU_PRINCIPAL=[
  {k:"dashboard",l:"Dashboard",ico:"dashboard"},
  {k:"estoque",l:"Estoque",ico:"estoque"},
  {k:"pedidos",l:"Pedidos",ico:"pedidos"},
  {k:"gestao",l:"Gestão",ico:"gestao"},
];
const MENU_FINANCEIRO=[
  {k:"custo",l:"Custo / Lucro",ico:"custo"},
  {k:"caixa",l:"Caixa",ico:"caixa"},
];
const MENU_GESTAO=[
  {k:"tarefas",l:"Tarefas",ico:"tarefas"},
];

function MenuItem({item,active,onClick}){
  const [h,setH]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{display:"flex",alignItems:"center",gap:11,padding:"10px 16px",cursor:"pointer",
        borderRadius:8,margin:"2px 10px",background:active?"#111":h?"#f3f4f6":"transparent",
        transition:"all 0.15s"}}>
      <MenuIco k={item.ico} active={active}/>
      <span style={{fontSize:13,fontWeight:active?700:500,color:active?"#fff":"#374151"}}>{item.l}</span>
    </div>
  );
}

function MenuLabel({children}){
  return<div style={{fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",
    letterSpacing:"0.8px",padding:"18px 20px 6px"}}>{children}</div>;
}

function Sidebar({page,setPage,onLogout,open,onCloseMobile}){
  const ir=k=>{setPage(k);onCloseMobile&&onCloseMobile();};
  return(
    <div style={{width:230,minWidth:230,background:"#fff",borderRight:"1px solid #e5e7eb",
      display:"flex",flexDirection:"column",height:"100vh",flexShrink:0,
      position:"sticky",top:0,alignSelf:"flex-start",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"22px 20px 18px"}}>
        <div style={{width:38,height:38,borderRadius:10,background:"#111",display:"flex",
          alignItems:"center",justifyContent:"center",fontSize:18}}>⚽</div>
        <div>
          <div style={{fontSize:15,fontWeight:900,color:"#111",letterSpacing:"-0.3px"}}>T11 Sports</div>
          <div style={{fontSize:9.5,fontWeight:700,color:"#9ca3af",letterSpacing:"0.5px"}}>GESTÃO DA LOJA</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:10}}>
        <MenuLabel>Principal</MenuLabel>
        {MENU_PRINCIPAL.map(it=><MenuItem key={it.k} item={it} active={page===it.k} onClick={()=>ir(it.k)}/>)}
        <MenuLabel>Financeiro</MenuLabel>
        {MENU_FINANCEIRO.map(it=><MenuItem key={it.k} item={it} active={page===it.k} onClick={()=>ir(it.k)}/>)}
        <MenuLabel>Gestão</MenuLabel>
        {MENU_GESTAO.map(it=><MenuItem key={it.k} item={it} active={page===it.k} onClick={()=>ir(it.k)}/>)}
      </div>
      <div style={{borderTop:"1px solid #f3f4f6",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:"#111",color:"#fff",
          display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,
          flexShrink:0}}>F</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#111"}}>Fabrício</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>Administrador</div>
        </div>
        <button onClick={onLogout} title="Sair"
          style={{border:"none",background:"none",cursor:"pointer",padding:6,borderRadius:6,
            display:"flex",color:"#9ca3af"}}>
          <Ico path={ICONS.logout} size={17}/>
        </button>
      </div>
    </div>
  );
}

const PAGE_TITLES={
  dashboard:"Dashboard", estoque:"Estoque", pedidos:"Pedidos", gestao:"Gestão",
  custo:"Custo / Lucro", caixa:"Caixa", tarefas:"Tarefas", fornecedor:"Fornecedores",
};

function Topbar({page,busca,setBusca,onRefresh}){
  const [girando,setGirando]=useState(false);
  const refresh=()=>{setGirando(true);onRefresh&&onRefresh();setTimeout(()=>setGirando(false),500);};
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,
      padding:"16px 28px",borderBottom:"1px solid #e5e7eb",background:"#fff",
      position:"sticky",top:0,zIndex:50}}>
      <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
        <div style={{width:4,height:20,background:"#111",borderRadius:2}}/>
        <span style={{fontSize:17,fontWeight:800,color:"#111",whiteSpace:"nowrap"}}>{PAGE_TITLES[page]||""}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flex:1,justifyContent:"flex-end"}}>
        <div style={{position:"relative",width:240,maxWidth:"40vw"}}>
          <div style={{position:"absolute",left:11,top:0,bottom:0,display:"flex",alignItems:"center",color:"#9ca3af"}}>
            <Ico path={ICONS.search} size={15}/>
          </div>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar pedidos, produtos..."
            style={{...INP,paddingLeft:34,fontSize:12.5}}/>
        </div>
        <button onClick={refresh} title="Atualizar"
          style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,
            border:"1px solid #d1d5db",background:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,
            color:"#374151",whiteSpace:"nowrap"}}>
          <span style={{display:"flex",transition:"transform 0.5s",transform:girando?"rotate(360deg)":"none"}}>
            <Ico path={ICONS.refresh} size={15}/>
          </span>
          Atualizar
        </button>
        <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px 6px 8px",
          borderRadius:20,background:"#f9fafb",border:"1px solid #e5e7eb"}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"#16a34a"}}/>
          <span style={{fontSize:12,fontWeight:700,color:"#374151"}}>Fabrício</span>
        </div>
      </div>
    </div>
  );
}

// ── BUSCA GLOBAL (filtra produtos/pedidos pelo termo do topo) ──
function useBuscaGlobal(db,busca){
  return useMemo(()=>{
    if(!busca||!busca.trim())return null;
    const t=busca.toLowerCase();
    const produtos=db.produtos.filter(p=>(p.time||p.nome||"").toLowerCase().includes(t)||(p.cor||"").toLowerCase().includes(t));
    const pedidos=db.pedidos.filter(p=>(p.cliente||"").toLowerCase().includes(t)||(p.time||p.camisa||"").toLowerCase().includes(t));
    return{produtos,pedidos};
  },[db,busca]);
}

function BuscaResultados({resultado,onClose}){
  if(!resultado)return null;
  const total=resultado.produtos.length+resultado.pedidos.length;
  return(
    <div style={{margin:"0 28px 16px"}}>
      <Alert type="info">
        🔎 <strong>{total}</strong> resultado{total!==1?"s":""} encontrado{total!==1?"s":""}
        {total>0&&<span> — {resultado.produtos.length} produto(s), {resultado.pedidos.length} pedido(s)</span>}
        <button onClick={onClose} style={{marginLeft:"auto",border:"none",background:"none",
          cursor:"pointer",fontWeight:700,color:"#2563eb",fontSize:12}}>Limpar busca</button>
      </Alert>
    </div>
  );
}

// ── APP PRINCIPAL ────────────────────────────────────────────
export default function App(){
  const [logado,setLogado]=useState(()=>{try{return localStorage.getItem("t11_logado")==="1";}catch(_){return false;}});
  const [db,setDb]=useState(loadDB);
  const [page,setPage]=useState("dashboard");
  const [busca,setBusca]=useState("");
  const [modalPedido,setModalPedido]=useState(null);
  const [modalProduto,setModalProduto]=useState(null);

  useEffect(()=>{saveDB(db);},[db]);

  // Garante que a página ocupe 100% da tela e role corretamente,
  // sem precisar editar o index.html/CSS global do projeto.
  useEffect(()=>{
    const id="t11-global-reset";
    if(document.getElementById(id))return;
    const style=document.createElement("style");
    style.id=id;
    style.textContent=`
      html,body{margin:0;padding:0;height:100%;width:100%;}
      #root,#app,body>div:first-child{min-height:100vh;width:100%;}
      *{box-sizing:border-box;}
    `;
    document.head.appendChild(style);
  },[]);

  const resultadoBusca=useBuscaGlobal(db,busca);

  const login=()=>{try{localStorage.setItem("t11_logado","1");}catch(_){}setLogado(true);};
  const logout=()=>{if(!window.confirm("Deseja sair?"))return;try{localStorage.removeItem("t11_logado");}catch(_){}setLogado(false);};

  if(!logado)return <Login onLogin={login}/>;

  const addPedido=()=>setModalPedido({modo:"novo"});
  const editPedido=p=>setModalPedido({modo:"editar",item:p});
  const delPedido=id=>{if(!window.confirm("Excluir pedido?"))return;setDb(prev=>({...prev,pedidos:prev.pedidos.filter(p=>p.id!==id)}));};
  const salvarPedido=f=>{
    setDb(prev=>{
      if(modalPedido?.modo==="editar")return{...prev,pedidos:prev.pedidos.map(p=>p.id===f.id?f:p)};
      const id=prev.nextId+1;return{...prev,nextId:id,pedidos:[...prev.pedidos,{...f,id}]};
    });
    setModalPedido(null);
  };
  const updateMeta=m=>setDb(prev=>({...prev,meta:m}));

  const addProduto=()=>setModalProduto({modo:"novo"});
  const editProduto=p=>setModalProduto({modo:"editar",item:p});
  const delProduto=id=>{if(!window.confirm("Excluir produto?"))return;setDb(prev=>({...prev,produtos:prev.produtos.filter(p=>p.id!==id)}));};
  const salvarProduto=f=>{
    setDb(prev=>{
      if(modalProduto?.modo==="editar")return{...prev,produtos:prev.produtos.map(p=>p.id===f.id?f:p)};
      const id=prev.nextId+1;return{...prev,nextId:id,produtos:[...prev.produtos,{...f,id}]};
    });
    setModalProduto(null);
  };

  const renderPage=()=>{
    switch(page){
      case "dashboard": return <PageDashboard db={db} setDb={setDb}/>;
      case "estoque": return <PageEstoque db={db} onAdd={addProduto} onEdit={editProduto} onDelete={delProduto}/>;
      case "pedidos": return <PagePedidos db={db} onAdd={addPedido} onEdit={editPedido} onDelete={delPedido} onUpdateMeta={updateMeta}/>;
      case "gestao": return <PageGestao db={db} onEdit={editPedido} onAdd={addPedido}/>;
      case "custo": return <PageCusto db={db} setDb={setDb}/>;
      case "caixa": return <PageCaixa db={db} setDb={setDb}/>;
      case "tarefas": return <PageTarefas db={db} setDb={setDb}/>;
      case "fornecedor": return <PageFornecedor db={db} setDb={setDb}/>;
      default: return null;
    }
  };

  return(
    <div style={{display:"flex",width:"100%",minHeight:"100vh",background:"#f6f7f9",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"}}>
      <Sidebar page={page} setPage={setPage} onLogout={logout}/>
      <div style={{flex:"1 1 auto",minWidth:0,width:"100%",display:"flex",flexDirection:"column"}}>
        <Topbar page={page} busca={busca} setBusca={setBusca} onRefresh={()=>setDb(loadDB())}/>
        <BuscaResultados resultado={resultadoBusca} onClose={()=>setBusca("")}/>
        <div style={{padding:"20px 28px 48px",flex:1,width:"100%",boxSizing:"border-box"}}>
          {renderPage()}
        </div>
      </div>

      {modalPedido&&(
        <Modal title={modalPedido.modo==="editar"?"Editar Pedido":"Novo Pedido"} onClose={()=>setModalPedido(null)} wide>
          <FormPedido inicial={modalPedido.item} produtos={db.produtos}
            onSave={salvarPedido} onClose={()=>setModalPedido(null)}/>
        </Modal>
      )}
      {modalProduto&&(
        <Modal title={modalProduto.modo==="editar"?"Editar Produto":"Novo Produto"} onClose={()=>setModalProduto(null)} wide>
          <FormProduto inicial={modalProduto.item}
            onSave={salvarProduto} onClose={()=>setModalProduto(null)}/>
        </Modal>
      )}
    </div>
  );
}
