import { useState, useEffect, useRef } from "react"
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  X,
  Loader2,
  Calendar,
  ZoomIn,
  Download,
  Plus,
} from "lucide-react"
import { toast } from "react-hot-toast"

import BottomNav from "../components/BottomNav"
import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"
import { canManageGallery, canDeleteGallery } from "../services/permissions"

function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [user, setUser] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    file: null,
    preview: "",
  })

  const fileInputRef = useRef(null)

  useEffect(() => {
    loadUserAndPhotos()
  }, [])

  const loadUserAndPhotos = async () => {
    try {
      setLoading(true)
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      // Cargar fotografías desde la tabla public.galeria
      const { data, error } = await supabase
        .from("galeria")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setPhotos(data || [])
    } catch (err) {
      console.error("Error al cargar galería:", err)
      toast.error("Error al cargar las fotografías de la galería")
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP)")
      return
    }

    // Límite de tamaño: 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 10MB de tamaño")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setForm((prev) => ({
      ...prev,
      file,
      preview: objectUrl,
      titulo: prev.titulo || file.name.split(".")[0].replace(/[-_]/g, " "),
    }))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!form.file) {
      toast.error("Por favor selecciona una fotografía")
      return
    }

    try {
      setUploading(true)

      const fileExt = form.file.name.split(".").pop() || "jpg"
      const fileName = `coro-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `memories/${fileName}`

      // 1. Subir al bucket 'gallery'
      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(filePath, form.file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) throw uploadError

      // 2. Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from("gallery")
        .getPublicUrl(filePath)

      const imageUrl = publicUrlData?.publicUrl
      if (!imageUrl) throw new Error("No se pudo obtener la dirección pública de la imagen")

      // 3. Insertar registro en public.galeria
      const { data: inserted, error: insertError } = await supabase
        .from("galeria")
        .insert({
          titulo: form.titulo.trim() || "Fotografía de Coro Vive y Canta",
          descripcion: form.descripcion.trim() || null,
          imagen_url: imageUrl,
          uploaded_by: user?.id || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setPhotos((prev) => [inserted, ...prev])
      toast.success("¡Fotografía agregada a la galería con éxito!")

      // Limpiar formulario y cerrar modal
      setForm({ titulo: "", descripcion: "", file: null, preview: "" })
      setShowUploadModal(false)
    } catch (err) {
      console.error("Error al subir foto:", err)
      toast.error(err.message || "Error al subir la fotografía a la galería")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photo) => {
    if (!canDeleteGallery(user?.role)) {
      toast.error("No tienes permisos para eliminar fotografías de la galería")
      return
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar la fotografía "${photo.titulo || "sin título"}"?`)) {
      return
    }

    try {
      setDeletingId(photo.id)

      const { error } = await supabase
        .from("galeria")
        .delete()
        .eq("id", photo.id)

      if (error) throw error

      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null)
      }
      toast.success("Fotografía eliminada correctamente")
    } catch (err) {
      console.error("Error al eliminar foto:", err)
      toast.error("Error al intentar eliminar la fotografía")
    } finally {
      setDeletingId(null)
    }
  }

  const isAuthorizedToUpload = canManageGallery(user?.role)
  const isAuthorizedToDelete = canDeleteGallery(user?.role)

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-32 font-sans antialiased text-[var(--text-primary)] transition-colors duration-200">
      {/* HEADER DE LA GALERÍA */}
      <div className="page-header-gold rounded-b-[36px] px-5 sm:px-8 pt-6 pb-12 shadow-lg relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl header-text-primary">📸</span>
              <h1 className="title-professional title-gold-black text-2xl sm:text-3xl tracking-tight">
                Galería Oficial
              </h1>
            </div>
            <p className="header-text-secondary text-xs sm:text-sm mt-0.5">
              Memorias fotográficas de presentaciones, convivios y ensayos del Coro Vive y Canta
            </p>
          </div>

          {/* BOTÓN SUBIR FOTO (VISIBLE PARA ADMINISTRADOR, DIRECTOR Y SECRETARIA) */}
          {isAuthorizedToUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Plus size={18} />
              <span>Subir Fotografía</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ESTADO DE CARGA */}
        {loading ? (
          <div className="card-premium p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-[#D4AF37]" size={28} />
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Cargando fotografías oficiales…
            </p>
          </div>
        ) : photos.length === 0 ? (
          /* ESTADO VACÍO ELEGANTE */
          <div className="card-premium text-center py-16 px-6 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-4 border border-[#D4AF37]/30">
              <ImageIcon size={32} />
            </div>
            <h2 className="title-professional text-xl font-bold text-[var(--text-primary)]">
              Galería en preparación
            </h2>
            <p className="text-[var(--text-secondary)] text-xs mt-2 max-w-md mx-auto leading-relaxed">
              Las fotografías y grabaciones de presentaciones, ensayos y convivios del Coro Vive y Canta se exhibirán aquí.
            </p>
          </div>
        ) : (
          /* CUADRÍCULA DE FOTOGRAFÍAS */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="card-premium overflow-hidden group flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:border-[#D4AF37]/50"
              >
                <div
                  className="relative aspect-4/3 w-full overflow-hidden bg-[var(--bg-muted)] cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.imagen_url}
                    alt={photo.titulo || "Foto de galería"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs">
                      <ZoomIn size={18} />
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] leading-snug line-clamp-1 group-hover:text-[var(--gold)] transition-colors">
                      {photo.titulo || "Fotografía sin título"}
                    </h3>
                    {photo.descripcion && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1 leading-relaxed">
                        {photo.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-[var(--gold)]" />
                      <span>
                        {photo.created_at
                          ? new Date(photo.created_at).toLocaleDateString("es-HN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Fecha pendiente"}
                      </span>
                    </div>

                    {isAuthorizedToDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(photo)
                        }}
                        disabled={deletingId === photo.id}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer"
                        title="Eliminar fotografía"
                      >
                        {deletingId === photo.id ? (
                          <Loader2 size={14} className="animate-spin text-red-400" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE SUBIDA DE FOTO */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="page-header-gold px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={18} className="header-text-primary" />
                <h3 className="title-professional title-gold-black text-lg font-bold">
                  Subir Fotografía a la Galería
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!uploading) {
                    setShowUploadModal(false)
                    setForm({ titulo: "", descripcion: "", file: null, preview: "" })
                  }
                }}
                disabled={uploading}
                className="p-1 rounded-full text-[var(--header-text-primary)] hover:opacity-75 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* Selector de Archivo / Preview */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 ml-1">
                  Archivo de Imagen <span className="text-red-400">*</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {form.preview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-muted)] aspect-video flex items-center justify-center">
                    <img
                      src={form.preview}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-3 right-3 btn-secondary !py-1.5 !px-3 text-xs bg-black/70 text-white border-white/20 backdrop-blur-xs cursor-pointer"
                    >
                      Cambiar foto
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--gold)]/60 bg-[var(--bg-muted)]/50 p-8 text-center cursor-pointer transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-2 border border-[#D4AF37]/25">
                      <Upload size={20} />
                    </div>
                    <p className="font-bold text-xs text-[var(--text-primary)]">
                      Toca aquí para seleccionar una imagen
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Formatos compatibles: JPG, PNG o WebP (máximo 10MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Título de la Foto */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 ml-1">
                  Título de la Fotografía <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Convivio Navideño 2026, Misa de Pascua..."
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  className="input-premium w-full text-sm font-semibold"
                />
              </div>

              {/* Descripción Opcional */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 ml-1">
                  Descripción o Notas (Opcional)
                </label>
                <textarea
                  placeholder="Breve reseña sobre el lugar, acontecimiento o coro..."
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="input-premium w-full text-xs min-h-[70px] resize-none py-2"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary flex-1 py-3 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !form.file}
                  className="btn-primary flex-[2] py-3 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-black" />
                      <span>Subiendo foto…</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Publicar en Galería</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX DE FOTO A PANTALLA COMPLETA */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 border border-white/20 transition-all cursor-pointer"
              title="Cerrar visor"
            >
              <X size={18} />
            </button>

            <div className="w-full max-h-[65vh] overflow-hidden bg-black flex items-center justify-center">
              <img
                src={selectedPhoto.imagen_url}
                alt={selectedPhoto.titulo}
                className="max-h-[65vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="p-5 sm:p-6 bg-[var(--bg-card)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="title-professional text-xl font-bold text-[var(--text-primary)]">
                  {selectedPhoto.titulo || "Fotografía de Coro"}
                </h3>
                {selectedPhoto.descripcion && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl leading-relaxed">
                    {selectedPhoto.descripcion}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-[11px] text-[var(--text-muted)]">
                  <Calendar size={13} className="text-[var(--gold)]" />
                  <span>
                    {selectedPhoto.created_at
                      ? new Date(selectedPhoto.created_at).toLocaleDateString("es-HN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Fecha no disponible"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={selectedPhoto.imagen_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="btn-secondary !py-2.5 !px-4 text-xs inline-flex items-center gap-2"
                >
                  <Download size={14} />
                  <span>Descargar</span>
                </a>

                {isAuthorizedToDelete && (
                  <button
                    onClick={() => handleDelete(selectedPhoto)}
                    className="btn-danger !py-2.5 !px-4 text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Gallery
