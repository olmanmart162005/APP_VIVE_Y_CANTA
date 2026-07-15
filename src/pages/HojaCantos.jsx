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

function formatDateForFilename(iso) {
  if (!iso) return "sin-fecha"
  const d = new Date(iso)
  const day   = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year  = d.getFullYear()
  return `${year}-${month}-${day}`
}

function sanitizeFilename(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_]/g, "_")
    .replace(/_+/g, "_")
    .trim()
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

  useEffect(() => {
    initializePage()
  }, [])

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
          <div key={blockIndex} className="my-2 h-px w-full bg-[var(--gold)]/40" />
        )
      }

      return (
        <div key={blockIndex} className={block.type === 'chorus' ? 'space-y-1 mb-2 font-semibold' : 'space-y-1 mb-2'}>
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
        <div className="card-premium flex items-center gap-3 px-4 py-3">
          <Loader2 className="animate-spin text-[var(--gold)]" size={18} />
          <span className="text-sm font-semibold">Cargando módulo…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-28 text-[var(--text-primary)]">
      <div className="border-b border-[var(--border-color)] bg-[linear-gradient(135deg,var(--gold),var(--gold-soft))] px-3 py-4 text-[var(--bg-app)] sm:px-4">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-70">Coro Vive y Canta</p>
            <h1 className="title-professional title-gold-black text-3xl sm:text-4xl">Hoja de Cantos</h1>
          </div>
          <div className="rounded-2xl border border-black/10 bg-black/10 p-2.5">
            <Music4 size={20} />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
        {isCreateAllowed && (
          <section className="card-premium p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--text-secondary)]">Creación rápida</p>
                <h2 className="title-professional title-gold-black text-xl sm:text-2xl">Nueva hoja en menos de un minuto</h2>
              </div>
              <button onClick={() => clearForm()} className="btn-secondary px-3 py-2 text-[10px]">
                <Plus size={14} />
                Nueva Hoja
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-1.5">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setActiveTab("form")}
                  className={`flex-1 rounded-full px-3 py-2 text-[11px] font-semibold transition ${activeTab === "form" ? "bg-[var(--gold)] text-[var(--bg-app)]" : "text-[var(--text-secondary)]"}`}
                >
                  Formulario
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`flex-1 rounded-full px-3 py-2 text-[11px] font-semibold transition ${activeTab === "preview" ? "bg-[var(--gold)] text-[var(--bg-app)]" : "text-[var(--text-secondary)]"}`}
                >
                  Vista previa
                </button>
              </div>
            </div>

            <div className="mt-3 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-3">
              <div className={`${activeTab === "form" ? "block" : "hidden"} lg:block`}>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Fecha</span>
                      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-premium h-11" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Hora</span>
                      <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="input-premium h-11" />
                    </label>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Celebración</span>
                      <select value={celebracion} onChange={(e) => setCelebracion(e.target.value)} className="input-premium h-11">
                        {CELEBRATIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Lugar</span>
                      <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} className="input-premium h-11" placeholder="Ej. Capilla" />
                    </label>
                  </div>

                  <label className="mt-2 block space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Observaciones</span>
                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="input-premium min-h-[72px] resize-none py-3" placeholder="Notas rápidas" />
                  </label>

                  <div className="mt-3 space-y-2">
                    {SECTION_CONFIG.map((section) => {
                      const result       = searchResults[section.key]
                      const isSearching  = searching[section.key]
                      const isNumericField = section.type === "numeric"
                      const suggestions  = titleSuggestions[section.key] || []
                      const showDropdown = activeSuggestionKey === section.key && suggestions.length > 0

                      return (
                        <div
                          key={section.key}
                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-2.5"
                          ref={(el) => { suggestionRefs.current[section.key] = el }}
                        >
                          <div className="flex items-center gap-2">
                            <Music4 size={14} className="text-[var(--gold)]" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">{section.label}</span>
                            {!isNumericField && (
                              <span className="ml-auto rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] px-2 py-0.5 text-[9px] text-[var(--text-secondary)]">texto libre</span>
                            )}
                          </div>

                          {/* Input: número o nombre del canto */}
                          <div className="relative mt-2">
                            <input
                              type="text"
                              inputMode={isNumericField ? "text" : "text"}
                              value={fields[section.key] || ""}
                              onChange={(e) => handleFieldChange(section.key, e.target.value)}
                              onFocus={() => {
                                if (suggestions.length > 0) setActiveSuggestionKey(section.key)
                              }}
                              placeholder={isNumericField ? "Nº o nombre del canto" : "Texto libre o Nº de canto"}
                              className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--gold)]"
                            />
                            {isSearching && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 size={14} className="animate-spin text-[var(--gold)]" />
                              </span>
                            )}

                            {/* Dropdown de sugerencias por nombre */}
                            {showDropdown && (
                              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-xl overflow-hidden">
                                {suggestions.map((song) => (
                                  <button
                                    key={`sug-${section.key}-${song.numero}`}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      handleSelectTitleSuggestion(section.key, song)
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--bg-muted)]"
                                  >
                                    <span className="min-w-[28px] rounded-full bg-[var(--gold)]/10 px-1.5 py-0.5 text-center text-[10px] font-bold text-[var(--gold)]">
                                      {song.numero}
                                    </span>
                                    <span className="flex-1 truncate text-[12px] font-semibold text-[var(--text-primary)]">{song.titulo}</span>
                                    {song.categoria && (
                                      <span className="text-[9px] text-[var(--text-secondary)] shrink-0">{song.categoria}</span>
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
                                <div className="font-semibold text-[var(--gold)]">{result.value} • {result.firstTitle}</div>
                                {result.matches.length > 1 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.matches.map((item) => (
                                      <button
                                        key={`${section.key}-${item.numero}`}
                                        type="button"
                                        onClick={() => handleFieldChange(section.key, String(item.numero))}
                                        className="rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] text-[var(--text-primary)]"
                                      >
                                        {item.numero}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : result?.kind === "title-search" ? (
                              <span className="text-[var(--gold)]">Selecciona un canto de la lista</span>
                            ) : result?.kind === "not-found" ? (
                              <span>Canto no encontrado</span>
                            ) : result?.kind === "custom" ? (
                              <span>Texto libre listo para guardar</span>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button onClick={clearForm} className="btn-secondary flex-1 py-2.5 text-[10px]">Cancelar</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-[2] py-2.5 text-[10px]">
                      {saving ? "Guardando…" : editingId ? "Actualizar" : "Guardar"}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`${activeTab === "preview" ? "block" : "hidden"} lg:block`}>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3">
                  <div className="flex items-center gap-2 text-[var(--gold)]">
                    <Sparkles size={15} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">Vista previa compacta</span>
                  </div>

                  <div className="mt-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Resumen</p>
                        <h3 className="title-professional title-gold-black text-xl">{celebracion || "Celebración"}</h3>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-2 text-right text-[10px] text-[var(--text-secondary)]">
                        <div>{formatDate(fecha) || "Fecha"}</div>
                        <div className="font-semibold text-[var(--gold)]">{hora || "Hora"}</div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                      <div className="flex items-center gap-2"><CalendarDays size={14} className="text-[var(--gold)]" /> {formatDate(fecha) || "Fecha pendiente"}</div>
                      <div className="flex items-center gap-2"><Clock3 size={14} className="text-[var(--gold)]" /> {hora || "Hora pendiente"}</div>
                      <div className="flex items-center gap-2"><MapPin size={14} className="text-[var(--gold)]" /> {lugar || "Lugar pendiente"}</div>
                      {observaciones ? <div className="flex items-start gap-2"><MessageSquareText size={14} className="text-[var(--gold)] mt-0.5" /> {observaciones}</div> : null}
                    </div>

                    <div className="mt-3 space-y-2">
                      {previewSections.filter((section) => section.value).map((section) => (
                        <div key={section.key} className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">{section.label}</span>
                          <span className="ml-2 truncate text-right text-[var(--text-primary)]">{section.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="card-premium p-3 sm:p-4">
          <div className="flex flex-col gap-3 border-b border-[var(--border-color)] pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Historial</p>
              <h2 className="title-professional title-gold-black text-xl sm:text-2xl">Hojas guardadas</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-sm">
                <Search size={14} className="text-[var(--gold)]" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar" className="w-full bg-transparent text-sm outline-none" />
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-sm">
                <Filter size={14} className="text-[var(--gold)]" />
                <select value={celebrationFilter} onChange={(e) => setCelebrationFilter(e.target.value)} className="bg-transparent text-sm outline-none">
                  <option value="todos">Todas</option>
                  {CELEBRATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] py-10 text-center text-sm text-[var(--text-secondary)]">
              <FileText size={28} className="mx-auto mb-2 text-[var(--gold)]" />
              <p className="font-semibold">Todavía no hay hojas de cantos registradas.</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {filteredRecords.map((item) => {
                const details = detailMap[item.id] || []
                return (
                  <div key={item.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">{item.celebracion || "Celebración"}</p>
                        <h3 className="title-professional title-gold-black text-lg">{formatDate(item.fecha) || "Fecha pendiente"}</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.lugar || "Lugar pendiente"}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-2 text-right text-[10px] text-[var(--text-secondary)]">
                        <div>{item.hora || "--:--"}</div>
                        <div className="font-semibold text-[var(--gold)]">{details.length} cantos</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => handleView(item)} className="btn-secondary flex-1 min-w-[120px] py-2.5 text-[10px]">
                        <Eye size={12} /> Ver
                      </button>
                      <button onClick={() => handleDownloadPdf(item)} className="btn-secondary flex-1 min-w-[120px] py-2.5 text-[10px]">
                        <Download size={12} /> PDF
                      </button>
                      {isCreateAllowed && (
                        <button onClick={() => populateFormFromRecord(item)} className="btn-secondary flex-1 min-w-[120px] py-2.5 text-[10px]">
                          Editar
                        </button>
                      )}
                      {isCreateAllowed && (
                        <button onClick={() => handleDuplicate(item)} className="btn-secondary flex-1 min-w-[120px] py-2.5 text-[10px]">
                          Duplicar
                        </button>
                      )}
                      {isDeleteAllowed && (
                        <button onClick={() => handleDelete(item.id)} className="btn-danger flex-1 min-w-[120px] py-2.5 text-[10px]">
                          <Trash2 size={12} /> Eliminar
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

      {selectedRecord && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="absolute right-4 top-4 z-50 rounded-full bg-[var(--bg-surface)] p-2 text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-muted)]"
            >
              ✕
            </button>

            <div className="max-h-[90vh] overflow-y-auto p-4 pt-16">
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Vista previa</p>
                <h3 className="title-professional title-gold-black text-2xl">{selectedRecord.celebracion || "Celebración"}</h3>
              </div>

              <div className="mt-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><span className="font-semibold text-[var(--gold)]">Fecha:</span> {formatDate(selectedRecord.fecha)}</div>
                  <div><span className="font-semibold text-[var(--gold)]">Hora:</span> {selectedRecord.hora}</div>
                  <div><span className="font-semibold text-[var(--gold)]">Lugar:</span> {selectedRecord.lugar}</div>
                  <div><span className="font-semibold text-[var(--gold)]">Observaciones:</span> {selectedRecord.observaciones || "—"}</div>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {(detailMap[selectedRecord.id] || []).map((detail, index) => {
                  const sectionDef = SECTION_MAP[detail.tipo]
                  const sectionLabel = sectionDef?.label || detail.tipo || "Sección"
                  const isNumeric = detail.numero_canto !== null && detail.numero_canto !== undefined
                  const rawValue = isNumeric ? String(detail.numero_canto) : (detail.texto_manual || "")
                  const song = isNumeric ? lyricsCache[rawValue] : null
                  const contentText = isNumeric ? (song?.letra_markdown || song?.letra || "") : (detail.texto_manual || "")

                  return (
                    <div key={`${selectedRecord.id}-${index}`} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3 text-sm">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">{sectionLabel}</p>
                          <p className="mt-1 text-sm font-semibold">
                            {isNumeric ? `${rawValue}${song?.titulo ? ` • ${song.titulo}` : ''}` : rawValue || 'Texto libre'}
                          </p>
                        </div>
                        {isNumeric && song?.categoria ? (
                          <p className="text-[11px] text-[var(--text-secondary)]">{song.categoria}</p>
                        ) : null}
                      </div>

                      <div className="space-y-1 text-[13px] leading-6 text-[var(--text-primary)]">
                        {loadingLyrics[rawValue] ? (
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Loader2 size={14} className="animate-spin" /> Cargando letra…
                          </div>
                        ) : contentText ? (
                          renderPreviewText(contentText)
                        ) : (
                          <p className="text-[var(--text-secondary)]">No se encontró letra para este canto.</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => handleDownloadPdf(selectedRecord)} className="btn-primary w-full sm:w-auto px-3 py-2 text-[10px]">
                  Descargar PDF
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
