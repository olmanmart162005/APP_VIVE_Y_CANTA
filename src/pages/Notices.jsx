import { useEffect, useState } from "react"
import { Pin, Plus, X, Pencil, Trash2, Bell, AlertTriangle, CheckCircle, Info } from "lucide-react"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageNotices } from "../services/permissions"
import { supabase } from "../lib/supabase"

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  alta:  { label: "Alta",  bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200",    icon: AlertTriangle, dot: "bg-red-500"    },
  media: { label: "Media", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: Info,          dot: "bg-amber-400"  },
  baja:  { label: "Baja",  bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-200",icon: CheckCircle,   dot: "bg-emerald-500"},
}

function PriorityBadge({ prioridad }) {
  const cfg  = PRIORITY_CONFIG[prioridad] ?? PRIORITY_CONFIG.media
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("es-HN", { day: "numeric", month: "long", year: "numeric" })
}

// ── Component ─────────────────────────────────────────────────────────────────

function Notices() {
  const [user,       setUser]       = useState(null)
  const [records,    setRecords]    = useState([])
  const [editingId,  setEditingId]  = useState(null)
  const [titulo,     setTitulo]     = useState("")
  const [mensaje,    setMensaje]    = useState("")
  const [prioridad,  setPrioridad]  = useState("media")
  const [fijado,     setFijado]     = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState(null)

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => { initializePage() }, [])

  const initializePage = async () => {
    const profile = await getCurrentUser()
    setUser(profile)
    await markAsRead(profile?.id)
    loadNotices()
  }

  const markAsRead = async (userId) => {
    if (!userId) return
    await supabase
      .from("profiles")
      .update({ last_seen_notice: new Date().toISOString() })
      .eq("id", userId)
  }

  const loadNotices = async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("fijado",     { ascending: false })
      .order("created_at", { ascending: false })
    setRecords(data || [])
  }

  const clearForm = () => {
    setTitulo("")
    setMensaje("")
    setPrioridad("media")
    setFijado(false)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!titulo.trim() || !mensaje.trim()) {
      setToast({ type: "error", message: "Completá el título y el mensaje." })
      return
    }
    setSaving(true)
    const payload = { titulo, mensaje, prioridad, fijado }
    let error = null

    if (editingId) {
      const { error: e } = await supabase.from("notices").update(payload).eq("id", editingId)
      error = e
    } else {
      const { error: e } = await supabase.from("notices").insert([{ ...payload, created_by: user?.id }])
      error = e
    }

    setSaving(false)

    if (error) {
      setToast({ type: "error", message: "Error al guardar. Intentá de nuevo." })
      return
    }

    setToast({ type: "success", message: editingId ? "Aviso actualizado." : "Aviso publicado." })
    clearForm()
    loadNotices()
  }

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este aviso?")) return
    await supabase.from("notices").delete().eq("id", id)
    setToast({ type: "success", message: "Aviso eliminado." })
    loadNotices()
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setTitulo(item.titulo)
    setMensaje(item.mensaje)
    setPrioridad(item.prioridad)
    setFijado(item.fijado)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const canManage = canManageNotices(user?.role)

  return (
    <div className="min-h-screen bg-[#F8F4E9] pb-32 antialiased text-gray-800">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-semibold transition-all ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      {/* ── HEADER ────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#C9A227] via-[#D4AF37] to-[#9A7209] overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-6 -right-3 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute -bottom-5 left-6 w-32 h-32 rounded-full bg-black/5" />

        <div className="relative p-6 pb-10 flex justify-between items-start">
          <div>
            <p className="text-yellow-200/80 text-xs font-semibold tracking-widest uppercase mb-1">
              Coro Vive y Canta
            </p>
            <h1 className="text-4xl font-black text-white tracking-tight">Avisos</h1>
            <p className="text-yellow-100/70 text-sm mt-1">
              {records.length} comunicado{records.length !== 1 ? "s" : ""} publicado{records.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="bg-white/15 border border-white/20 rounded-2xl p-3">
            <Bell size={22} className="text-white" />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">

        {/* ── BOTÓN NUEVO AVISO ─────────────────── */}
        {canManage && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#9A7209] text-white py-4 rounded-2xl font-bold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            Nuevo Aviso
          </button>
        )}

        {/* ── FORMULARIO ───────────────────────── */}
        {canManage && showForm && (
          <div className="bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden">
            {/* form header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-800 text-base">
                {editingId ? "Editar aviso" : "Nuevo aviso"}
              </h2>
              <button
                onClick={clearForm}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <input
                type="text"
                placeholder="Título del aviso"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-[#F8F4E9] outline-none text-sm placeholder-gray-400 font-medium"
              />

              <textarea
                placeholder="Escribe el mensaje aquí..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-[#F8F4E9] outline-none resize-none min-h-[120px] text-sm placeholder-gray-400 leading-relaxed"
              />

              {/* prioridad + fijado en fila */}
              <div className="flex gap-2">
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#F8F4E9] outline-none text-sm font-medium text-gray-700"
                >
                  <option value="alta">🔴 Alta</option>
                  <option value="media">🟡 Media</option>
                  <option value="baja">🟢 Baja</option>
                </select>

                <button
                  onClick={() => setFijado(f => !f)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 transition-colors ${fijado ? "bg-amber-50 border-[#D4AF37] text-[#9A7209]" : "bg-[#F8F4E9] border-transparent text-gray-400"}`}
                >
                  <Pin size={15} />
                  Fijar
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#9A7209] text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "Guardando..." : editingId ? "Actualizar aviso" : "Publicar aviso"}
              </button>
            </div>
          </div>
        )}

        {/* ── LISTA DE AVISOS ───────────────────── */}
        {records.length === 0 && (
          <div className="bg-white rounded-3xl text-center py-16 border border-dashed border-gray-200">
            <Bell className="mx-auto text-gray-200 mb-3" size={36} />
            <p className="text-sm font-semibold text-gray-400">Sin avisos publicados</p>
          </div>
        )}

        {records.map((item) => {
          const cfg  = PRIORITY_CONFIG[item.prioridad] ?? PRIORITY_CONFIG.media
          return (
            <div
              key={item.id}
              className={`bg-white rounded-[24px] overflow-hidden shadow-sm border ${item.fijado ? "border-[#D4AF37]/40" : "border-gray-100"}`}
            >
              {/* barra lateral de prioridad */}
              <div className={`flex`}>
                <div className={`w-1 shrink-0 ${cfg.dot}`} />

                <div className="flex-1 p-5">
                  {/* tope: título + pin + prioridad */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.fijado && (
                          <Pin size={14} className="text-[#B8860B] shrink-0" />
                        )}
                        <h2 className="font-bold text-gray-900 text-base leading-snug break-words">
                          {item.titulo}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <PriorityBadge prioridad={item.prioridad} />
                        {item.created_at && (
                          <span className="text-[11px] text-gray-400 font-medium">
                            {formatDate(item.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* mensaje */}
                  <p className="mt-3.5 text-sm text-gray-600 leading-relaxed break-words">
                    {item.mensaje}
                  </p>

                  {/* botones admin */}
                  {canManage && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl transition-colors"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition-colors"
                      >
                        <Trash2 size={12} />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}

export default Notices