import { useEffect, useMemo, useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  PlusCircle,
  RefreshCw,
  Calendar,
  Layers,
  Activity
} from "lucide-react"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Importación del logo del coro
import logoCoro from "../assets/logo.png"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageFinance } from "../services/permissions"
import { supabase } from "../lib/supabase"

function Finance() {
  const [user, setUser] = useState(null)
  const [monto, setMonto] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [categoria, setCategoria] = useState("")
  const [actividad, setActividad] = useState("")
  const [tipo, setTipo] = useState("ingreso")
  const [records, setRecords] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)

  // Filtros Avanzados
  const [filterTipo, setFilterTipo] = useState("todos")
  const [filterActividad, setFilterActividad] = useState("todos")
  const [filterTiempo, setFilterTiempo] = useState("todos") 

  useEffect(() => {
    loadUser()
    loadRecords()
  }, [])

  const loadUser = async () => {
    const profile = await getCurrentUser()
    setUser(profile)
  }

  const loadRecords = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("financial_records")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setRecords(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) {
      return alert("Por favor, ingrese un monto válido mayor a 0.")
    }
    if (!categoria) {
      return alert("Por favor, seleccione una categoría.")
    }

    try {
      const payload = {
        tipo,
        categoria,
        actividad: actividad.trim() || categoria,
        monto: Number(monto),
        descripcion: descripcion.trim(),
      }

      let error = null

      if (editingId) {
        const { error: updateError } = await supabase
          .from("financial_records")
          .update(payload)
          .eq("id", editingId)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from("financial_records")
          .insert([
            {
              ...payload,
              created_by: user?.id,
            },
          ])
        error = insertError
      }

      if (error) {
        console.error(error)
        return alert("Error al guardar en la base de datos.")
      }

      setMonto("")
      setDescripcion("")
      setCategoria("")
      setActividad("")
      setTipo("ingreso")
      setEditingId(null)

      await loadRecords()
      alert(editingId ? "¡Registro actualizado!" : "¡Registro guardado!")
    } catch (err) {
      console.error(err)
      alert("Ocurrió un error inesperado.")
    }
  }

  const handleDelete = async (id) => {
    const confirmDelete = confirm("¿Eliminar este movimiento?")
    if (!confirmDelete) return

    const { error } = await supabase
      .from("financial_records")
      .delete()
      .eq("id", id)

    if (error) {
      alert("No se pudo eliminar el registro.")
    } else {
      loadRecords()
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setTipo(item.tipo)
    setMonto(String(item.monto))
    setDescripcion(item.descripcion || "")
    setCategoria(item.categoria || "")
    setActividad(item.actividad || "")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  // Actividades dinámicas desde la DB para el select del filtro
  const actividadesDisponibles = useMemo(() => {
    const listas = records.map((r) => r.actividad || r.categoria).filter(Boolean)
    return Array.from(new Set(listas))
  }, [records])

  // Lógica de Filtrado Avanzado (Tiempo + Actividad + Tipo)
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterTipo !== "todos" && r.tipo !== filterTipo) return false
      
      const actNorm = r.actividad || r.categoria
      if (filterActividad !== "todos" && actNorm !== filterActividad) return false

      if (filterTiempo !== "todos" && r.created_at) {
        const recordDate = new Date(r.created_at)
        const now = new Date()

        if (filterTiempo === "semana") {
          const unaSemanaAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (recordDate < unaSemanaAtras) return false
        } else if (filterTiempo === "mes") {
          if (recordDate.getMonth() !== now.getMonth() || recordDate.getFullYear() !== now.getFullYear()) return false
        } else if (filterTiempo === "ano") {
          if (recordDate.getFullYear() !== now.getFullYear()) return false
        }
      }
      return true
    })
  }, [records, filterTipo, filterActividad, filterTiempo])

  // Recalcular Totales según filtros
  const { ingresos, gastos, balance } = useMemo(() => {
    let ing = 0
    let gas = 0
    filteredRecords.forEach((r) => {
      const val = Number(r.monto) || 0
      if (r.tipo === "ingreso") ing += val
      if (r.tipo === "gasto") gas += val
    })
    return { ingresos: ing, gastos: gas, balance: ing - gas }
  }, [filteredRecords])

  // Resumen de Auditoría Inteligente
  const resumenInteligente = useMemo(() => {
    if (filteredRecords.length === 0) return "No hay transacciones registradas para este periodo de auditoría."
    if (balance > 0 && gastos === 0) return "Excelente desempeño operacional. Se registran 100% ingresos sin egresos en este intervalo."
    if (balance > 0) {
      const porcentajeGasto = ((gastos / ingresos) * 100).toFixed(1)
      return "Salud financiera estable. Se ha consumido el " + porcentajeGasto + "% de los ingresos totales en gastos operativos."
    }
    if (balance < 0) {
      return "Alerta de déficit acumulado: Los egresos superan los ingresos en el periodo seleccionado. Se sugiere auditar prioridades."
    }
    return "Balance neutro equilibrado: Los ingresos y egresos se encuentran exactamente en proporción 1:1."
  }, [filteredRecords, balance, ingresos, gastos])

  // Lógica del gráfico adaptativa si ingresos y gastos están en 0
  const chartData = useMemo(() => {
    if (ingresos === 0 && gastos === 0) {
      return [{ name: "Sin datos", value: 1 }]
    }
    return [
      { name: "Ingresos", value: ingresos },
      { name: "Gastos", value: gastos },
    ]
  }, [ingresos, gastos])

  const COLORS = useMemo(() => {
    if (ingresos === 0 && gastos === 0) return ["#9ca3af"] 
    return ["#D4AF37", "#ef4444"] 
  }, [ingresos, gastos])

  // Función procesadora del Logo e Impresión del PDF
  const exportarPDF = () => {
    try {
      const doc = new jsPDF()
      const fechaActual = new Date()
      const strFecha = fechaActual.toISOString().split('T')[0] 
      const nombreArchivo = "Reporte_Financiero_" + strFecha + ".pdf"

      // Renderizado de Barra de Encabezado de Color Institucional
      doc.setFillColor(184, 134, 11) 
      doc.rect(0, 0, 220, 28, "F")
      
      // Añadir el Logo de forma segura al Header del documento
      try {
        doc.addImage(logoCoro, "PNG", 14, 4, 20, 20)
      } catch (e) {
        console.warn("No se pudo renderizar la imagen en formato PNG directo, intentando fallback de renderizado.", e)
      }

      // Título al lado del Logo
      doc.setFont("times", "bold")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.text("CORO VIVE Y CANTA", 40, 13)
      doc.setFontSize(11)
      doc.setFont("times", "italic")
      doc.text("Auditoría de Control Financiero Interno", 40, 19)

      // Metadata del Reporte Contable
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(10)
      doc.setFont("times", "normal")
      doc.text("Fecha de Emisión: " + fechaActual.toLocaleString("es-HN"), 14, 38)
      doc.text("Auditor Responsable: " + (user?.email || "Administrador General"), 14, 44)
      doc.text("Filtros Aplicados: Tiempo (" + filterTiempo.toUpperCase() + ") | Actividad (" + filterActividad.toUpperCase() + ")", 14, 50)

      doc.setDrawColor(212, 175, 55)
      doc.line(14, 55, 196, 55)
      
      // Estado de Cuentas Consolidadas
      doc.setFont("times", "bold")
      doc.setFontSize(12)
      doc.text("ESTADO DE BALANCE GENERAL", 14, 64)
      
      doc.setFont("times", "normal")
      doc.setFontSize(11)
      doc.text("Total Ingresos Consolidados: L " + ingresos.toLocaleString(), 14, 72)
      doc.text("Total Gastos Operativos:        L " + gastos.toLocaleString(), 14, 78)
      
      doc.setFont("times", "bold")
      doc.text("Balance Neto Recalculado:     L " + balance.toLocaleString(), 14, 86)
      
      doc.line(14, 92, 196, 92)
      doc.text("ANEXO: HISTORIAL DE MOVIMIENTOS CONTABLES", 14, 100)

      const tableRows = filteredRecords.map((item, index) => [
        index + 1,
        new Date(item.created_at).toLocaleDateString("es-HN"),
        item.tipo.toUpperCase(),
        item.actividad || item.categoria || "General",
        item.descripcion || "Sin observaciones",
        "L " + Number(item.monto).toLocaleString()
      ])

      // Estructuración de tabla autotable adaptada a la nueva altura
      autoTable(doc, {
        startY: 106,
        head: [["#", "Fecha", "Tipo", "Actividad / Categoría", "Descripción", "Monto"]],
        body: tableRows,
        styles: { font: "times", fontSize: 9 },
        headStyles: { fillColor: [184, 134, 11], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 248, 242] },
        columnStyles: {
          5: { halign: "right", fontStyle: "bold" }
        }
      })

      doc.save(nombreArchivo)
    } catch (pdfError) {
      console.error("Error PDF: ", pdfError)
      alert("Error al estructurar el PDF corporativo.")
    }
  }

  // Estilos limpios para VS Code
  const getCardStyle = (tipoItem) => {
    let b = "bg-white rounded-[22px] p-4 shadow-sm border-l-4 transition hover:shadow-md flex justify-between items-center "
    return b + (tipoItem === "ingreso" ? "border-l-green-500" : "border-l-red-500")
  }

  const getBadgeStyle = (tipoItem) => {
    let b = "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider "
    return b + (tipoItem === "ingreso" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")
  }

  const getMontoStyle = (tipoItem) => {
    let b = "font-extrabold text-base "
    return b + (tipoItem === "ingreso" ? "text-green-600" : "text-red-500")
  }

  return (
    <div className="min-h-screen bg-[#F8F4E9] p-4 md:p-8 pb-32 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl text-[#B8860B]">♪</span>
            <h1 className="text-3xl font-extrabold text-[#B8860B] tracking-tight">Control Contable</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">Gestión financiera avanzada para Coro Vive y Canta</p>
        </div>

        <button
          onClick={exportarPDF}
          className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-white px-5 py-3 rounded-2xl font-semibold shadow-md hover:opacity-90 transition w-full sm:w-auto"
        >
          <FileText size={18} />
          Exportar PDF Profesional
        </button>
      </div>

      {/* Grid Principal Superior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Card Premium de Balance */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8860B] rounded-[30px] p-6 text-white shadow-xl flex flex-col justify-between min-h-[140px]">
            <div>
              <p className="text-white/80 font-medium tracking-wide uppercase text-xs">Balance Neto Recalculado</p>
              <h2 className="text-4xl font-black mt-2 tracking-tight">
                L {balance.toLocaleString()}
              </h2>
            </div>
          </div>

          {/* Panel de Auditoría Inteligente */}
          <div className="bg-white rounded-[25px] p-5 shadow-sm border border-amber-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
              <Activity size={14} /> Auditoría del Sistema
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">{resumenInteligente}</p>
          </div>
        </div>

        {/* Listado de Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:col-span-1">
          <div className="bg-white rounded-[25px] p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">Ingresos</p>
              <h3 className="font-black text-xl text-green-600 mt-0.5">L {ingresos.toLocaleString()}</h3>
            </div>
            <div className="bg-green-50 p-2.5 rounded-xl"><TrendingUp className="text-green-500" size={20} /></div>
          </div>

          <div className="bg-white rounded-[25px] p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">Gastos</p>
              <h3 className="font-black text-xl text-red-500 mt-0.5">L {gastos.toLocaleString()}</h3>
            </div>
            <div className="bg-red-50 p-2.5 rounded-xl"><TrendingDown className="text-red-500" size={20} /></div>
          </div>

          <div className="bg-white rounded-[25px] p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">Neto Actual</p>
              <h3 className="font-black text-xl text-[#B8860B] mt-0.5">L {balance.toLocaleString()}</h3>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl"><Wallet className="text-[#B8860B]" size={20} /></div>
          </div>
        </div>

        {/* Gráfico Seguro Recharts (Sin Warnings) */}
        <div className="bg-white rounded-[30px] p-5 shadow-sm border border-gray-100 lg:col-span-1 flex flex-col justify-center items-center min-w-0">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2 text-center">Distribución de Recursos</p>
          <div className="h-[160px] w-full max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" outerRadius={55} innerRadius={35} paddingAngle={5}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => ingresos === 0 && gastos === 0 ? "Sin movimientos" : "L " + value.toLocaleString()} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Flujo de Operaciones Avanzadas e Historial */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6 items-start">
        
        {/* Formulario Dinámico Administrativo */}
        {canManageFinance(user?.role) && (
          <div className="bg-white rounded-[30px] p-6 shadow-md border border-amber-100 xl:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle className="text-[#B8860B]" size={20} />
              <h2 className="font-bold text-gray-800 text-lg">{editingId ? "Modificar Registro" : "Nuevo Registro"}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Tipo de Movimiento</label>
                <select
                  value={tipo}
                  onChange={(e) => {
                    setTipo(e.target.value)
                    setCategoria("")
                  }}
                  className="w-full p-3 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-medium"
                >
                  <option value="ingreso">🟢 Ingreso</option>
                  <option value="gasto">🔴 Gasto</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Categoría Base</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-medium"
                >
                  <option value="">Seleccionar opción</option>
                  {tipo === "ingreso" ? (
                    <>
                      <option value="Misa">Misa</option>
                      <option value="Concierto">Concierto</option>
                      <option value="Donación">Donación</option>
                      <option value="Actividad económica">Actividad económica</option>
                      <option value="Otro">Otro</option>
                    </>
                  ) : (
                    <>
                      <option value="Transporte">Transporte</option>
                      <option value="Alimentación">Alimentación</option>
                      <option value="Sonido">Sonido</option>
                      <option value="Uniformes">Uniformes</option>
                      <option value="Instrumentos">Instrumentos</option>
                      <option value="Otro">Otro</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Actividad Específica (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Ensayo General / Misa Patronal"
                  value={actividad}
                  onChange={(e) => setActividad(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Monto (L.)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Descripción del Movimiento</label>
                <input
                  type="text"
                  placeholder="Detalles adicionales..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setMonto("")
                      setDescripcion("")
                      setCategoria("")
                      setActividad("")
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-bold"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="flex-1 text-white py-3 rounded-xl text-sm font-bold bg-[#D4AF37] hover:bg-[#B8860B] transition"
                >
                  {editingId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listado con Panel de Control de Filtros */}
        <div className={canManageFinance(user?.role) ? "xl:col-span-2 space-y-4" : "xl:col-span-3 space-y-4"}>
          
          {/* Bloque Completo de Filtros Avanzados */}
          <div className="bg-white p-4 rounded-[25px] shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center justify-between">
            
            <div className="flex-1 min-w-[120px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1"><Layers size={10}/> Tipo</span>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full bg-[#F8F4E9] p-2 rounded-xl text-xs font-semibold border-none outline-none"
              >
                <option value="todos">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="gasto">Gastos</option>
              </select>
            </div>

            <div className="flex-1 min-w-[130px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1"><Activity size={10}/> Actividad</span>
              <select
                value={filterActividad}
                onChange={(e) => setFilterActividad(e.target.value)}
                className="w-full bg-[#F8F4E9] p-2 rounded-xl text-xs font-semibold border-none outline-none"
              >
                <option value="todos">Todas</option>
                {actividadesDisponibles.map((act) => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[130px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1"><Calendar size={10}/> Tiempo</span>
              <select
                value={filterTiempo}
                onChange={(e) => setFilterTiempo(e.target.value)}
                className="w-full bg-[#F8F4E9] p-2 rounded-xl text-xs font-semibold border-none outline-none"
              >
                <option value="todos">Historial Completo</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mes</option>
                <option value="ano">Este Año</option>
              </select>
            </div>

            <button 
              onClick={loadRecords}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-gray-600 mt-4 md:mt-0"
              title="Actualizar Datos"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Renderizado Seguro del Historial de Cuentas */}
          <div className="space-y-3 overflow-y-auto max-h-[480px] pr-1">
            {filteredRecords.length === 0 ? (
              <div className="bg-white rounded-[25px] p-8 text-center border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">No se encontraron movimientos registrados.</p>
              </div>
            ) : (
              filteredRecords.map((item) => (
                <div
                  key={item.id}
                  className={getCardStyle(item.tipo)}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={getBadgeStyle(item.tipo)}>
                        {item.tipo}
                      </span>
                      <span className="text-[11px] text-[#B8860B] font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                        {item.actividad || item.categoria || "General"}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium text-sm pt-0.5">{item.descripcion || "Sin comentarios"}</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {new Date(item.created_at).toLocaleDateString("es-HN")}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2.5">
                    <p className={getMontoStyle(item.tipo)}>
                      {item.tipo === "ingreso" ? "+" : "-"} L {Number(item.monto).toLocaleString()}
                    </p>
                    
                    {canManageFinance(user?.role) && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      <BottomNav />
    </div>
  )
}

export default Finance