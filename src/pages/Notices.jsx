import { useEffect, useState } from "react"
import { Pin, Plus, X, Pencil, Trash2, Bell, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { toast } from "react-hot-toast"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageNotices } from "../services/permissions"
import { supabase } from "../lib/supabase"

const PRIORITY_CONFIG = {
  alta: { label: "Alta", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", icon: AlertTriangle, dot: "bg-red-500" },
  media: { label: "Media", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: Info, dot: "bg-amber-400" },
  baja: { label: "Baja", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle, dot: "bg-emerald-500" },
}

function PriorityBadge({ prioridad }) {
  const cfg = PRIORITY_CONFIG[prioridad] ?? PRIORITY_CONFIG.media
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("es-HN", { day: "numeric", month: "long", year: "numeric" })
}

function Notices() {
  const [user, setUser] = useState(null)
  const [records, setRecords] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [titulo, setTitulo] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [prioridad, setPrioridad] = useState("media")
  const [fijado, setFijado] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { initializePage() }, [])

  const initializePage = async () => {
    try {
      const profile = await getCurrentUser()
      setUser(profile)
      await markAsRead(profile?.id)
      loadNotices()
    } catch (err) {
      console.error(err)
    }
  }

  const markAsRead = async (userId) => {
    if (!userId) return
    try {
      await supabase
        .from("profiles")
        .update({ last_seen_notice: new Date().toISOString() })
        .eq("id", userId)
    } catch (err) {
      console.error(err)
    }
  }

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("fijado", { ascending: false })
        .order("created_at", { ascending: false })
      if (error) throw error
      setRecords(data || [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar avisos")
    }
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
      toast.error("Completá el título y el mensaje del aviso")
      return
    }
    setSaving(true)
    const payload = { titulo, mensaje, prioridad, fijado }
    let error = null

    try {
      if (editingId) {
        const { error: e } = await supabase.from("notices").update(payload).eq("id", editingId)
        error = e
      } else {
        const { error: e } = await supabase.from("notices").insert([{ ...payload, created_by: user?.id }])
        error = e
      }

      if (error) throw error
      toast.success(editingId ? "Aviso actualizado correctamente." : "Aviso publicado correctamente.")
      clearForm()
      loadNotices()
    } catch (err) {
      console.error(err)
      toast.error("Error al intentar guardar el aviso")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este aviso definitivamente?")) return
    try {
      const { error } = await supabase.from("notices").delete().eq("id", id)
      if (error) throw error
      toast.success("Aviso eliminado.")
      loadNotices()
    } catch (err) {
      console.error(err)
      toast.error("Error al eliminar el aviso")
    }
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
    <div className="min-h-screen bg-[#0E0C09] pb-32 antialiased text-[#F5E9C0]">
      {/* HEADER */}
      <div className="page-header-gold relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-6 -right-3 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute -bottom-5 left-6 w-32 h-32 rounded-full bg-black/5" />

        <div className="relative p-6 pb-10 flex justify-between items-start header-text-primary">
          <div>
            <p className="header-text-secondary text-xs font-semibold tracking-widest uppercase mb-1">
              Coro Vive y Canta
            </p>
            <h1 className="title-professional title-gold-black text-4xl tracking-tight">Avisos</h1>
            <p className="header-text-secondary text-sm mt-1">
              {records.length} comunicado{records.length !== 1 ? "s" : ""} publicado{records.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="header-chip rounded-2xl p-3 backdrop-blur-xs">
            <Bell size={22} className="header-text-primary" />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        {/* BOTÓN NUEVO AVISO */}
        {canManage && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary w-full py-4 text-xs font-extrabold flex items-center justify-center gap-2"
          >
            <Plus size={16} strokeWidth={3} />
            Nuevo Aviso
          </button>
        )}

        {/* FORMULARIO */}
        {canManage && showForm && (
          <div className="bg-[#1A1710] border border-[#D4AF37]/20 rounded-[28px] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/15">
              <h2 className="font-bold text-[#F5E9C0] text-sm">
                {editingId ? "Editar aviso" : "Nuevo aviso"}
              </h2>
              <button
                onClick={clearForm}
                className="p-1.5 rounded-full hover:bg-[#221F18] text-[#a89060] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">Título</label>
                <input
                  type="text"
                  placeholder="Título del aviso"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="input-premium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">Mensaje</label>
                <textarea
                  placeholder="Escribe el mensaje aquí..."
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  className="input-premium h-28 py-3 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">Prioridad</label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value)}
                    className="input-premium"
                  >
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Media</option>
                    <option value="baja">🟢 Baja</option>
                  </select>
                </div>

                <div className="flex-initial">
                  <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">Destacar</label>
                  <button
                    onClick={() => setFijado(f => !f)}
                    className={`flex items-center justify-center gap-2 h-12 px-4 rounded-xl text-xs font-bold border transition-colors ${
                      fijado
                        ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                        : "bg-[#221F18] border-[#D4AF37]/15 text-[#a89060]/50"
                    }`}
                  >
                    <Pin size={14} />
                    {fijado ? "Fijado" : "Fijar"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full py-4 text-xs font-bold"
              >
                {saving ? "Guardando..." : editingId ? "Actualizar aviso" : "Publicar aviso"}
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE AVISOS */}
        {records.length === 0 && (
          <div className="bg-[#1A1710] rounded-3xl text-center py-16 border border-dashed border-[#D4AF37]/15">
            <Bell className="mx-auto text-[#a89060]/20 mb-3" size={36} />
            <p className="text-sm font-semibold text-[#a89060]/60">Sin avisos publicados</p>
          </div>
        )}

        {records.map((item) => {
          const cfg = PRIORITY_CONFIG[item.prioridad] ?? PRIORITY_CONFIG.media
          return (
            <div
              key={item.id}
              className={`bg-[#1A1710] rounded-[24px] overflow-hidden shadow-xl border ${
                item.fijado ? "border-[#D4AF37]/45" : "border-[#D4AF37]/10"
              }`}
            >
              <div className="flex">
                <div className={`w-1.5 shrink-0 ${cfg.dot}`} />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.fijado && (
                          <Pin size={14} className="text-[#D4AF37] shrink-0" />
                        )}
                        <h2 className="font-extrabold text-[#F5E9C0] text-base leading-snug break-words">
                          {item.titulo}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <PriorityBadge prioridad={item.prioridad} />
                        {item.created_at && (
                          <span className="text-[11px] text-[#a89060]/60 font-semibold">
                            {formatDate(item.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3.5 text-sm text-[#F5E9C0]/80 leading-relaxed break-words whitespace-pre-line">
                    {item.mensaje}
                  </p>

                  {canManage && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-[#D4AF37]/10">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3.5 py-2 rounded-xl hover:bg-blue-500/20 transition-all"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-xl hover:bg-red-500/20 transition-all"
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