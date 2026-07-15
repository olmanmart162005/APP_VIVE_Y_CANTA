import { useEffect, useMemo, useState, useCallback } from "react"
import {
  TrendingUp, TrendingDown, FileText,
  PlusCircle, RefreshCw, Layers,
  X, Edit3, Trash2, ChevronDown,
  Search, AlertCircle, Loader2,
} from "lucide-react"
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "react-hot-toast"

import logoCoro from "../assets/logo.png"
import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageFinance } from "../services/permissions"
import { supabase } from "../lib/supabase"

const CATS_INGRESO = ["Misa", "Concierto", "Donación", "Actividad económica", "Otro"]
const CATS_GASTO = ["Transporte", "Alimentación", "Sonido", "Uniformes", "Instrumentos", "Otro"]

/* ─── Tooltip personalizado del gráfico ─────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1A1710]/95 backdrop-blur-md border border-[#D4AF37]/20 rounded-2xl p-4 shadow-2xl">
      <p className="text-xs font-bold mb-2 text-[#a89060]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-extrabold" style={{ color: p.color }}>
          {p.name}: L {Number(p.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  )
}

/* ─── Modal Formulario ───────────────────────────────── */
function ModalForm({ item, onClose, onSaved, user }) {
  const editing = !!item?.id
  const [tipo, setTipo] = useState(item?.tipo || "ingreso")
  const [caja, setCaja] = useState(item?.caja || "operativa")
  const [categoria, setCategoria] = useState(item?.categoria || "")
  const [actividad, setActividad] = useState(item?.actividad || "")
  const [descripcion, setDescripcion] = useState(item?.descripcion || "")
  const [monto, setMonto] = useState(item?.monto ? String(item.monto) : "")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const cats = tipo === "ingreso" ? CATS_INGRESO : CATS_GASTO

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) return setErr("Ingresa un monto válido.")
    if (!categoria) return setErr("Selecciona una categoría.")
    setErr("")
    setSaving(true)
    const payload = {
      tipo,
      caja,
      categoria,
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

  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-[#a89060] mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-[28px] overflow-hidden bg-[#1A1710] border border-[#D4AF37]/25 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-[#D4AF37]/15 bg-gradient-to-r from-[#221F18] to-[#1A1710]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#D4AF37]/10 border border-[#D4AF37]/20">
              <PlusCircle size={16} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[#a89060] text-[9px] font-bold uppercase tracking-widest">Coro Vive y Canta</p>
              <h2 className="text-[#F5E9C0] font-bold text-base leading-tight">
                {editing ? "Editar Movimiento" : "Nuevo Movimiento"}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-[#a89060] hover:text-[#D4AF37] transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {err && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400">
              <AlertCircle size={14} className="shrink-0" />
              <p className="text-xs font-semibold">{err}</p>
            </div>
          )}

          {/* Tipo + Caja en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <div className="relative">
                <select value={tipo} onChange={e => { setTipo(e.target.value); setCategoria("") }}
                  className="input-premium">
                  <option value="ingreso">🟢 Ingreso</option>
                  <option value="gasto">🔴 Gasto</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Caja</label>
              <div className="relative">
                <select value={caja} onChange={e => setCaja(e.target.value)}
                  className="input-premium">
                  <option value="operativa">Caja 1 · Operativa</option>
                  <option value="inversiones">Caja 2 · Inversiones</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className={labelCls}>Categoría *</label>
            <div className="relative">
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className="input-premium">
                <option value="">Seleccionar...</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Actividad */}
          <div>
            <label className={labelCls}>Actividad específica</label>
            <input type="text" placeholder="Ej: Misa Patronal" value={actividad}
              onChange={e => setActividad(e.target.value)}
              className="input-premium" />
          </div>

          {/* Monto */}
          <div>
            <label className={labelCls}>Monto (L.) *</label>
            <input type="number" placeholder="0.00" value={monto}
              onChange={e => setMonto(e.target.value)}
              className="input-premium !text-lg !font-extrabold" />
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <input type="text" placeholder="Detalles adicionales..." value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="input-premium" />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} disabled={saving}
            className="btn-secondary flex-1 py-3 text-xs">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex-[2] py-3 text-xs">
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Guardando...</>
            ) : editing ? (
              "Actualizar"
            ) : (
              "Guardar"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Componente principal Finance ───────────────────── */
function Finance() {
  const [user, setUser] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalItem, setModalItem] = useState(null) // null = cerrado, {} = nuevo, item = editar
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState("")
  const [filterCaja, setFilterCaja] = useState("todos")
  const [filterTipo, setFilterTipo] = useState("todos")
  const [filterTiempo, setFilterTiempo] = useState("todos")
  const [chartCaja, setChartCaja] = useState("todos")
  const [chartTiempo, setChartTiempo] = useState("todos")

  useEffect(() => {
    ;(async () => {
      const profile = await getCurrentUser()
      setUser(profile)
    })()
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      if (data) setRecords(data)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar registros financieros")
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = (msg) => {
    setShowModal(false)
    setModalItem(null)
    toast.success(msg)
    loadRecords()
  }

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este movimiento permanentemente?")) return
    try {
      const { error } = await supabase.from("financial_records").delete().eq("id", id)
      if (error) throw error
      toast.success("Movimiento eliminado correctamente")
      loadRecords()
    } catch (err) {
      console.error(err)
      toast.error("Error al intentar eliminar el registro")
    }
  }

  /* ── Stats por caja ── */
  const statsFor = useCallback((caja) => {
    const rows = records.filter(r => r.caja === caja)
    const ing = rows.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0)
    const gas = rows.filter(r => r.tipo === "gasto").reduce((s, r) => s + Number(r.monto), 0)
    return { ingresos: ing, gastos: gas, balance: ing - gas }
  }, [records])

  const op = statsFor("operativa")
  const inv = statsFor("inversiones")

  /* ── Filtrado historial ── */
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterCaja !== "todos" && r.caja !== filterCaja) return false
      if (filterTipo !== "todos" && r.tipo !== filterTipo) return false
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
          if (d < new Date(now - 7 * 24 * 60 * 60 * 1000)) return false
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
        if (chartTiempo === "semana") return d >= new Date(now - 7 * 24 * 60 * 60 * 1000)
        if (chartTiempo === "mes") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        if (chartTiempo === "ano") return d.getFullYear() === now.getFullYear()
      }
      return true
    })

    const map = {}
    src.forEach(r => {
      const d = new Date(r.created_at)
      const key = d.toLocaleDateString("es-HN", { month: "short", year: "2-digit" })
      if (!map[key]) map[key] = { label: key, ingresos: 0, gastos: 0, _ts: d.getTime() }
      if (r.tipo === "ingreso") map[key].ingresos += Number(r.monto)
      if (r.tipo === "gasto") map[key].gastos += Number(r.monto)
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
      doc.setFont("times", "bold"); doc.setFontSize(11); doc.setTextColor(40, 40, 40)
      doc.text("Caja 1 · Operativa", 14, 52)
      doc.setFont("times", "normal"); doc.setFontSize(10)
      doc.text(`Ingresos: L ${op.ingresos.toLocaleString()}   Gastos: L ${op.gastos.toLocaleString()}   Balance: L ${op.balance.toLocaleString()}`, 14, 58)
      doc.setFont("times", "bold"); doc.setFontSize(11)
      doc.text("Caja 2 · Inversiones", 14, 68)
      doc.setFont("times", "normal"); doc.setFontSize(10)
      doc.text(`Ingresos: L ${inv.ingresos.toLocaleString()}   Gastos: L ${inv.gastos.toLocaleString()}   Balance: L ${inv.balance.toLocaleString()}`, 14, 74)
      doc.line(14, 80, 196, 80)
      doc.setFont("times", "bold"); doc.setFontSize(11); doc.text("HISTORIAL DE MOVIMIENTOS", 14, 88)

      autoTable(doc, {
        startY: 94,
        head: [["Fecha", "Caja", "Tipo", "Categoría", "Descripción", "Monto"]],
        body: filteredRecords.map((r) => [
          new Date(r.created_at).toLocaleDateString("es-HN"),
          r.caja === "operativa" ? "Operativa" : "Inversiones",
          r.tipo.toUpperCase(),
          r.actividad || r.categoria || "-",
          r.descripcion || "-",
          "L " + Number(r.monto).toLocaleString("en-US", { minimumFractionDigits: 2 }),
        ]),
        styles: { font: "times", fontSize: 9 },
        headStyles: { fillColor: [14, 12, 9], textColor: [212, 175, 55], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 244, 233] },
        columnStyles: { 5: { halign: "right", fontStyle: "bold" } }
      })
      doc.save(`Reporte_ViVeyCanta_${new Date().toISOString().split("T")[0]}.pdf`)
      toast.success("Reporte PDF generado correctamente")
    } catch (e) {
      console.error(e)
      toast.error("Error al generar PDF")
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0C09] text-[#F5E9C0] pb-32 antialiased">
      {showModal && (
        <ModalForm
          item={modalItem}
          onClose={() => { setShowModal(false); setModalItem(null) }}
          onSaved={handleSaved}
          user={user}
        />
      )}

      {/* Top Header */}
      <div className="page-header-gold mx-4 mt-4 rounded-3xl px-5 py-5 flex items-center justify-between sticky top-2 z-40">
        <div>
          <p className="header-text-secondary text-[9px] font-bold uppercase tracking-widest mb-0.5">Coro Vive y Canta</p>
          <h1 className="title-professional title-gold-black text-2xl tracking-tight flex items-center gap-2">
            <span>♪</span> Finanzas
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarPDF}
            className="btn-secondary !py-2.5 flex items-center gap-2">
            <FileText size={14} />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          {canManageFinance(user?.role) && (
            <button
              onClick={() => { setModalItem({}); setShowModal(true) }}
              className="btn-primary !py-2.5 flex items-center gap-2">
              <PlusCircle size={14} />
              Agregar
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-6 max-w-7xl mx-auto mt-6 space-y-6">
        {/* Cards de Cajas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Caja 1 · Operativa", emoji: "🏦", stats: op },
            { label: "Caja 2 · Inversiones", emoji: "📈", stats: inv },
          ].map(({ label, emoji, stats }) => (
            <div key={label} className="card-premium relative overflow-hidden p-5">
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#D4AF37]/10 border border-[#D4AF37]/10 text-lg">
                    {emoji}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-[#a89060]">{label}</p>
                    <p className="text-[10px] text-[#a89060]/70 mt-1">Saldo actual</p>
                  </div>
                </div>
                <div className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase ${
                  stats.balance >= 0
                    ? "bg-green-500/10 text-[#4ADE80] border border-green-500/20"
                    : "bg-red-500/10 text-[#F87171] border border-red-500/20"
                }`}>
                  {stats.balance >= 0 ? "Positivo" : "Déficit"}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-4xl sm:text-5xl font-black text-[#D4AF37] tracking-tight">L {stats.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#16120E] border border-[#D4AF37]/10 p-3">
                  <p className="text-[9px] uppercase tracking-[0.28em] text-[#a89060]">Ingresos</p>
                  <p className="mt-2 text-sm font-bold text-[#4ADE80]">L {stats.ingresos.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-2xl bg-[#16120E] border border-[#D4AF37]/10 p-3">
                  <p className="text-[9px] uppercase tracking-[0.28em] text-[#a89060]">Egresos</p>
                  <p className="mt-2 text-sm font-bold text-[#F87171]">L {stats.gastos.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Gráfico de Líneas */}
        <div className="card-premium p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-[#a89060] text-[9px] font-bold uppercase tracking-widest mb-0.5">Visualización</p>
              <h3 className="text-[#F5E9C0] font-extrabold text-base">Ingresos y Costos</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={chartCaja} onChange={e => setChartCaja(e.target.value)}
                className="input-premium !w-auto !h-10 !px-3 text-xs font-semibold">
                <option value="todos">Todas las cajas</option>
                <option value="operativa">Caja Operativa</option>
                <option value="inversiones">Caja Inversiones</option>
              </select>
              <select value={chartTiempo} onChange={e => setChartTiempo(e.target.value)}
                className="input-premium !w-auto !h-10 !px-3 text-xs font-semibold">
                <option value="todos">Histórico</option>
                <option value="semana">Esta semana</option>
                <option value="mes">Este mes</option>
                <option value="ano">Este año</option>
              </select>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center rounded-3xl border border-[#D4AF37]/10 bg-[#16120E]">
              <p className="text-[#a89060]/60 text-sm font-semibold">Sin datos para graficar.</p>
            </div>
          ) : (
            <div className="h-56 rounded-[28px] border border-[#D4AF37]/10 bg-[#16120E] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#a89060", fontSize: 10, fontWeight: 700 }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#a89060", fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `L${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#a89060", paddingTop: 12 }}
                    iconType="circle" />
                  <Line
                    type="monotone" dataKey="ingresos" name="Ingresos"
                    stroke="#D4AF37" strokeWidth={2.5} dot={{ fill: "#D4AF37", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#D4AF37" }} />
                  <Line
                    type="monotone" dataKey="gastos" name="Gastos"
                    stroke="#F87171" strokeWidth={2.5} dot={{ fill: "#F87171", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#F87171" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Historial */}
        <div className="card-premium !p-0 overflow-hidden">
          {/* Barra de filtros */}
          <div className="p-4 flex flex-wrap gap-3 items-center border-b border-[#D4AF37]/15">
            <h3 className="text-[#F5E9C0] font-black text-sm flex-1 min-w-[140px]">
              Movimientos recientes
            </h3>

            {/* Búsqueda */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[150px] max-w-[220px] bg-[#221F18] border border-[#D4AF37]/15">
              <Search size={14} className="text-[#a89060]" />
              <input type="text" placeholder="Buscar..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: "transparent", color: "#F5E9C0", outline: "none", width: "100%" }}
                className="text-xs font-semibold placeholder-[#a89060]/30" />
              {search && <button onClick={() => setSearch("")}><X size={11} className="text-[#a89060]" /></button>}
            </div>

            {/* Filtros */}
            <select value={filterCaja} onChange={e => setFilterCaja(e.target.value)}
              className="input-premium !w-auto !h-9 !py-1 text-xs">
              <option value="todos">Cajas</option>
              <option value="operativa">Caja Operativa</option>
              <option value="inversiones">Caja Inversiones</option>
            </select>

            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
              className="input-premium !w-auto !h-9 !py-1 text-xs">
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
            </select>

            <select value={filterTiempo} onChange={e => setFilterTiempo(e.target.value)}
              className="input-premium !w-auto !h-9 !py-1 text-xs">
              <option value="todos">Historial completo</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="ano">Este año</option>
            </select>

            <button onClick={loadRecords}
              className="p-2 bg-[#221F18] border border-[#D4AF37]/15 text-[#D4AF37] rounded-xl hover:bg-[#D4AF37]/10 transition-colors"
              title="Actualizar">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Tabla (desktop) / Cards (mobile) */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center">
              <Layers size={32} className="mx-auto mb-3 text-[#a89060]/30" />
              <p className="text-[#a89060]/60 text-sm font-semibold">Sin movimientos financieros.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D4AF37]/15">
                      {["Fecha", "Descripción", "Caja", "Tipo", "Categoría", "Monto", "Acciones"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#a89060] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, i) => (
                      <tr key={r.id}
                        className={`border-b border-[#D4AF37]/15 transition hover:bg-[#D4AF37]/2 ${
                          i % 2 === 0 ? "bg-transparent" : "bg-[#1E1A12]/30"
                        }`}>
                        <td className="px-5 py-3.5 text-xs font-mono whitespace-nowrap text-[#a89060]">
                          {new Date(r.created_at).toLocaleDateString("es-HN")}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold max-w-[160px] truncate text-[#F5E9C0]">
                          {r.descripcion || "Sin descripción"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-lg border whitespace-nowrap ${
                            r.caja === "operativa"
                              ? "bg-[#D4AF37]/5 text-[#D4AF37] border-[#D4AF37]/20"
                              : "bg-blue-500/5 text-[#60C8F5] border-[#60C8F5]/20"
                          }`}>
                            {r.caja === "operativa" ? "Caja 1 · Operativa" : "Caja 2 · Inversiones"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-lg border uppercase whitespace-nowrap ${
                            r.tipo === "ingreso"
                              ? "bg-green-500/5 text-[#4ADE80] border-green-500/20"
                              : "bg-red-500/5 text-[#F87171] border-red-500/20"
                          }`}>
                            {r.tipo}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-[#a89060]">
                          {r.actividad || r.categoria || "General"}
                        </td>
                        <td className={`px-5 py-3.5 font-bold text-sm text-right whitespace-nowrap ${
                          r.tipo === "ingreso" ? "text-[#4ADE80]" : "text-[#F87171]"
                        }`}>
                          {r.tipo === "ingreso" ? "+" : "-"} L {Number(r.monto).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3.5">
                          {canManageFinance(user?.role) && (
                            <div className="flex gap-1.5">
                              <button onClick={() => { setModalItem(r); setShowModal(true) }}
                                className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                                <Edit3 size={12} />
                              </button>
                              <button onClick={() => handleDelete(r.id)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
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
              <div className="md:hidden divide-y divide-[#D4AF37]/15">
                {filteredRecords.map(r => (
                  <div key={r.id} className="p-4 flex items-center gap-3 bg-transparent">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      r.tipo === "ingreso"
                        ? "bg-green-500/10 text-[#4ADE80] border-green-500/20"
                        : "bg-red-500/10 text-[#F87171] border-red-500/20"
                    }`}>
                      {r.tipo === "ingreso" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#F5E9C0] truncate">
                        {r.descripcion || r.actividad || r.categoria}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase ${
                          r.caja === "operativa" ? "text-[#D4AF37]" : "text-[#60C8F5]"
                        }`}>
                          {r.caja === "operativa" ? "Caja 1" : "Caja 2"}
                        </span>
                        <span className="text-[#a89060]/60 text-[9px]">
                          {new Date(r.created_at).toLocaleDateString("es-HN")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-black text-sm ${
                        r.tipo === "ingreso" ? "text-[#4ADE80]" : "text-[#F87171]"
                      }`}>
                        {r.tipo === "ingreso" ? "+" : "-"}L {Number(r.monto).toLocaleString("en-US")}
                      </p>
                      {canManageFinance(user?.role) && (
                        <div className="flex gap-1 mt-1 justify-end">
                          <button onClick={() => { setModalItem(r); setShowModal(true) }}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                            <Edit3 size={11} />
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
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