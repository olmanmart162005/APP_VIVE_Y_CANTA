import { useEffect, useMemo, useState, useCallback } from "react"
import {
  TrendingUp, TrendingDown, Wallet, FileText,
  PlusCircle, RefreshCw, Calendar, Layers,
  Activity, X, Edit3, Trash2, ChevronDown,
  Filter, Search, AlertCircle, CheckCircle,
  Loader2,
} from "lucide-react"
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import logoCoro from "../assets/logo.png"
import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageFinance } from "../services/permissions"
import { supabase } from "../lib/supabase"

/* ─── Paleta ─────────────────────────────────────────── */
const C = {
  bg:       "#0E0C09",
  card:     "#1A1710",
  card2:    "#211E12",
  gold:     "#D4AF37",
  goldDim:  "#9A7209",
  goldFade: "#3D3010",
  text:     "#F5E9C0",
  muted:    "#a89060",
  border:   "#2E2A1A",
  green:    "#4ADE80",
  red:      "#F87171",
  greenDim: "#14532d",
  redDim:   "#450a0a",
}

/* ─── Categorías ─────────────────────────────────────── */
const CATS_INGRESO = ["Misa","Concierto","Donación","Actividad económica","Otro"]
const CATS_GASTO   = ["Transporte","Alimentación","Sonido","Uniformes","Instrumentos","Otro"]

/* ─── Toast ──────────────────────────────────────────── */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  const ok = toast.type === "success"
  return (
    <div style={{ background: C.card, borderColor: ok ? C.gold : C.red }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border max-w-sm w-[calc(100vw-2rem)]">
      {ok
        ? <CheckCircle size={18} style={{ color: C.gold }} className="shrink-0" />
        : <AlertCircle size={18} style={{ color: C.red }} className="shrink-0" />}
      <p className="text-sm font-bold" style={{ color: C.text }}>{toast.msg}</p>
      <button onClick={onClose} className="ml-auto opacity-50 hover:opacity-100 transition">
        <X size={14} style={{ color: C.text }} />
      </button>
    </div>
  )
}

/* ─── Tooltip personalizado del gráfico ─────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 14 }}
      className="px-4 py-3 shadow-2xl">
      <p className="text-xs font-bold mb-2" style={{ color: C.muted }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-extrabold" style={{ color: p.color }}>
          {p.name}: L {Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

/* ─── Modal Formulario ───────────────────────────────── */
function ModalForm({ item, onClose, onSaved, user }) {
  const editing = !!item?.id
  const [tipo,       setTipo]       = useState(item?.tipo        || "ingreso")
  const [caja,       setCaja]       = useState(item?.caja        || "operativa")
  const [categoria,  setCategoria]  = useState(item?.categoria   || "")
  const [actividad,  setActividad]  = useState(item?.actividad   || "")
  const [descripcion,setDescripcion]= useState(item?.descripcion || "")
  const [monto,      setMonto]      = useState(item?.monto ? String(item.monto) : "")
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState("")

  const cats = tipo === "ingreso" ? CATS_INGRESO : CATS_GASTO

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) return setErr("Ingresa un monto válido.")
    if (!categoria) return setErr("Selecciona una categoría.")
    setErr("")
    setSaving(true)
    const payload = {
      tipo, caja, categoria,
      actividad: actividad.trim() || categoria,
      monto: Number(monto),
      descripcion: descripcion.trim(),
    }
    let error
    if (editing) {
      ;({ error } = await supabase.from("financial_records").update(payload).eq("id", item.id))
    } else {
      ;({ error } = await supabase.from("financial_records").insert([{ ...payload, created_by: user?.id }]))
    }
    setSaving(false)
    if (error) return setErr(error.message)
    onSaved(editing ? "Movimiento actualizado." : "Movimiento guardado.")
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition"
  const inputStyle = { background: C.bg, border: `1px solid ${C.border}`, color: C.text }
  const labelCls = "block text-[10px] font-black uppercase tracking-widest mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}` }}
        className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${C.goldFade}, ${C.card2})`, borderBottom: `1px solid ${C.border}` }}
          className="px-6 pt-6 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ background: C.goldFade, border: `1px solid ${C.gold}` }}
              className="w-9 h-9 rounded-xl flex items-center justify-center">
              <PlusCircle size={16} style={{ color: C.gold }} />
            </div>
            <div>
              <p style={{ color: C.muted }} className="text-[9px] font-black uppercase tracking-widest">Coro Vive y Canta</p>
              <h2 style={{ color: C.text }} className="font-black text-lg leading-tight">
                {editing ? "Editar Movimiento" : "Nuevo Movimiento"}
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={{ color: C.muted }} className="hover:opacity-70 transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {err && (
            <div style={{ background: C.redDim, border: `1px solid ${C.red}` }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl">
              <AlertCircle size={13} style={{ color: C.red }} />
              <p className="text-xs font-medium" style={{ color: C.red }}>{err}</p>
            </div>
          )}

          {/* Tipo + Caja en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: C.muted }} className={labelCls}>Tipo</label>
              <div className="relative">
                <select value={tipo} onChange={e => { setTipo(e.target.value); setCategoria("") }}
                  className={inputCls} style={inputStyle}>
                  <option value="ingreso">🟢 Ingreso</option>
                  <option value="gasto">🔴 Gasto</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
              </div>
            </div>
            <div>
              <label style={{ color: C.muted }} className={labelCls}>Caja</label>
              <div className="relative">
                <select value={caja} onChange={e => setCaja(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="operativa">Caja 1 · Operativa</option>
                  <option value="inversiones">Caja 2 · Inversiones</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
              </div>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label style={{ color: C.muted }} className={labelCls}>Categoría <span style={{ color: C.red }}>*</span></label>
            <div className="relative">
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className={inputCls} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
            </div>
          </div>

          {/* Actividad */}
          <div>
            <label style={{ color: C.muted }} className={labelCls}>Actividad específica</label>
            <input type="text" placeholder="Ej: Misa Patronal" value={actividad}
              onChange={e => setActividad(e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>

          {/* Monto */}
          <div>
            <label style={{ color: C.muted }} className={labelCls}>Monto (L.) <span style={{ color: C.red }}>*</span></label>
            <input type="number" placeholder="0.00" value={monto}
              onChange={e => setMonto(e.target.value)}
              className={inputCls} style={{ ...inputStyle, fontWeight: 800, fontSize: 18 }} />
          </div>

          {/* Descripción */}
          <div>
            <label style={{ color: C.muted }} className={labelCls}>Descripción</label>
            <input type="text" placeholder="Detalles adicionales..." value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} disabled={saving}
            style={{ border: `1px solid ${C.border}`, color: C.muted }}
            className="flex-1 py-3 rounded-xl font-bold text-sm hover:opacity-80 transition disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})` }}
            className="flex-[2] py-3 rounded-xl font-black text-sm text-black hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg">
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              : editing ? "Actualizar" : "Guardar"
            }
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Componente principal Finance ───────────────────── */
function Finance() {
  const [user,        setUser]        = useState(null)
  const [records,     setRecords]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [modalItem,   setModalItem]   = useState(null)  // null = cerrado, {} = nuevo, item = editar
  const [showModal,   setShowModal]   = useState(false)
  const [toast,       setToast]       = useState(null)
  const [search,      setSearch]      = useState("")
  const [filterCaja,  setFilterCaja]  = useState("todos")
  const [filterTipo,  setFilterTipo]  = useState("todos")
  const [filterTiempo,setFilterTiempo]= useState("todos")
  const [chartCaja,   setChartCaja]   = useState("todos")
  const [chartTiempo, setChartTiempo] = useState("todos")

  useEffect(() => {
    ;(async () => {
      const profile = await getCurrentUser()
      setUser(profile)
    })()
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("financial_records")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) setRecords(data)
    setLoading(false)
  }

  const showToast = (msg, type = "success") => setToast({ msg, type })

  const handleSaved = (msg) => {
    setShowModal(false)
    setModalItem(null)
    showToast(msg)
    loadRecords()
  }

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este movimiento permanentemente?")) return
    const { error } = await supabase.from("financial_records").delete().eq("id", id)
    if (error) showToast("Error al eliminar.", "error")
    else { showToast("Movimiento eliminado."); loadRecords() }
  }

  /* ── Stats por caja ── */
  const statsFor = useCallback((caja) => {
    const rows = records.filter(r => r.caja === caja)
    const ing  = rows.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0)
    const gas  = rows.filter(r => r.tipo === "gasto").reduce((s, r) => s + Number(r.monto), 0)
    return { ingresos: ing, gastos: gas, balance: ing - gas }
  }, [records])

  const op  = statsFor("operativa")
  const inv = statsFor("inversiones")

  /* ── Filtrado historial ── */
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterCaja  !== "todos" && r.caja !== filterCaja)  return false
      if (filterTipo  !== "todos" && r.tipo !== filterTipo)  return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !r.descripcion?.toLowerCase().includes(q) &&
          !r.categoria?.toLowerCase().includes(q) &&
          !r.actividad?.toLowerCase().includes(q)
        ) return false
      }
      if (filterTiempo !== "todos" && r.created_at) {
        const d = new Date(r.created_at), now = new Date()
        if (filterTiempo === "semana") {
          if (d < new Date(now - 7*24*60*60*1000)) return false
        } else if (filterTiempo === "mes") {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false
        } else if (filterTiempo === "ano") {
          if (d.getFullYear() !== now.getFullYear()) return false
        }
      }
      return true
    })
  }, [records, filterCaja, filterTipo, filterTiempo, search])

  /* ── Datos del gráfico de líneas ── */
  const chartData = useMemo(() => {
    const src = records.filter(r => {
      if (chartCaja !== "todos" && r.caja !== chartCaja) return false
      if (chartTiempo !== "todos" && r.created_at) {
        const d = new Date(r.created_at), now = new Date()
        if (chartTiempo === "semana") return d >= new Date(now - 7*24*60*60*1000)
        if (chartTiempo === "mes") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        if (chartTiempo === "ano") return d.getFullYear() === now.getFullYear()
      }
      return true
    })

    // Agrupar por mes-año
    const map = {}
    src.forEach(r => {
      const d = new Date(r.created_at)
      const key = d.toLocaleDateString("es-HN", { month: "short", year: "2-digit" })
      if (!map[key]) map[key] = { label: key, ingresos: 0, gastos: 0, _ts: d.getTime() }
      if (r.tipo === "ingreso") map[key].ingresos += Number(r.monto)
      if (r.tipo === "gasto")   map[key].gastos   += Number(r.monto)
    })

    return Object.values(map)
      .sort((a, b) => a._ts - b._ts)
      .map(({ label, ingresos, gastos }) => ({ label, ingresos, gastos }))
  }, [records, chartCaja, chartTiempo])

  /* ── Export PDF ── */
  const exportarPDF = () => {
    try {
      const doc = new jsPDF()
      const fecha = new Date()
      doc.setFillColor(14, 12, 9)
      doc.rect(0, 0, 220, 28, "F")
      try { doc.addImage(logoCoro, "PNG", 14, 4, 20, 20) } catch {}
      doc.setFont("times", "bold")
      doc.setTextColor(212, 175, 55)
      doc.setFontSize(16)
      doc.text("CORO VIVE Y CANTA", 40, 13)
      doc.setFontSize(10)
      doc.setFont("times", "italic")
      doc.setTextColor(200, 200, 200)
      doc.text("Reporte Financiero — Control Contable Interno", 40, 20)
      doc.setTextColor(60, 60, 60)
      doc.setFont("times", "normal")
      doc.setFontSize(9)
      doc.text(`Emitido: ${fecha.toLocaleString("es-HN")}   |   Responsable: ${user?.email || "Admin"}`, 14, 38)
      doc.setDrawColor(212, 175, 55)
      doc.line(14, 42, 196, 42)
      // Resumen cajas
      doc.setFont("times", "bold"); doc.setFontSize(11); doc.setTextColor(40,40,40)
      doc.text("Caja 1 · Operativa", 14, 52)
      doc.setFont("times","normal"); doc.setFontSize(10)
      doc.text(`Ingresos: L ${op.ingresos.toLocaleString()}   Gastos: L ${op.gastos.toLocaleString()}   Balance: L ${op.balance.toLocaleString()}`, 14, 58)
      doc.setFont("times","bold"); doc.setFontSize(11)
      doc.text("Caja 2 · Inversiones", 14, 68)
      doc.setFont("times","normal"); doc.setFontSize(10)
      doc.text(`Ingresos: L ${inv.ingresos.toLocaleString()}   Gastos: L ${inv.gastos.toLocaleString()}   Balance: L ${inv.balance.toLocaleString()}`, 14, 74)
      doc.line(14, 80, 196, 80)
      doc.setFont("times","bold"); doc.setFontSize(11); doc.text("HISTORIAL DE MOVIMIENTOS", 14, 88)
      autoTable(doc, {
        startY: 94,
        head: [["Fecha","Caja","Tipo","Categoría","Descripción","Monto"]],
        body: filteredRecords.map((r,i) => [
          new Date(r.created_at).toLocaleDateString("es-HN"),
          r.caja === "operativa" ? "Operativa" : "Inversiones",
          r.tipo.toUpperCase(),
          r.actividad || r.categoria || "-",
          r.descripcion || "-",
          "L " + Number(r.monto).toLocaleString(),
        ]),
        styles: { font:"times", fontSize:9 },
        headStyles: { fillColor:[14,12,9], textColor:[212,175,55], fontStyle:"bold" },
        alternateRowStyles: { fillColor:[248,244,233] },
        columnStyles: { 5: { halign:"right", fontStyle:"bold" } }
      })
      doc.save(`Reporte_ViVeyCanta_${new Date().toISOString().split("T")[0]}.pdf`)
    } catch(e) { console.error(e); showToast("Error al generar PDF.", "error") }
  }

  /* ── Estilos reutilizables ── */
  const cardBase = { background: C.card, border: `1px solid ${C.border}` }
  const selectStyle = { background: C.bg, border: `1px solid ${C.border}`, color: C.muted }
  const selectCls = "px-3 py-2 rounded-xl text-xs font-bold outline-none transition appearance-none cursor-pointer"

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }}
      className="pb-32 antialiased">

      <Toast toast={toast} onClose={() => setToast(null)} />

      {showModal && (
        <ModalForm
          item={modalItem}
          onClose={() => { setShowModal(false); setModalItem(null) }}
          onSaved={handleSaved}
          user={user}
        />
      )}

      {/* ── Top Header ─────────────────────────────────── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}
        className="px-5 py-5 flex items-center justify-between sticky top-0 z-40">
        <div>
          <p style={{ color: C.muted }} className="text-[9px] font-black uppercase tracking-widest mb-0.5">Coro Vive y Canta</p>
          <h1 style={{ color: C.gold }} className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span>♪</span> Finanzas
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarPDF}
            style={{ background: C.goldFade, border: `1px solid ${C.gold}`, color: C.gold }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs hover:opacity-80 transition">
            <FileText size={14} />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          {canManageFinance(user?.role) && (
            <button
              onClick={() => { setModalItem({}); setShowModal(true) }}
              style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})` }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs text-black hover:opacity-90 transition shadow-lg">
              <PlusCircle size={14} />
              Agregar
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-6 max-w-7xl mx-auto mt-5 space-y-5">

        {/* ── Cards de Cajas ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Caja 1 · Operativa", emoji: "🏦", stats: op, key: "operativa" },
            { label: "Caja 2 · Inversiones", emoji: "📈", stats: inv, key: "inversiones" },
          ].map(({ label, emoji, stats }) => (
            <div key={label} style={{ ...cardBase, background: C.card2 }}
              className="rounded-[26px] p-5 relative overflow-hidden">
              {/* Glow decorativo */}
              <div style={{ background: `radial-gradient(circle at top right, ${C.goldFade}, transparent 70%)` }}
                className="absolute inset-0 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div style={{ background: C.goldFade, border: `1px solid ${C.gold}33` }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base">
                      {emoji}
                    </div>
                    <div>
                      <p style={{ color: C.muted }} className="text-[10px] font-black uppercase tracking-wider">{label}</p>
                      <p style={{ color: C.muted }} className="text-[9px]">Saldo actual</p>
                    </div>
                  </div>
                  <div style={{
                    background: stats.balance >= 0 ? C.greenDim : C.redDim,
                    color: stats.balance >= 0 ? C.green : C.red,
                    border: `1px solid ${stats.balance >= 0 ? C.green : C.red}33`
                  }} className="text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                    {stats.balance >= 0 ? "Positivo" : "Déficit"}
                  </div>
                </div>
                <p style={{ color: C.gold }} className="text-3xl font-black tracking-tight mb-4">
                  L {stats.balance.toLocaleString()}
                </p>
                <div style={{ borderTop: `1px solid ${C.border}` }} className="pt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p style={{ color: C.muted }} className="text-[9px] font-black uppercase tracking-widest mb-0.5">Ingresos</p>
                    <p style={{ color: C.green }} className="font-black text-sm">L {stats.ingresos.toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ color: C.muted }} className="text-[9px] font-black uppercase tracking-widest mb-0.5">Egresos</p>
                    <p style={{ color: C.red }} className="font-black text-sm">L {stats.gastos.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Gráfico de Líneas ──────────────────────── */}
        <div style={cardBase} className="rounded-[26px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p style={{ color: C.muted }} className="text-[9px] font-black uppercase tracking-widest mb-0.5">Visualización</p>
              <h3 style={{ color: C.text }} className="font-black text-base">Ingresos y Costos</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={chartCaja} onChange={e => setChartCaja(e.target.value)}
                className={selectCls} style={selectStyle}>
                <option value="todos">Todas las cajas</option>
                <option value="operativa">Caja Operativa</option>
                <option value="inversiones">Caja Inversiones</option>
              </select>
              <select value={chartTiempo} onChange={e => setChartTiempo(e.target.value)}
                className={selectCls} style={selectStyle}>
                <option value="todos">Histórico</option>
                <option value="semana">Esta semana</option>
                <option value="mes">Este mes</option>
                <option value="ano">Este año</option>
              </select>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p style={{ color: C.muted }} className="text-sm font-medium">Sin datos para graficar.</p>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10, fontWeight: 700 }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `L${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: C.muted, paddingTop: 12 }}
                    iconType="circle" />
                  <Line
                    type="monotone" dataKey="ingresos" name="Ingresos"
                    stroke={C.gold} strokeWidth={2.5} dot={{ fill: C.gold, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: C.gold }} />
                  <Line
                    type="monotone" dataKey="gastos" name="Gastos"
                    stroke={C.red} strokeWidth={2.5} dot={{ fill: C.red, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: C.red }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Historial ──────────────────────────────── */}
        <div style={cardBase} className="rounded-[26px] overflow-hidden">

          {/* Barra de filtros */}
          <div style={{ borderBottom: `1px solid ${C.border}` }} className="p-4 flex flex-wrap gap-3 items-center">
            <h3 style={{ color: C.text }} className="font-black text-sm flex-1 min-w-[140px]">
              Movimientos recientes
            </h3>

            {/* Búsqueda */}
            <div style={{ background: C.bg, border: `1px solid ${C.border}` }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[150px] max-w-[220px]">
              <Search size={12} style={{ color: C.muted }} />
              <input type="text" placeholder="Buscar movimiento..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: "transparent", color: C.text, outline: "none", width: "100%" }}
                className="text-xs font-medium placeholder-amber-900/60" />
              {search && <button onClick={() => setSearch("")}><X size={11} style={{ color: C.muted }} /></button>}
            </div>

            {/* Filtros */}
            <select value={filterCaja} onChange={e => setFilterCaja(e.target.value)}
              className={selectCls} style={selectStyle}>
              <option value="todos">Todas las cajas</option>
              <option value="operativa">Caja Operativa</option>
              <option value="inversiones">Caja Inversiones</option>
            </select>

            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
              className={selectCls} style={selectStyle}>
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
            </select>

            <select value={filterTiempo} onChange={e => setFilterTiempo(e.target.value)}
              className={selectCls} style={selectStyle}>
              <option value="todos">Historial completo</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="ano">Este año</option>
            </select>

            <button onClick={loadRecords} style={{ background: C.goldFade, color: C.gold }}
              className="p-2.5 rounded-xl hover:opacity-70 transition"
              title="Actualizar">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Tabla (desktop) / Cards (mobile) */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 size={24} style={{ color: C.gold }} className="animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center">
              <Layers size={32} style={{ color: C.border }} className="mx-auto mb-3" />
              <p style={{ color: C.muted }} className="text-sm font-medium">Sin movimientos.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["Fecha","Descripción","Caja","Tipo","Categoría","Monto","Acciones"].map(h => (
                        <th key={h} style={{ color: C.muted }}
                          className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, i) => (
                      <tr key={r.id}
                        style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : `${C.card2}80` }}
                        className="hover:bg-white/5 transition">
                        <td className="px-5 py-3.5 text-xs font-mono whitespace-nowrap" style={{ color: C.muted }}>
                          {new Date(r.created_at).toLocaleDateString("es-HN")}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium max-w-[160px] truncate" style={{ color: C.text }}>
                          {r.descripcion || "Sin descripción"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span style={{
                            background: r.caja === "operativa" ? "#3D2A00" : "#0A1F2E",
                            color: r.caja === "operativa" ? C.gold : "#60C8F5",
                            border: `1px solid ${r.caja === "operativa" ? C.gold + "44" : "#60C8F544"}`
                          }} className="text-[10px] font-black px-2.5 py-1 rounded-lg whitespace-nowrap">
                            {r.caja === "operativa" ? "Caja 1 · Operativa" : "Caja 2 · Inversiones"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span style={{
                            background: r.tipo === "ingreso" ? C.greenDim : C.redDim,
                            color: r.tipo === "ingreso" ? C.green : C.red,
                          }} className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
                            {r.tipo}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium" style={{ color: C.muted }}>
                          {r.actividad || r.categoria || "General"}
                        </td>
                        <td className="px-5 py-3.5 font-black text-sm text-right whitespace-nowrap"
                          style={{ color: r.tipo === "ingreso" ? C.green : C.red }}>
                          {r.tipo === "ingreso" ? "+" : "-"} L {Number(r.monto).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          {canManageFinance(user?.role) && (
                            <div className="flex gap-1.5">
                              <button onClick={() => { setModalItem(r); setShowModal(true) }}
                                style={{ background: "#1e3a5f", color: "#60C8F5" }}
                                className="p-2 rounded-lg hover:opacity-80 transition">
                                <Edit3 size={12} />
                              </button>
                              <button onClick={() => handleDelete(r.id)}
                                style={{ background: C.redDim, color: C.red }}
                                className="p-2 rounded-lg hover:opacity-80 transition">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y" style={{ borderColor: C.border }}>
                {filteredRecords.map(r => (
                  <div key={r.id} className="p-4 flex items-center gap-3">
                    <div style={{
                      background: r.tipo === "ingreso" ? C.greenDim : C.redDim,
                      color: r.tipo === "ingreso" ? C.green : C.red,
                    }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                      {r.tipo === "ingreso" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: C.text }} className="text-sm font-bold truncate">
                        {r.descripcion || r.actividad || r.categoria}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span style={{ color: r.caja === "operativa" ? C.gold : "#60C8F5" }}
                          className="text-[9px] font-black uppercase">
                          {r.caja === "operativa" ? "Caja 1" : "Caja 2"}
                        </span>
                        <span style={{ color: C.muted }} className="text-[9px]">
                          {new Date(r.created_at).toLocaleDateString("es-HN")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p style={{ color: r.tipo === "ingreso" ? C.green : C.red }}
                        className="font-black text-sm">
                        {r.tipo === "ingreso" ? "+" : "-"}L {Number(r.monto).toLocaleString()}
                      </p>
                      {canManageFinance(user?.role) && (
                        <div className="flex gap-1 mt-1 justify-end">
                          <button onClick={() => { setModalItem(r); setShowModal(true) }}
                            style={{ background: "#1e3a5f", color: "#60C8F5" }}
                            className="p-1.5 rounded-lg hover:opacity-80 transition">
                            <Edit3 size={11} />
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            style={{ background: C.redDim, color: C.red }}
                            className="p-1.5 rounded-lg hover:opacity-80 transition">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default Finance