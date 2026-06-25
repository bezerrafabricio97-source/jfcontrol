// JF CONTROL — Gestão de Loja de Camisas de Time
// Desenvolvido para ser editável, expansível e com dados persistentes via localStorage
// Para rodar: cole no claude.ai como artifact React, ou use Vite + React localmente
// ============================================================
// ESTRUTURA DO BANCO DE DADOS (localStorage key: "jfcontrol_db")
// {
//   produtos: [...],    → estoque de camisas
//   pedidos: [...],     → histórico de vendas
//   meta: {...},        → metas mensais editáveis
//   nextId: number      → controle de IDs únicos
// }
// ============================================================

import { useState, useEffect, useCallback } from "react";

// ──────────────────────────────────────────────────────────
// CONSTANTES E HELPERS
// ──────────────────────────────────────────────────────────
const DB_KEY = "jfcontrol_db";
const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG", "Único"];
const STATUS_PEDIDO = ["Produzir", "Pronto", "Enviado", "Entregue", "Cancelado", "Atrasado"];
const STATUS_COLORS = {
  Produzir:  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  Pronto:    { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Enviado:   { bg: "#fefce8", text: "#a16207", border: "#fde68a" },
  Entregue:  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  Cancelado: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  Atrasado:  { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

const R = (n) => Number((n || 0).toFixed(2));
const BRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (n) => `${(n || 0).toFixed(1)}%`;
const today = () => new Date().toISOString().slice(0, 10);
const mesAtual = () => new Date().toISOString().slice(0, 7);

const DEFAULT_DB = {
  produtos: [
    { id: 1, nome: "Camisa Flamengo", tamanho: "M", cor: "Vermelho/Preto", categoria: "Time", fornecedor: "Sport Print", qtd: 5, qtdMin: 2, custoProduto: 35.0, custoTaxa: 2.5, precoVenda: 89.9 },
    { id: 2, nome: "Camisa Flamengo", tamanho: "G", cor: "Vermelho/Preto", categoria: "Time", fornecedor: "Sport Print", qtd: 3, qtdMin: 2, custoProduto: 35.0, custoTaxa: 2.5, precoVenda: 89.9 },
    { id: 3, nome: "Camisa Vasco",    tamanho: "M", cor: "Branco/Preto",   categoria: "Time", fornecedor: "Sport Print", qtd: 1, qtdMin: 2, custoProduto: 32.0, custoTaxa: 2.0, precoVenda: 85.0 },
    { id: 4, nome: "Camisa Brasil",   tamanho: "GG", cor: "Amarelo/Verde", categoria: "Seleção", fornecedor: "Nacional Print", qtd: 0, qtdMin: 3, custoProduto: 40.0, custoTaxa: 3.0, precoVenda: 99.9 },
  ],
  pedidos: [
    { id: 101, data: "2026-06-20", cliente: "João Silva",   camisa: "Camisa Flamengo", tamanho: "M", qtd: 1, custoProduto: 35.0, custoTaxa: 2.5, precoVenda: 89.9, status: "Entregue" },
    { id: 102, data: "2026-06-24", cliente: "Maria Souza",  camisa: "Camisa Brasil",   tamanho: "GG", qtd: 2, custoProduto: 40.0, custoTaxa: 3.0, precoVenda: 99.9, status: "Produzir" },
  ],
  meta: { pedidos: 50, receita: 5000, lucro: 2000 },
  nextId: 200,
};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ──────────────────────────────────────────────────────────
// COMPONENTES BASE
// ──────────────────────────────────────────────────────────

function Badge({ status }) {
  const c = STATUS_COLORS[status] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap"
    }}>{status}</span>
  );
}

function ProgressBar({ value, max, color = "#1e3a8a" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden", margin: "6px 0 2px" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s" }} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
        width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "#111827", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const FIELD_STYLE = {
  width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8,
  fontSize: 13, color: "#111827", background: "#fff", boxSizing: "border-box"
};
const LABEL_STYLE = { fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 5 };

function Field({ label, children, half }) {
  return (
    <div style={{ flex: half ? "0 0 calc(50% - 6px)" : "1 1 100%", minWidth: 0, marginBottom: 14 }}>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return <input style={FIELD_STYLE} {...props} />;
}

function Select({ children, ...props }) {
  return <select style={FIELD_STYLE} {...props}>{children}</select>;
}

function ModalActions({ onClose, onSave, saveLabel = "Salvar" }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
      <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, color: "#374151" }}>
        Cancelar
      </button>
      <button onClick={onSave} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#1e3a8a", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
        {saveLabel}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// FORMULÁRIO DE PRODUTO
// ──────────────────────────────────────────────────────────
function FormProduto({ inicial, onSave, onClose }) {
  const [f, setF] = useState(inicial || {
    nome: "", tamanho: "M", cor: "", categoria: "", fornecedor: "",
    qtd: 0, qtdMin: 2, custoProduto: 0, custoTaxa: 0, precoVenda: 0
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k, v) => set(k, parseFloat(v) || 0);

  const custoTotal = R(f.custoProduto + f.custoTaxa);
  const margem = f.precoVenda > 0 ? R(((f.precoVenda - custoTotal) / f.precoVenda) * 100) : 0;
  const lucro = R(f.precoVenda - custoTotal);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Field label="Nome da camisa"><Input value={f.nome} onChange={e => set("nome", e.target.value)} placeholder="ex: Camisa Flamengo" /></Field>
        <Field label="Tamanho" half><Select value={f.tamanho} onChange={e => set("tamanho", e.target.value)}>{TAMANHOS.map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Cor" half><Input value={f.cor} onChange={e => set("cor", e.target.value)} placeholder="ex: Vermelho/Preto" /></Field>
        <Field label="Categoria" half><Input value={f.categoria} onChange={e => set("categoria", e.target.value)} placeholder="ex: Time, Seleção" /></Field>
        <Field label="Fornecedor" half><Input value={f.fornecedor} onChange={e => set("fornecedor", e.target.value)} placeholder="ex: Sport Print" /></Field>
        <Field label="Qtd em estoque" half><Input type="number" min="0" value={f.qtd} onChange={e => num("qtd", e.target.value)} /></Field>
        <Field label="Qtd mínima (alerta)" half><Input type="number" min="0" value={f.qtdMin} onChange={e => num("qtdMin", e.target.value)} /></Field>
        <Field label="Custo do produto (R$)" half><Input type="number" min="0" step="0.01" value={f.custoProduto} onChange={e => num("custoProduto", e.target.value)} /></Field>
        <Field label="Custo de taxa (R$)" half><Input type="number" min="0" step="0.01" value={f.custoTaxa} onChange={e => num("custoTaxa", e.target.value)} /></Field>
        <Field label="Preço de venda (R$)"><Input type="number" min="0" step="0.01" value={f.precoVenda} onChange={e => num("precoVenda", e.target.value)} /></Field>
      </div>

      <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 24 }}>
        <div><span style={{ fontSize: 11, color: "#6b7280" }}>CUSTO TOTAL</span><div style={{ fontWeight: 600, color: "#111827" }}>{BRL(custoTotal)}</div></div>
        <div><span style={{ fontSize: 11, color: "#6b7280" }}>MARGEM</span><div style={{ fontWeight: 600, color: margem >= 30 ? "#15803d" : margem >= 15 ? "#a16207" : "#b91c1c" }}>{PCT(margem)}</div></div>
        <div><span style={{ fontSize: 11, color: "#6b7280" }}>LUCRO UNIT.</span><div style={{ fontWeight: 600, color: lucro >= 0 ? "#15803d" : "#b91c1c" }}>{BRL(lucro)}</div></div>
      </div>

      <ModalActions onClose={onClose} onSave={() => onSave(f)} />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// FORMULÁRIO DE PEDIDO
// ──────────────────────────────────────────────────────────
function FormPedido({ inicial, produtos, onSave, onClose }) {
  const [f, setF] = useState(inicial || {
    data: today(), cliente: "", camisa: "", tamanho: "M", qtd: 1,
    custoProduto: 0, custoTaxa: 0, precoVenda: 0, status: "Produzir"
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k, v) => set(k, parseFloat(v) || 0);

  // Auto-preencher ao selecionar produto
  const preencherProduto = (nome) => {
    const prod = produtos.find(p => p.nome === nome);
    if (prod) {
      setF(p => ({ ...p, camisa: nome, custoProduto: prod.custoProduto, custoTaxa: prod.custoTaxa, precoVenda: prod.precoVenda, tamanho: prod.tamanho }));
    } else {
      set("camisa", nome);
    }
  };

  const custoTotal = R((f.custoProduto + f.custoTaxa) * f.qtd);
  const receita = R(f.precoVenda * f.qtd);
  const lucro = R(receita - custoTotal);
  const margem = receita > 0 ? R((lucro / receita) * 100) : 0;

  const nomesUnicos = [...new Set(produtos.map(p => p.nome))];

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Field label="Data" half><Input type="date" value={f.data} onChange={e => set("data", e.target.value)} /></Field>
        <Field label="Status" half>
          <Select value={f.status} onChange={e => set("status", e.target.value)}>
            {STATUS_PEDIDO.map(s => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Nome do cliente"><Input value={f.cliente} onChange={e => set("cliente", e.target.value)} placeholder="Nome completo" /></Field>
        <Field label="Camisa" half>
          <Input list="lista-camisas" value={f.camisa} onChange={e => preencherProduto(e.target.value)} placeholder="Nome da camisa" />
          <datalist id="lista-camisas">{nomesUnicos.map(n => <option key={n} value={n} />)}</datalist>
        </Field>
        <Field label="Tamanho" half>
          <Select value={f.tamanho} onChange={e => set("tamanho", e.target.value)}>
            {TAMANHOS.map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Quantidade" half><Input type="number" min="1" value={f.qtd} onChange={e => num("qtd", e.target.value)} /></Field>
        <Field label="Preço de venda unit. (R$)" half><Input type="number" min="0" step="0.01" value={f.precoVenda} onChange={e => num("precoVenda", e.target.value)} /></Field>
        <Field label="Custo do produto unit. (R$)" half><Input type="number" min="0" step="0.01" value={f.custoProduto} onChange={e => num("custoProduto", e.target.value)} /></Field>
        <Field label="Custo de taxa unit. (R$)" half><Input type="number" min="0" step="0.01" value={f.custoTaxa} onChange={e => num("custoTaxa", e.target.value)} /></Field>
      </div>

      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div><span style={{ fontSize: 11, color: "#6b7280" }}>RECEITA</span><div style={{ fontWeight: 600, color: "#111827" }}>{BRL(receita)}</div></div>
        <div><span style={{ fontSize: 11, color: "#6b7280" }}>CUSTO TOTAL</span><div style={{ fontWeight: 600, color: "#c2410c" }}>{BRL(custoTotal)}</div></div>
        <div><span style={{ fontSize: 11, color: "#6b7280" }}>LUCRO LÍQ.</span><div style={{ fontWeight: 600, color: lucro >= 0 ? "#15803d" : "#b91c1c" }}>{BRL(lucro)}</div></div>
        <div><span style={{ fontSize: 11, color: "#6b7280" }}>MARGEM</span><div style={{ fontWeight: 600, color: margem >= 30 ? "#15803d" : margem >= 15 ? "#a16207" : "#b91c1c" }}>{PCT(margem)}</div></div>
      </div>

      <ModalActions onClose={onClose} onSave={() => onSave(f)} />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// PÁGINA: DASHBOARD
// ──────────────────────────────────────────────────────────
function PageDashboard({ db }) {
  const mes = mesAtual();
  const pedMes = db.pedidos.filter(p => p.data?.startsWith(mes));

  const receita   = pedMes.reduce((a, p) => a + p.precoVenda * p.qtd, 0);
  const custo     = pedMes.reduce((a, p) => a + (p.custoProduto + p.custoTaxa) * p.qtd, 0);
  const lucro     = R(receita - custo);
  const margem    = receita > 0 ? R((lucro / receita) * 100) : 0;
  const ticket    = pedMes.length > 0 ? R(receita / pedMes.length) : 0;
  const baixos    = db.produtos.filter(p => p.qtd <= p.qtdMin);
  const produzir  = db.pedidos.filter(p => p.status === "Produzir").length;
  const pronto    = db.pedidos.filter(p => p.status === "Pronto").length;
  const atrasados = db.pedidos.filter(p => p.status === "Atrasado").length;

  const now = new Date();
  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dataFormatada = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const KPI = ({ label, value, color = "#111827", sub }) => (
    <div style={{ flex: 1, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      {/* Greeting */}
      <div style={{ background: "#0f1117", borderRadius: 12, padding: "20px 28px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#fff" }}>Olá, JF Control 👋</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 3, textTransform: "capitalize" }}>{dataFormatada}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", letterSpacing: "-1px" }}>{hora}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{now.getDate()} de {now.toLocaleString("pt-BR", { month: "long" })} de {now.getFullYear()}</div>
        </div>
      </div>

      {/* Alertas */}
      {baixos.length > 0 && (
        <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#92400e", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>⚠ Estoque baixo:</span>
          {baixos.slice(0, 5).map(p => (
            <span key={p.id} style={{ background: "#fef9c3", borderRadius: 6, padding: "1px 8px", fontSize: 12, fontWeight: 600 }}>{p.nome} {p.tamanho} ({p.qtd} un.)</span>
          ))}
          {baixos.length > 5 && <span>+{baixos.length - 5} mais</span>}
        </div>
      )}

      {/* KPIs operacionais */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <KPI label="Produzir" value={produzir} color="#c2410c" />
        <KPI label="Pronto p/ entregar" value={pronto} color="#1d4ed8" />
        <KPI label="Pedidos este mês" value={pedMes.length} color="#111827" />
        <KPI label="Atrasados" value={atrasados} color="#b91c1c" />
      </div>

      {/* Meta */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          🎯 Meta de {mes}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          {[
            { label: "Pedidos", atual: pedMes.length, meta: db.meta.pedidos, fmt: (v) => v, color: "#1e3a8a" },
            { label: "Receita", atual: receita, meta: db.meta.receita, fmt: BRL, color: "#15803d" },
            { label: "Lucro", atual: lucro, meta: db.meta.lucro, fmt: BRL, color: lucro >= 0 ? "#15803d" : "#b91c1c" },
          ].map(({ label, atual, meta, fmt, color }) => {
            const pct = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;
            const barColor = atual < 0 ? "#b91c1c" : color;
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 2 }}>
                  <span>{label}: <strong style={{ color: "#111827" }}>{fmt(atual)}</strong> / {fmt(meta)}</span>
                  <span style={{ color: pct >= 100 ? "#15803d" : "#6b7280" }}>{pct.toFixed(0)}%</span>
                </div>
                <ProgressBar value={Math.max(0, atual)} max={meta} color={barColor} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Desempenho */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", marginBottom: 14 }}>📊 Desempenho — Mês Atual</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          {[
            { label: "Pedidos", value: pedMes.length, dark: true },
            { label: "Receita", value: BRL(receita), green: true },
            { label: "Lucro líquido", value: BRL(lucro), color: lucro >= 0 ? "#15803d" : "#b91c1c" },
            { label: "Margem", value: PCT(margem), color: margem < 0 ? "#b91c1c" : margem < 20 ? "#c2410c" : "#15803d" },
            { label: "Ticket médio", value: BRL(ticket), color: "#111827" },
            { label: "Estoque baixo", value: `${baixos.length} itens`, color: baixos.length > 0 ? "#b91c1c" : "#15803d" },
          ].map(({ label, value, dark, green, color }) => (
            <div key={label} style={{
              background: dark ? "#0f1117" : green ? "#15803d" : "#fff",
              border: dark || green ? "none" : "1px solid #e5e7eb",
              borderRadius: 10, padding: "14px 12px"
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: dark || green ? "rgba(255,255,255,0.6)" : "#9ca3af", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: dark || green ? "#fff" : (color || "#111827") }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Últimos pedidos */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", marginBottom: 14 }}>🕐 Últimos pedidos</div>
        {db.pedidos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>Nenhum pedido ainda</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["Data", "Cliente", "Camisa", "Tam.", "Qtd", "Receita", "Lucro", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid #f3f4f6" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[...db.pedidos].reverse().slice(0, 6).map(p => {
                const rec = R(p.precoVenda * p.qtd);
                const luc = R(rec - (p.custoProduto + p.custoTaxa) * p.qtd);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                    <td style={{ padding: "9px 10px", color: "#6b7280" }}>{p.data}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 600, color: "#111827" }}>{p.cliente}</td>
                    <td style={{ padding: "9px 10px", color: "#374151" }}>{p.camisa}</td>
                    <td style={{ padding: "9px 10px", color: "#374151" }}>{p.tamanho}</td>
                    <td style={{ padding: "9px 10px", color: "#374151" }}>{p.qtd}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 600, color: "#111827" }}>{BRL(rec)}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 600, color: luc >= 0 ? "#15803d" : "#b91c1c" }}>{BRL(luc)}</td>
                    <td style={{ padding: "9px 10px" }}><Badge status={p.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// PÁGINA: ESTOQUE
// ──────────────────────────────────────────────────────────
function PageEstoque({ db, onAdd, onEdit, onDelete }) {
  const [busca, setBusca] = useState("");
  const baixos = db.produtos.filter(p => p.qtd <= p.qtdMin);
  const totalPecas = db.produtos.reduce((a, p) => a + p.qtd, 0);
  const valorEstoque = db.produtos.reduce((a, p) => a + p.qtd * p.custoProduto, 0);

  const filtrados = db.produtos.filter(p =>
    !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.cor.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      {baixos.length > 0 && (
        <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#92400e", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>⚠ Estoque baixo:</span>
          {baixos.map(p => <span key={p.id} style={{ background: "#fef9c3", borderRadius: 6, padding: "1px 8px", fontSize: 12 }}>{p.nome} {p.tamanho} ({p.qtd} un.)</span>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total de peças", value: totalPecas },
          { label: "Itens com estoque baixo", value: baixos.length, color: baixos.length > 0 ? "#a16207" : undefined },
          { label: "Valor em estoque", value: BRL(valorEstoque) },
          { label: "Produtos cadastrados", value: db.produtos.length },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, background: "#f9fafb", borderRadius: 10, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || "#111827" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{filtrados.length} produtos</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." style={{ ...FIELD_STYLE, width: 200 }} />
            <button onClick={onAdd} style={{ padding: "8px 18px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              + Produto
            </button>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Nenhum produto encontrado</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Produto", "Tam.", "Cor", "Categoria", "Fornecedor", "Qtd", "Custo Prod.", "Custo Taxa", "Custo Total", "Preço Venda", "Margem", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const custoTotal = R(p.custoProduto + p.custoTaxa);
                  const margem = p.precoVenda > 0 ? R(((p.precoVenda - custoTotal) / p.precoVenda) * 100) : 0;
                  const stColor = p.qtd === 0 ? "#b91c1c" : p.qtd <= p.qtdMin ? "#a16207" : "#15803d";
                  const stLabel = p.qtd === 0 ? "Sem estoque" : p.qtd <= p.qtdMin ? "Baixo" : "OK";
                  const stBg = p.qtd === 0 ? "#fef2f2" : p.qtd <= p.qtdMin ? "#fefce8" : "#f0fdf4";
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td style={{ padding: "9px 10px", fontWeight: 600, color: "#111827" }}>{p.nome}</td>
                      <td style={{ padding: "9px 10px" }}>{p.tamanho}</td>
                      <td style={{ padding: "9px 10px", color: "#6b7280" }}>{p.cor}</td>
                      <td style={{ padding: "9px 10px", color: "#6b7280" }}>{p.categoria}</td>
                      <td style={{ padding: "9px 10px", color: "#6b7280" }}>{p.fornecedor}</td>
                      <td style={{ padding: "9px 10px", fontWeight: 700, color: stColor }}>{p.qtd} <span style={{ fontSize: 10, color: "#9ca3af" }}>min {p.qtdMin}</span></td>
                      <td style={{ padding: "9px 10px" }}>{BRL(p.custoProduto)}</td>
                      <td style={{ padding: "9px 10px" }}>{BRL(p.custoTaxa)}</td>
                      <td style={{ padding: "9px 10px", fontWeight: 600, color: "#c2410c" }}>{BRL(custoTotal)}</td>
                      <td style={{ padding: "9px 10px", fontWeight: 600 }}>{BRL(p.precoVenda)}</td>
                      <td style={{ padding: "9px 10px" }}>
                        <span style={{ background: margem >= 30 ? "#f0fdf4" : margem >= 15 ? "#fefce8" : "#fef2f2", color: margem >= 30 ? "#15803d" : margem >= 15 ? "#a16207" : "#b91c1c", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{PCT(margem)}</span>
                      </td>
                      <td style={{ padding: "9px 10px" }}>
                        <span style={{ background: stBg, color: stColor, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{stLabel}</span>
                      </td>
                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => onEdit(p)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, color: "#374151" }}>Editar</button>
                          <button onClick={() => onDelete(p.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", fontSize: 12, color: "#b91c1c" }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// PÁGINA: PEDIDOS
// ──────────────────────────────────────────────────────────
function PagePedidos({ db, onAdd, onEdit, onDelete, onUpdateMeta }) {
  const [filtro, setFiltro] = useState("mes");
  const [busca, setBusca] = useState("");
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaTemp, setMetaTemp] = useState({ ...db.meta });

  const mes = mesAtual();
  const hoje = today();
  const inicioSemana = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); })();

  const filtrados = db.pedidos.filter(p => {
    const matchFiltro =
      filtro === "todos" ? true :
      filtro === "hoje" ? p.data === hoje :
      filtro === "semana" ? p.data >= inicioSemana :
      filtro === "mes" ? p.data?.startsWith(mes) : true;
    const matchBusca = !busca || p.cliente.toLowerCase().includes(busca.toLowerCase()) || p.camisa.toLowerCase().includes(busca.toLowerCase());
    return matchFiltro && matchBusca;
  });

  const pedMes = db.pedidos.filter(p => p.data?.startsWith(mes));
  const receitaMes = pedMes.reduce((a, p) => a + p.precoVenda * p.qtd, 0);
  const custoMes = pedMes.reduce((a, p) => a + (p.custoProduto + p.custoTaxa) * p.qtd, 0);
  const lucroMes = R(receitaMes - custoMes);

  const FILTROS = [
    { key: "hoje", label: "Hoje" },
    { key: "semana", label: "Esta semana" },
    { key: "mes", label: "Este mês" },
    { key: "todos", label: "Todos" },
  ];

  return (
    <div>
      {/* Meta mensal */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>🎯 Meta de {mes}</div>
          <button onClick={() => { setMetaTemp({ ...db.meta }); setEditandoMeta(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12, color: "#374151" }}>
            Editar Meta
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          {[
            { label: "Pedidos", atual: pedMes.length, meta: db.meta.pedidos, fmt: v => v, color: "#1e3a8a" },
            { label: "Receita", atual: receitaMes, meta: db.meta.receita, fmt: BRL, color: "#15803d" },
            { label: "Lucro", atual: lucroMes, meta: db.meta.lucro, fmt: BRL, color: lucroMes >= 0 ? "#15803d" : "#b91c1c" },
          ].map(({ label, atual, meta, fmt, color }) => {
            const pct = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 2 }}>
                  <span>{label}: <strong style={{ color }}>{fmt(atual)}</strong> / {fmt(meta)}</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <ProgressBar value={Math.max(0, atual)} max={meta} color={color} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {FILTROS.map(({ key, label }) => (
              <button key={key} onClick={() => setFiltro(key)} style={{
                padding: "6px 14px", borderRadius: 20, border: `1px solid ${filtro === key ? "#1e3a8a" : "#e5e7eb"}`,
                background: filtro === key ? "#1e3a8a" : "#fff", color: filtro === key ? "#fff" : "#374151",
                cursor: "pointer", fontSize: 12, fontWeight: filtro === key ? 600 : 400
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente ou camisa..." style={{ ...FIELD_STYLE, width: 220 }} />
            <button onClick={onAdd} style={{ padding: "8px 18px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              + Pedido
            </button>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Nenhum pedido encontrado</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Data", "Cliente", "Camisa", "Tam.", "Qtd", "Custo Unit.", "Preço Venda", "Receita", "Custo Total", "Lucro Líq.", "Margem", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {[...filtrados].reverse().map(p => {
                  const custoUnit = R(p.custoProduto + p.custoTaxa);
                  const receita = R(p.precoVenda * p.qtd);
                  const custo = R(custoUnit * p.qtd);
                  const lucro = R(receita - custo);
                  const margem = receita > 0 ? R((lucro / receita) * 100) : 0;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td style={{ padding: "9px 10px", color: "#6b7280" }}>{p.data}</td>
                      <td style={{ padding: "9px 10px", fontWeight: 600, color: "#111827" }}>{p.cliente}</td>
                      <td style={{ padding: "9px 10px", color: "#374151" }}>{p.camisa}</td>
                      <td style={{ padding: "9px 10px", color: "#374151" }}>{p.tamanho}</td>
                      <td style={{ padding: "9px 10px", textAlign: "center" }}>{p.qtd}</td>
                      <td style={{ padding: "9px 10px", color: "#c2410c" }}>{BRL(custoUnit)}</td>
                      <td style={{ padding: "9px 10px", fontWeight: 600 }}>{BRL(p.precoVenda)}</td>
                      <td style={{ padding: "9px 10px", fontWeight: 700, color: "#111827" }}>{BRL(receita)}</td>
                      <td style={{ padding: "9px 10px", color: "#c2410c" }}>{BRL(custo)}</td>
                      <td style={{ padding: "9px 10px", fontWeight: 700, color: lucro >= 0 ? "#15803d" : "#b91c1c" }}>{BRL(lucro)}</td>
                      <td style={{ padding: "9px 10px" }}>
                        <span style={{ background: margem >= 30 ? "#f0fdf4" : margem >= 15 ? "#fefce8" : "#fef2f2", color: margem >= 30 ? "#15803d" : margem >= 15 ? "#a16207" : "#b91c1c", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{PCT(margem)}</span>
                      </td>
                      <td style={{ padding: "9px 10px" }}><Badge status={p.status} /></td>
                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => onEdit(p)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12 }}>Editar</button>
                          <button onClick={() => onDelete(p.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", fontSize: 12, color: "#b91c1c" }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal editar meta */}
      {editandoMeta && (
        <Modal title="Editar Meta Mensal" onClose={() => setEditandoMeta(false)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Field label="Meta de pedidos" half><Input type="number" min="0" value={metaTemp.pedidos} onChange={e => setMetaTemp(m => ({ ...m, pedidos: parseInt(e.target.value) || 0 }))} /></Field>
            <Field label="Meta de receita (R$)" half><Input type="number" min="0" step="0.01" value={metaTemp.receita} onChange={e => setMetaTemp(m => ({ ...m, receita: parseFloat(e.target.value) || 0 }))} /></Field>
            <Field label="Meta de lucro (R$)" half><Input type="number" min="0" step="0.01" value={metaTemp.lucro} onChange={e => setMetaTemp(m => ({ ...m, lucro: parseFloat(e.target.value) || 0 }))} /></Field>
          </div>
          <ModalActions onClose={() => setEditandoMeta(false)} onSave={() => { onUpdateMeta(metaTemp); setEditandoMeta(false); }} saveLabel="Salvar meta" />
        </Modal>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// PÁGINA: CUSTO / LUCRO
// ──────────────────────────────────────────────────────────
function PageCusto({ db }) {
  const pedidos = db.pedidos;
  const receita = pedidos.reduce((a, p) => a + p.precoVenda * p.qtd, 0);
  const custo   = pedidos.reduce((a, p) => a + (p.custoProduto + p.custoTaxa) * p.qtd, 0);
  const lucro   = R(receita - custo);
  const margem  = receita > 0 ? R((lucro / receita) * 100) : 0;
  const ticket  = pedidos.length > 0 ? R(receita / pedidos.length) : 0;

  // Agrupar por camisa
  const porCamisa = {};
  pedidos.forEach(p => {
    const key = `${p.camisa} ${p.tamanho}`;
    if (!porCamisa[key]) porCamisa[key] = { receita: 0, custo: 0, qtd: 0 };
    porCamisa[key].receita += p.precoVenda * p.qtd;
    porCamisa[key].custo += (p.custoProduto + p.custoTaxa) * p.qtd;
    porCamisa[key].qtd += p.qtd;
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Receita total", value: BRL(receita), color: "#15803d" },
          { label: "Custo total", value: BRL(custo), color: "#c2410c" },
          { label: "Lucro líquido", value: BRL(lucro), color: lucro >= 0 ? "#15803d" : "#b91c1c" },
          { label: "Margem geral", value: PCT(margem), color: margem < 0 ? "#b91c1c" : margem < 20 ? "#c2410c" : "#15803d" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", marginBottom: 14 }}>Lucratividade por produto</div>
        {Object.keys(porCamisa).length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Nenhum dado ainda</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["Produto", "Qtd vendida", "Receita", "Custo", "Lucro", "Margem"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid #f3f4f6" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {Object.entries(porCamisa).sort((a, b) => b[1].receita - a[1].receita).map(([nome, d]) => {
                const luc = R(d.receita - d.custo);
                const marg = d.receita > 0 ? R((luc / d.receita) * 100) : 0;
                return (
                  <tr key={nome} style={{ borderBottom: "1px solid #f9fafb" }}>
                    <td style={{ padding: "9px 10px", fontWeight: 600, color: "#111827" }}>{nome}</td>
                    <td style={{ padding: "9px 10px", textAlign: "center" }}>{d.qtd}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 600 }}>{BRL(d.receita)}</td>
                    <td style={{ padding: "9px 10px", color: "#c2410c" }}>{BRL(d.custo)}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 700, color: luc >= 0 ? "#15803d" : "#b91c1c" }}>{BRL(luc)}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ background: marg >= 30 ? "#f0fdf4" : marg >= 15 ? "#fefce8" : "#fef2f2", color: marg >= 30 ? "#15803d" : marg >= 15 ? "#a16207" : "#b91c1c", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{PCT(marg)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", marginBottom: 14 }}>Resumo geral</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            ["Total de pedidos", pedidos.length],
            ["Ticket médio", BRL(ticket)],
            ["Total de peças vendidas", pedidos.reduce((a, p) => a + p.qtd, 0)],
            ["Custo médio por pedido", BRL(pedidos.length > 0 ? R(custo / pedidos.length) : 0)],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// APP PRINCIPAL
// ──────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState(loadDB);
  const [pagina, setPagina] = useState("dashboard");
  const [modal, setModal] = useState(null); // { tipo: 'produto'|'pedido', dados: objeto|null }

  // Persistência automática ao mudar db
  useEffect(() => { saveDB(db); }, [db]);

  const nextId = useCallback(() => {
    let id;
    setDb(prev => { id = prev.nextId + 1; return { ...prev, nextId: id }; });
    return db.nextId + 1;
  }, [db.nextId]);

  // CRUD Produtos
  const salvarProduto = (dados) => {
    setDb(prev => {
      if (dados.id) {
        return { ...prev, produtos: prev.produtos.map(p => p.id === dados.id ? dados : p) };
      }
      const novoId = prev.nextId + 1;
      return { ...prev, nextId: novoId, produtos: [...prev.produtos, { ...dados, id: novoId }] };
    });
    setModal(null);
  };

  const excluirProduto = (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    setDb(prev => ({ ...prev, produtos: prev.produtos.filter(p => p.id !== id) }));
  };

  // CRUD Pedidos
  const salvarPedido = (dados) => {
    setDb(prev => {
      if (dados.id) {
        return { ...prev, pedidos: prev.pedidos.map(p => p.id === dados.id ? dados : p) };
      }
      const novoId = prev.nextId + 1;
      return { ...prev, nextId: novoId, pedidos: [...prev.pedidos, { ...dados, id: novoId }] };
    });
    setModal(null);
  };

  const excluirPedido = (id) => {
    if (!window.confirm("Excluir este pedido?")) return;
    setDb(prev => ({ ...prev, pedidos: prev.pedidos.filter(p => p.id !== id) }));
  };

  const atualizarMeta = (meta) => {
    setDb(prev => ({ ...prev, meta }));
  };

  const PAGINAS = [
    { key: "dashboard", label: "Dashboard",   icon: "⬛" },
    { key: "estoque",   label: "Estoque",      icon: "📦" },
    { key: "pedidos",   label: "Pedidos",      icon: "🛒" },
    { key: "custo",     label: "Custo / Lucro", icon: "💰" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#f3f4f6" }}>
      {/* SIDEBAR */}
      <div style={{ width: 220, minWidth: 220, background: "#0f1117", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>⚽ JF Control</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Gestão da Loja</div>
        </div>

        <div style={{ padding: "10px 8px 4px", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px" }}>Principal</div>
        {PAGINAS.map(({ key, label }) => (
          <button key={key} onClick={() => setPagina(key)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", margin: "1px 6px",
            borderRadius: 8, cursor: "pointer", fontSize: 13,
            color: pagina === key ? "#fff" : "rgba(255,255,255,0.6)",
            background: pagina === key ? "#1e3a8a" : "none",
            border: "none", textAlign: "left", width: "calc(100% - 12px)", transition: "background 0.15s"
          }}>{label}</button>
        ))}

        <div style={{ marginTop: "auto", padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>JF</div>
            <div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>JF Control</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Loja de Camisas</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>
            {PAGINAS.find(p => p.key === pagina)?.label || pagina}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {pagina === "dashboard" && <PageDashboard db={db} />}
          {pagina === "estoque" && (
            <PageEstoque
              db={db}
              onAdd={() => setModal({ tipo: "produto", dados: null })}
              onEdit={(p) => setModal({ tipo: "produto", dados: p })}
              onDelete={excluirProduto}
            />
          )}
          {pagina === "pedidos" && (
            <PagePedidos
              db={db}
              onAdd={() => setModal({ tipo: "pedido", dados: null })}
              onEdit={(p) => setModal({ tipo: "pedido", dados: p })}
              onDelete={excluirPedido}
              onUpdateMeta={atualizarMeta}
            />
          )}
          {pagina === "custo" && <PageCusto db={db} />}
        </div>
      </div>

      {/* MODAIS */}
      {modal?.tipo === "produto" && (
        <Modal title={modal.dados ? "Editar Produto" : "Novo Produto"} onClose={() => setModal(null)}>
          <FormProduto inicial={modal.dados} onSave={salvarProduto} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.tipo === "pedido" && (
        <Modal title={modal.dados ? "Editar Pedido" : "Novo Pedido"} onClose={() => setModal(null)}>
          <FormPedido inicial={modal.dados} produtos={db.produtos} onSave={salvarPedido} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
