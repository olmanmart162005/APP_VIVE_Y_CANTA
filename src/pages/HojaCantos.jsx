import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import {
  Music4,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  FileText,
  Loader2,
  CalendarDays,
  Clock3,
  MapPin,
  MessageSquareText,
  Sparkles,
} from "lucide-react"
import { generateCantoralPdf } from "../lib/cantoral/pdfGenerator"
import { parseMarkdown } from "../lib/cantoral/markdownParser"
import logoSrc from "../assets/logo.png"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canDeleteCantos, canManageCantos } from "../services/permissions"
import { supabase } from "../lib/supabase"

// type: "numeric" => solo acepta números, busca en libro_cantos, teclado numérico
// type: "text"    => acepta texto libre, no busca en libro_cantos
const SECTION_CONFIG = [
  { key: "entrada_1",     label: "Entrada 1",           type: "numeric" },
  { key: "entrada_2",     label: "Entrada 2",           type: "numeric" },
  { key: "ten_piedad",    label: "Ten Piedad",          type: "numeric" },
  { key: "gloria",        label: "Gloria",              type: "numeric" },
  { key: "salmo",         label: "Salmo",               type: "text"    },
  { key: "aleluya",       label: "Aleluya",             type: "text"    },
  { key: "oraciones",     label: "Oraciones",           type: "text"    },
  { key: "ofertorio_1",   label: "Ofertorio 1",         type: "numeric" },
  { key: "ofertorio_2",   label: "Ofertorio 2",         type: "numeric" },
  { key: "santo",         label: "Santo",               type: "numeric" },
  { key: "aclamacion",    label: "Aclamación",          type: "numeric" },
  { key: "cordero",       label: "Cordero",             type: "numeric" },
  { key: "comunion_1",    label: "Comunión 1",          type: "numeric" },
  { key: "comunion_2",    label: "Comunión 2",          type: "numeric" },
  { key: "comunion_3",    label: "Comunión 3",          type: "numeric" },
  { key: "meditacion",    label: "Meditación",          type: "text"    },
  { key: "accion_gracias",label: "Acción de Gracias",   type: "text"    },
  { key: "salida_1",      label: "Salida 1",            type: "numeric" },
  { key: "salida_2",      label: "Salida 2",            type: "numeric" },
]

const SECTION_MAP = Object.fromEntries(SECTION_CONFIG.map((s) => [s.key, s]))

const CELEBRATIONS = [
  "Misa Dominical",
  "Hora Santa",
  "Boda",
  "Confirmación",
  "Bautizo",
  "Retiro",
  "Procesión",
  "Funeral",
  "Otro",
]

const EMPTY_FORM = Object.fromEntries(SECTION_CONFIG.map((s) => [s.key, ""]))
const PERMISSION_DENIED_MESSAGE = "No tienes permisos para realizar esta acción."

function formatDate(iso) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("es-HN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function HojaCantos() {
  const [user, setUser] = useState(null)
  const [records, setRecords] = useState([])
  const [detailMap, setDetailMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState("form")
  const [searchTerm, setSearchTerm] = useState("")
  const [celebrationFilter, setCelebrationFilter] = useState("todos")
  const [selectedRecord, setSelectedRecord] = useState(null)

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [hora, setHora] = useState("08:00")
  const [celebracion, setCelebracion] = useState("Misa Dominical")
  const [lugar, setLugar] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [fields, setFields] = useState(EMPTY_FORM)
  const [searchResults, setSearchResults] = useState({})
  const [searching, setSearching] = useState({})
  const [lyricsCache, setLyricsCache] = useState({})
  const [loadingLyrics, setLoadingLyrics] = useState({})
  const [titleSuggestions, setTitleSuggestions] = useState({})  // key → [{numero, titulo}]
  const [activeSuggestionKey, setActiveSuggestionKey] = useState(null)
  const suggestionRefs = useRef({})

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("hojas_cantos")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      const safeRecords = data || []
      setRecords(safeRecords)

      const detailObject = {}
      await Promise.all(
        safeRecords.map(async (item) => {
          try {
            const { data: detailRows, error: detailError } = await supabase
              .from("hoja_cantos_detalle")
              .select("id, hoja_id, tipo, numero_canto, texto_manual, orden")
              .eq("hoja_id", item.id)
              .order("orden", { ascending: true })

            if (!detailError) {
              detailObject[item.id] = detailRows || []
            }
          } catch (detailErr) {
            console.error(detailErr)
          }
        })
      )

      setDetailMap(detailObject)
    } catch (error) {
      console.error(error)
      toast.error("No se pudieron cargar las hojas de cantos")
    }
  }

  const initializePage = async () => {
    try {
      const profile = await getCurrentUser()
      setUser(profile)
      await loadRecords()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initializePage()
  }, [])

  const clearForm = () => {
    setEditingId(null)
    setFecha(new Date().toISOString().slice(0, 10))
    setHora("08:00")
    setCelebracion("Misa Dominical")
    setLugar("")
    setObservaciones("")
    setFields(EMPTY_FORM)
    setSearchResults({})
    setSearching({})
    setActiveTab("form")
  }

  // Handles field input.
  //   • Numeric field + digits only  → busca por número en libro_cantos
  //   • Numeric field + letras       → busca por título (autocomplete dropdown)
  //   • Text field + texto           → texto libre
  //   • Text field + digits          → busca por número
  const handleFieldChange = async (key, value) => {
    const sectionDef = SECTION_MAP[key]
    const isNumericField = sectionDef?.type === "numeric"

    // Para campos numéricos permitimos letras mientras el usuario busca por nombre
    const normalized = value
    setFields((prev) => ({ ...prev, [key]: normalized }))

    const trimmed = normalized.trim()

    if (!trimmed) {
      setSearchResults((prev)       => ({ ...prev, [key]: null }))
      setTitleSuggestions((prev)    => ({ ...prev, [key]: [] }))
      setActiveSuggestionKey(null)
      setSearching((prev)           => ({ ...prev, [key]: false }))
      return
    }

    const isPurelyNumeric = /^\d+$/.test(trimmed)

    // ── Texto libre (campo tipo text, sin dígitos) ────────────────────────
    if (!isNumericField && !isPurelyNumeric) {
      setSearchResults((prev) => ({ ...prev, [key]: { kind: "custom", value: normalized } }))
      setSearching((prev) => ({ ...prev, [key]: false }))
      return
    }

    // ── Búsqueda por nombre (campo numérico, el usuario escribió letras) ──
    if (isNumericField && !isPurelyNumeric) {
      setSearching((prev) => ({ ...prev, [key]: true }))
      setActiveSuggestionKey(key)
      try {
        const { data, error } = await supabase
          .from("libro_cantos")
          .select("numero,titulo,categoria")
          .ilike("titulo", `%${trimmed}%`)
          .order("numero", { ascending: true })
          .limit(8)

        if (error) throw error
        setTitleSuggestions((prev) => ({ ...prev, [key]: data || [] }))
        setSearchResults((prev) => ({
          ...prev,
          [key]: (data || []).length > 0
            ? { kind: "title-search", value: trimmed }
            : { kind: "not-found",   value: trimmed },
        }))
      } catch (err) {
        console.error(err)
        setTitleSuggestions((prev) => ({ ...prev, [key]: [] }))
      } finally {
        setSearching((prev) => ({ ...prev, [key]: false }))
      }
      return
    }

    // ── Búsqueda por número ───────────────────────────────────────────────
    setTitleSuggestions((prev) => ({ ...prev, [key]: [] }))
    setActiveSuggestionKey(null)
    setSearching((prev) => ({ ...prev, [key]: true }))
    const numericValue = Number(trimmed)

    try {
      const { data: exactMatch } = await supabase
        .from("libro_cantos")
        .select("numero,titulo,categoria,letra_markdown")
        .eq("numero", numericValue)
        .maybeSingle()

      if (exactMatch) {
        setSearchResults((prev) => ({
          ...prev,
          [key]: {
            kind: "found",
            value: trimmed,
            matches: [exactMatch],
            firstTitle: exactMatch.titulo || null,
            category: exactMatch.categoria || null,
            letra_markdown: exactMatch.letra_markdown || null,
          },
        }))
        return
      }

      const { data: suggestionData, error: suggestionError } = await supabase
        .from("libro_cantos")
        .select("numero,titulo,categoria,letra_markdown")
        .order("numero", { ascending: true })

      if (suggestionError) throw suggestionError

      const matches = (suggestionData || []).filter((item) => String(item.numero).startsWith(trimmed))
      const bestMatch = matches[0] || null
      const kind = matches.length ? "found" : "not-found"

      setSearchResults((prev) => ({
        ...prev,
        [key]: {
          kind,
          value: trimmed,
          matches,
          firstTitle: bestMatch?.titulo || null,
          category: bestMatch?.categoria || null,
          letra_markdown: bestMatch?.letra_markdown || null,
        },
      }))
    } catch (error) {
      console.error(error)
      setSearchResults((prev) => ({ ...prev, [key]: { kind: "not-found", value: normalized } }))
    } finally {
      setSearching((prev) => ({ ...prev, [key]: false }))
    }
  }

  // Seleccionar una sugerencia de título → rellenar con el número
  const handleSelectTitleSuggestion = (key, song) => {
    setActiveSuggestionKey(null)
    setTitleSuggestions((prev) => ({ ...prev, [key]: [] }))
    // Disparar búsqueda normal por número (limpia el texto y confirma el canto)
    handleFieldChange(key, String(song.numero))
  }

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeSuggestionKey) {
        const ref = suggestionRefs.current[activeSuggestionKey]
        if (ref && !ref.contains(e.target)) {
          setActiveSuggestionKey(null)
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [activeSuggestionKey])

  const isCreateAllowed = canManageCantos(user?.role)
  const isDeleteAllowed = canDeleteCantos(user?.role)

  const ensureManagePermission = () => {
    if (canManageCantos(user?.role)) return true
    toast.error(PERMISSION_DENIED_MESSAGE)
    return false
  }

  const persistDetails = async (sheetId) => {
    // Delete all existing details for this sheet first
    try {
      const { error: delError } = await supabase
        .from("hoja_cantos_detalle")
        .delete()
        .eq("hoja_id", sheetId)

      if (delError) console.error("Error deleting old details:", delError)
    } catch (err) {
      console.error("Exception while deleting old details:", err)
    }

    const detailEntries = SECTION_CONFIG.filter((section) => (fields[section.key] || "").trim())
    if (!detailEntries.length) return

    const payloads = detailEntries.map((section) => {
      const value = (fields[section.key] || "").trim()
      // Solo guardar como número si el campo es numérico Y el valor es puramente dígitos
      const isPurelyNumeric = section.type === "numeric" && /^\d+$/.test(value)
      const orden = SECTION_CONFIG.findIndex((s) => s.key === section.key) + 1

      return {
        hoja_id: sheetId,
        tipo: section.key,
        numero_canto: isPurelyNumeric ? Number(value) : null,
        texto_manual: isPurelyNumeric ? null : value || null,
        orden,
      }
    })

    const { error: insertError } = await supabase
      .from("hoja_cantos_detalle")
      .insert(payloads)

    if (insertError) {
      console.error("Error inserting details:", insertError)
      throw insertError
    }
  }

  const handleSave = async () => {
    if (!ensureManagePermission()) return

    if (!fecha || !hora || !celebracion || !lugar.trim()) {
      toast.error("Completa fecha, hora, celebración y lugar.")
      return
    }

    setSaving(true)

    const payload = {
      fecha,
      hora,
      celebracion: celebracion.trim(),
      lugar: lugar.trim(),
      observaciones: observaciones.trim(),
      created_by: user?.id,
    }

    try {
      let sheetId
      if (editingId) {
        const { error } = await supabase.from("hojas_cantos").update(payload).eq("id", editingId)
        if (error) throw error
        sheetId = editingId
      } else {
        const { data, error } = await supabase.from("hojas_cantos").insert([payload]).select("*").single()
        if (error) throw error
        sheetId = data.id
      }

      await persistDetails(sheetId)

      toast.success(editingId ? "Hoja actualizada" : "Hoja guardada")
      clearForm()
      await loadRecords()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo guardar la hoja")
    } finally {
      setSaving(false)
    }
  }

  const populateFormFromRecord = (item) => {
    if (!ensureManagePermission()) return

    setEditingId(item.id)
    setFecha(item.fecha || "")
    setHora(item.hora || "08:00")
    setCelebracion(item.celebracion || "Misa Dominical")
    setLugar(item.lugar || "")
    setObservaciones(item.observaciones || "")

    const nextFields = { ...EMPTY_FORM }
    const detailRows = detailMap[item.id] || []

    detailRows.forEach((detail) => {
      const sectionKey = detail.tipo
      if (sectionKey && sectionKey in nextFields) {
        // Use numero_canto if available, otherwise texto_manual
        if (detail.numero_canto !== null && detail.numero_canto !== undefined) {
          nextFields[sectionKey] = String(detail.numero_canto)
        } else if (detail.texto_manual) {
          nextFields[sectionKey] = detail.texto_manual
        }
      }
    })

    setFields(nextFields)
    setSearchResults({})
    setActiveTab("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDuplicate = (item) => {
    if (!ensureManagePermission()) return

    setEditingId(null)
    setFecha(item.fecha || "")
    setHora(item.hora || "08:00")
    setCelebracion(item.celebracion || "Misa Dominical")
    setLugar(item.lugar || "")
    setObservaciones(item.observaciones || "")

    const nextFields = { ...EMPTY_FORM }
    const detailRows = detailMap[item.id] || []

    detailRows.forEach((detail) => {
      const sectionKey = detail.tipo
      if (sectionKey && sectionKey in nextFields) {
        if (detail.numero_canto !== null && detail.numero_canto !== undefined) {
          nextFields[sectionKey] = String(detail.numero_canto)
        } else if (detail.texto_manual) {
          nextFields[sectionKey] = detail.texto_manual
        }
      }
    })

    setFields(nextFields)
    setSearchResults({})
    setActiveTab("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Hoja cargada para duplicar. Presiona guardar para crear la copia.")
  }

  const handleView = async (item) => {
    const detailRows = detailMap[item.id] || []
    const numericDetails = detailRows.filter((detail) => detail.numero_canto !== null && detail.numero_canto !== undefined)

    await Promise.all(
      numericDetails.map((detail) => fetchLyricsFor(String(detail.numero_canto)))
    )

    setSelectedRecord(item)
  }

  const handleDelete = async (id) => {
    if (!ensureManagePermission()) return

    if (!window.confirm("¿Eliminar esta hoja de cantos?")) return
    try {
      const { error } = await supabase.from("hojas_cantos").delete().eq("id", id)
      if (error) throw error
      toast.success("Hoja eliminada")
      await loadRecords()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo eliminar")
    }
  }

  const fetchLyricsFor = async (numero) => {
    const cached = lyricsCache[numero]
    if (cached) return cached

    setLoadingLyrics((prev) => ({ ...prev, [numero]: true }))
    try {
      const { data, error } = await supabase
        .from("libro_cantos")
        .select("numero,titulo,categoria,letra_markdown")
        .eq("numero", Number(numero))
        .single()
      if (error) throw error
      setLyricsCache((prev) => ({ ...prev, [numero]: data }))
      return data
    } catch (err) {
      console.error(err)
      return null
    } finally {
      setLoadingLyrics((prev) => ({ ...prev, [numero]: false }))
    }
  }

  const renderPreviewText = (text) => {
    if (!text) return null
    const blocks = parseMarkdown(text)
    return blocks.map((block, blockIndex) => {
      if (block.type === 'separator') {
        return (
          <div key={blockIndex} className="my-2 h-px w-full bg-[#D4AF37]/30" />
        )
      }

      return (
        <div key={blockIndex} className={block.type === 'chorus' ? 'space-y-1 mb-2 font-semibold text-[#D4AF37]' : 'space-y-1 mb-2'}>
          {block.lines.map((line, lineIndex) => {
            const trimmed = line.trim()
            if (!trimmed) {
              return <p key={lineIndex} className="h-2">&nbsp;</p>
            }
            const segments = []
            const regex = /\*\*([^*]+)\*\*/g
            let lastIndex = 0
            let match
            while ((match = regex.exec(line)) !== null) {
              if (match.index > lastIndex) {
                segments.push(line.slice(lastIndex, match.index))
              }
              segments.push(<strong key={`${blockIndex}-${lineIndex}-${lastIndex}`}>{match[1]}</strong>)
              lastIndex = match.index + match[0].length
            }
            if (lastIndex < line.length) {
              segments.push(line.slice(lastIndex))
            }
            return <p key={lineIndex}>{segments.length > 0 ? segments : line}</p>
          })}
        </div>
      )
    })
  }

  const handleDownloadPdf = async (item) => {
    if (!item) return

    const detailRows = detailMap[item.id] || []
    if (detailRows.length === 0) {
      toast.error("Esta hoja no tiene cantos registrados.")
      return
    }

    toast.loading("Generando cantoral PDF…", { id: "pdf-gen" })

    try {
      // Enrich each detail with song data from libro_cantos
      const enrichedSections = await Promise.all(
        detailRows.map(async (detail) => {
          const sectionDef = SECTION_MAP[detail.tipo]
          const sectionLabel = sectionDef?.label || detail.tipo || "Sección"

          if (detail.numero_canto !== null && detail.numero_canto !== undefined) {
            console.log(`[PDF] Buscando canto: ${detail.numero_canto}`)
            const song = await fetchLyricsFor(String(detail.numero_canto))
            if (!song) {
              throw new Error(`El canto N.° ${detail.numero_canto} no existe en el cantoral.`)
            }
            if (!song.letra_markdown?.trim()) {
              throw new Error(`El canto N.° ${detail.numero_canto} (${song.titulo || 'Sin título'}) no tiene letra registrada en la base de datos.`)
            }
            console.log(`[PDF] Encontrado: ${song.titulo}`)
            console.log(`[PDF] Longitud letra: ${song.letra_markdown.length} caracteres`)
            return {
              detail,
              sectionLabel,
              rawValue: String(detail.numero_canto),
              song,
              isNumeric: true,
              textoManual: null,
            }
          } else {
            return {
              detail,
              sectionLabel,
              rawValue: detail.texto_manual || "",
              song: null,
              isNumeric: false,
              textoManual: detail.texto_manual || "",
            }
          }
        })
      )

      console.log("[PDF] Renderizando PDF...")
      await generateCantoralPdf(item, enrichedSections, logoSrc)
      toast.success("Cantoral descargado", { id: "pdf-gen" })
    } catch (err) {
      console.error("[PDF] Error generando cantoral:", err)
      toast.error(err.message || "No se pudo generar el PDF", { id: "pdf-gen" })
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.celebracion, item.lugar, item.observaciones, formatDate(item.fecha)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())

      const matchesCelebration = celebrationFilter === "todos" || item.celebracion === celebrationFilter
      return matchesSearch && matchesCelebration
    })
  }, [records, searchTerm, celebrationFilter])

  const previewSections = SECTION_CONFIG.map((section) => {
    const value = fields[section.key] || ""
    const result = searchResults[section.key]
    const displayText =
      result?.kind === "found" && value
        ? `${value} — ${result.firstTitle || "Canto encontrado"}`
        : result?.kind === "not-found" && value
          ? "Canto no encontrado"
          : result?.kind === "custom" && value
            ? value
            : value

    return { ...section, value: displayText }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] pb-24 text-[var(--text-primary)] flex items-center justify-center">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center gap-3 px-5 py-4 shadow-xl">
          <Loader2 className="animate-spin text-[#D4AF37]" size={20} />
          <span className="text-sm font-bold text-[var(--text-primary)]">Cargando módulo de cantos…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-4 md:p-8 pb-32 font-sans antialiased text-[var(--text-primary)] transition-colors duration-200">
      {/* HEADER UNIFICADO */}
      <div className="page-header-gold flex flex-col sm:flex-row sm:justify-between sm:items-start rounded-3xl px-5 py-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl header-text-primary">♪</span>
            <h1 className="title-professional title-gold-black text-3xl tracking-tight">Hoja de Cantos</h1>
          </div>
          <p className="header-text-secondary text-sm mt-0.5">
            Planificación litúrgica y repertorio para Coro Vive y Canta
          </p>
        </div>
        {isCreateAllowed && (
          <button
            onClick={() => {
              clearForm()
              setActiveTab("form")
            }}
            className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            Nueva Hoja
          </button>
        )}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 mt-5">
        {isCreateAllowed && (
          <section className="bg-[var(--bg-card)] rounded-[30px] p-4 sm:p-6 border border-[var(--border-color)] shadow-xl">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {editingId ? "Edición de Hoja" : "Creación rápida"}
                </p>
                <h2 className="title-professional text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-0.5">
                  {editingId ? "Modificar Hoja de Cantos" : "Planificar Nueva Celebración"}
                </h2>
              </div>
              <button
                onClick={() => clearForm()}
                className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus size={14} />
                Limpiar Formulario
              </button>
            </div>

            <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] p-1 rounded-xl">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("form")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "form"
                      ? "bg-[#D4AF37] text-black shadow-md"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Formulario
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-[#D4AF37] text-black shadow-md"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Vista previa
                </button>
              </div>
            </div>

            <div className="mt-4 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
              <div className={`${activeTab === "form" ? "block" : "hidden"} lg:block`}>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block ml-1">Fecha</span>
                      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-premium h-11 w-full" />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block ml-1">Hora</span>
                      <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="input-premium h-11 w-full" />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block ml-1">Celebración</span>
                      <select value={celebracion} onChange={(e) => setCelebracion(e.target.value)} className="input-premium h-11 w-full">
                        {CELEBRATIONS.map((option) => (
                          <option key={option} value={option} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block ml-1">Lugar</span>
                      <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} className="input-premium h-11 w-full" placeholder="Ej. Parroquia Nuestro Señor de Esquipulas" />
                    </label>
                  </div>

                  <label className="mt-3 block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block ml-1">Observaciones / Notas</span>
                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="input-premium min-h-[72px] resize-none py-2.5 w-full" placeholder="Notas litúrgicas, tonos, recomendaciones..." />
                  </label>

                  <div className="mt-4 space-y-2.5">
                    {SECTION_CONFIG.map((section) => {
                      const result       = searchResults[section.key]
                      const isSearching  = searching[section.key]
                      const isNumericField = section.type === "numeric"
                      const suggestions  = titleSuggestions[section.key] || []
                      const showDropdown = activeSuggestionKey === section.key && suggestions.length > 0

                      return (
                        <div
                          key={section.key}
                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3.5 transition hover:border-[#D4AF37]/50 shadow-xs"
                          ref={(el) => { suggestionRefs.current[section.key] = el }}
                        >
                          <div className="flex items-center gap-2">
                            <Music4 size={14} className="text-[#D4AF37]" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">{section.label}</span>
                            {!isNumericField && (
                              <span className="ml-auto rounded-full bg-[var(--bg-muted)] border border-[var(--border-color)] px-2 py-0.5 text-[9px] font-bold uppercase text-[var(--text-secondary)]">
                                texto libre
                              </span>
                            )}
                          </div>

                          {/* Input: número o nombre del canto */}
                          <div className="relative mt-2">
                            <input
                              type="text"
                              value={fields[section.key] || ""}
                              onChange={(e) => handleFieldChange(section.key, e.target.value)}
                              onFocus={() => {
                                if (suggestions.length > 0) setActiveSuggestionKey(section.key)
                              }}
                              placeholder={isNumericField ? "Nº o nombre del canto..." : "Texto libre o Nº de canto..."}
                              className="input-premium h-10 w-full"
                            />
                            {isSearching && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
                              </span>
                            )}

                            {/* Dropdown de sugerencias por nombre */}
                            {showDropdown && (
                              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                {suggestions.map((song) => (
                                  <button
                                    key={`sug-${section.key}-${song.numero}`}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      handleSelectTitleSuggestion(section.key, song)
                                    }}
                                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-[var(--bg-muted)] border-b border-[var(--border-color)] last:border-b-0 cursor-pointer"
                                  >
                                    <span className="min-w-[28px] rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-1.5 py-0.5 text-center text-[10px] font-bold text-[#D4AF37]">
                                      {song.numero}
                                    </span>
                                    <span className="flex-1 truncate text-xs font-semibold text-[var(--text-primary)]">{song.titulo}</span>
                                    {song.categoria && (
                                      <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase shrink-0">{song.categoria}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Estado de la búsqueda */}
                          <div className="mt-2 min-h-[18px] text-[11px] text-[var(--text-secondary)]">
                            {result?.kind === "found" && result.matches?.length ? (
                              <div className="space-y-1">
                                <div className="font-bold text-[#D4AF37]">{result.value} • {result.firstTitle}</div>
                                {result.matches.length > 1 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.matches.map((item) => (
                                      <button
                                        key={`${section.key}-${item.numero}`}
                                        type="button"
                                        onClick={() => handleFieldChange(section.key, String(item.numero))}
                                        className="rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-primary)] hover:border-[#D4AF37] cursor-pointer"
                                      >
                                        {item.numero}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : result?.kind === "title-search" ? (
                              <span className="text-[#D4AF37]">Selecciona un canto de la lista desplegable</span>
                            ) : result?.kind === "not-found" ? (
                              <span className="text-amber-500 font-semibold">Canto no encontrado en el repertorio</span>
                            ) : result?.kind === "custom" ? (
                              <span className="text-emerald-500 font-semibold">Texto libre listo para guardar</span>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={clearForm} className="btn-secondary flex-1 py-3 text-xs cursor-pointer">
                      Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-[2] py-3 text-xs cursor-pointer">
                      {saving ? "Guardando…" : editingId ? "Actualizar Hoja" : "Guardar Hoja de Cantos"}
                    </button>
                  </div>
                </div>
              </div>

              {/* VISTA PREVIA COMPACTA */}
              <div className={`${activeTab === "preview" ? "block" : "hidden"} lg:block`}>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/50 p-4 sticky top-4">
                  <div className="flex items-center gap-2 text-[#D4AF37]">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Vista previa compacta</span>
                  </div>

                  <div className="mt-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Celebración</p>
                        <h3 className="title-professional text-lg font-bold text-[var(--text-primary)]">{celebracion || "Misa"}</h3>
                      </div>
                      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-2.5 py-1.5 text-right text-[11px] text-[var(--text-secondary)]">
                        <div>{formatDate(fecha) || "Fecha"}</div>
                        <div className="font-bold text-[#D4AF37]">{hora || "Hora"}</div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-[var(--text-primary)]">
                      <div className="flex items-center gap-2"><CalendarDays size={13} className="text-[#D4AF37]" /> {formatDate(fecha) || "Fecha pendiente"}</div>
                      <div className="flex items-center gap-2"><Clock3 size={13} className="text-[#D4AF37]" /> {hora || "Hora pendiente"}</div>
                      <div className="flex items-center gap-2"><MapPin size={13} className="text-[#D4AF37]" /> {lugar || "Lugar pendiente"}</div>
                      {observaciones ? <div className="flex items-start gap-2"><MessageSquareText size={13} className="text-[#D4AF37] mt-0.5 shrink-0" /> {observaciones}</div> : null}
                    </div>

                    <div className="mt-3.5 space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                      {previewSections.filter((section) => section.value).map((section) => (
                        <div key={section.key} className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{section.label}</span>
                          <span className="ml-2 truncate text-right font-semibold text-[var(--text-primary)]">{section.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* HISTORIAL DE HOJAS GUARDADAS */}
        <section className="bg-[var(--bg-card)] rounded-[30px] p-4 sm:p-6 border border-[var(--border-color)] shadow-xl">
          <div className="flex flex-col gap-3 border-b border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Historial Litúrgico</p>
              <h2 className="title-professional text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Hojas de Cantos Registradas</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs focus-within:border-[#D4AF37]">
                <Search size={14} className="text-[#D4AF37]" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar celebración o fecha..." className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder-[var(--text-muted)]" />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs focus-within:border-[#D4AF37]">
                <Filter size={14} className="text-[#D4AF37]" />
                <select value={celebrationFilter} onChange={(e) => setCelebrationFilter(e.target.value)} className="bg-transparent text-xs text-[var(--text-primary)] outline-none">
                  <option value="todos" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Todas las celebraciones</option>
                  {CELEBRATIONS.map((option) => (
                    <option key={option} value={option} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)]/40 py-12 text-center text-sm text-[var(--text-secondary)]">
              <FileText size={32} className="mx-auto mb-2 text-[#D4AF37]" />
              <p className="font-bold text-[var(--text-primary)]">Todavía no hay hojas de cantos registradas.</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Crea una nueva hoja para comenzar la planificación litúrgica.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {filteredRecords.map((item) => {
                const details = detailMap[item.id] || []
                return (
                  <div key={item.id} className="card-premium p-5 transition hover:border-[#D4AF37]/50 shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 inline-block">
                          {item.celebracion || "Celebración"}
                        </span>
                        <h3 className="title-professional text-lg font-bold text-[var(--text-primary)] mt-1.5">
                          {formatDate(item.fecha) || "Fecha pendiente"}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)] flex items-center gap-1">
                          <MapPin size={12} className="text-[#D4AF37]" />
                          {item.lugar || "Lugar pendiente"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-right text-xs text-[var(--text-secondary)]">
                        <div className="font-bold text-[var(--text-primary)]">{item.hora || "--:--"}</div>
                        <div className="font-bold text-[#D4AF37] text-[10px] uppercase mt-0.5">{details.length} cantos</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-[var(--border-color)]">
                      <button onClick={() => handleView(item)} className="btn-secondary flex-1 min-w-[95px] py-2 text-xs inline-flex items-center justify-center gap-1 cursor-pointer">
                        <Eye size={13} /> Ver
                      </button>
                      <button onClick={() => handleDownloadPdf(item)} className="btn-secondary flex-1 min-w-[95px] py-2 text-xs inline-flex items-center justify-center gap-1 cursor-pointer">
                        <Download size={13} /> PDF
                      </button>
                      {isCreateAllowed && (
                        <button onClick={() => populateFormFromRecord(item)} className="btn-secondary flex-1 min-w-[95px] py-2 text-xs cursor-pointer">
                          Editar
                        </button>
                      )}
                      {isCreateAllowed && (
                        <button onClick={() => handleDuplicate(item)} className="btn-secondary flex-1 min-w-[95px] py-2 text-xs cursor-pointer">
                          Duplicar
                        </button>
                      )}
                      {isDeleteAllowed && (
                        <button onClick={() => handleDelete(item.id)} className="btn-danger flex-1 min-w-[95px] py-2 text-xs inline-flex items-center justify-center gap-1 cursor-pointer">
                          <Trash2 size={13} /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* MODAL DETALLES DE HOJA */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="absolute right-4 top-4 z-50 rounded-full bg-[var(--bg-muted)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] cursor-pointer"
            >
              ✕
            </button>

            <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6 pt-14">
              <div className="mb-4 border-b border-[var(--border-color)] pb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  Vista de Cantoral
                </span>
                <h3 className="title-professional text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {selectedRecord.celebracion || "Celebración"}
                </h3>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-4 text-xs">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div><span className="font-bold text-[#D4AF37]">Fecha:</span> {formatDate(selectedRecord.fecha)}</div>
                  <div><span className="font-bold text-[#D4AF37]">Hora:</span> {selectedRecord.hora}</div>
                  <div><span className="font-bold text-[#D4AF37]">Lugar:</span> {selectedRecord.lugar || "—"}</div>
                  <div><span className="font-bold text-[#D4AF37]">Observaciones:</span> {selectedRecord.observaciones || "—"}</div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(detailMap[selectedRecord.id] || []).map((detail, index) => {
                  const sectionDef = SECTION_MAP[detail.tipo]
                  const sectionLabel = sectionDef?.label || detail.tipo || "Sección"
                  const isNumeric = detail.numero_canto !== null && detail.numero_canto !== undefined
                  const rawValue = isNumeric ? String(detail.numero_canto) : (detail.texto_manual || "")
                  const song = isNumeric ? lyricsCache[rawValue] : null
                  const contentText = isNumeric ? (song?.letra_markdown || song?.letra || "") : (detail.texto_manual || "")

                  return (
                    <div key={`${selectedRecord.id}-${index}`} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3.5 text-xs">
                      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">{sectionLabel}</p>
                          <p className="mt-0.5 text-sm font-bold text-[var(--text-primary)]">
                            {isNumeric ? `${rawValue}${song?.titulo ? ` • ${song.titulo}` : ''}` : rawValue || 'Texto libre'}
                          </p>
                        </div>
                        {isNumeric && song?.categoria ? (
                          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] self-start sm:self-auto">
                            {song.categoria}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1 text-xs leading-5 text-[var(--text-primary)] mt-2 border-t border-[var(--border-color)] pt-2 font-mono">
                        {loadingLyrics[rawValue] ? (
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Loader2 size={13} className="animate-spin text-[#D4AF37]" /> Cargando letra…
                          </div>
                        ) : contentText ? (
                          renderPreviewText(contentText)
                        ) : (
                          <p className="text-[var(--text-muted)] italic">No se encontró letra para este canto.</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  onClick={() => handleDownloadPdf(selectedRecord)}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs cursor-pointer"
                >
                  <Download size={14} />
                  Descargar Cantoral en PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default HojaCantos
