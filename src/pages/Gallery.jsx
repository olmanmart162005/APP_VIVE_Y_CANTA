import { useState, useEffect, useRef, useMemo, useCallback } from "react"
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
  MapPin,
  FolderOpen,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Star,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Images,
  FolderPlus,
  ArrowUpDown,
} from "lucide-react"
import { toast } from "react-hot-toast"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageGallery, canDeleteGallery } from "../services/permissions"
import {
  fetchAlbumsAndPhotos,
  createAlbumWithPhotos,
  addPhotosToExistingAlbum,
  updateAlbumDetails,
  deleteSinglePhoto,
  deleteCompleteAlbum,
  moveLegacyPhotosToAlbum,
  validateImageFile,
  downloadPhotoToDevice,
  triggerNativePhotoShare,
  detectMobilePlatform,
} from "../services/galleryService"

/**
 * Formatea una fecha YYYY-MM-DD en formato elegante en español
 * Ejemplo: "2026-11-04" -> "4 de noviembre de 2026"
 */
function formatActivityDate(dateStr) {
  if (!dateStr) return "Fecha sin especificar"
  try {
    const clean = String(dateStr).slice(0, 10)
    const parts = clean.split("-")
    if (parts.length === 3) {
      const year = Number(parts[0])
      const month = Number(parts[1]) - 1
      const day = Number(parts[2])
      const dateObj = new Date(year, month, day)
      return dateObj.toLocaleDateString("es-HN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    }
    return new Date(dateStr).toLocaleDateString("es-HN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

/**
 * Formatea el tamaño de archivo en KB o MB
 */
function formatFileSize(bytes = 0) {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Gallery() {
  const [albums, setAlbums] = useState([])
  const [totalPhotosCount, setTotalPhotosCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  // Álbum actualmente abierto en vista detallada
  const [activeAlbumId, setActiveAlbumId] = useState(null)

  // Buscador, filtros y ordenamiento (Sección 9)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedYear, setSelectedYear] = useState("todos")
  const [selectedDate, setSelectedDate] = useState("")
  const [sortBy, setSortBy] = useState("recent") // "recent" | "oldest" | "most_photos" | "name_asc"

  // Estado de modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false)
  const [showEditAlbumModal, setShowEditAlbumModal] = useState(false)
  const [albumToDelete, setAlbumToDelete] = useState(null)
  const [photoToDelete, setPhotoToDelete] = useState(null)
  const [showMoveLegacyModal, setShowMoveLegacyModal] = useState(false)
  const [targetMoveAlbumId, setTargetMoveAlbumId] = useState("")

  // Estado del visor Lightbox (índice de la foto dentro del álbum activo)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const touchStartXRef = useRef(null)
  const touchEndXRef = useRef(null)

  // Estados de descarga de fotografías (Android / iPhone / PWA / Escritorio)
  const [downloadingPhotoId, setDownloadingPhotoId] = useState(null)
  const [downloadingAlbum, setDownloadingAlbum] = useState(false)
  const [albumDownloadProgress, setAlbumDownloadProgress] = useState({ current: 0, total: 0 })
  const [iosSaveModalData, setIosSaveModalData] = useState(null)

  // Formulario para Crear Álbum
  const [createForm, setCreateForm] = useState({
    nombre: "",
    descripcion: "",
    fecha_actividad: new Date().toISOString().slice(0, 10),
    lugar: "",
    coverFile: null,
    coverPreview: "",
    coverIndex: 0, // Índice de la foto seleccionada como portada si no sube portada aparte
  })

  // Lista de archivos seleccionados para subir: [{ id, file, preview, name, size, status, progress, error }]
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [overallProgress, setOverallProgress] = useState({ completed: 0, total: 0, percent: 0 })
  const isCancelledRef = useRef(false)

  // Formulario para Editar Álbum
  const [editForm, setEditForm] = useState({
    nombre: "",
    descripcion: "",
    fecha_actividad: "",
    lugar: "",
    newCoverFile: null,
    newCoverPreview: "",
    selectedCoverPhotoId: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingBusy, setDeletingBusy] = useState(false)

  // Referencias a inputs de archivo
  const multiplePhotosInputRef = useRef(null)
  const customCoverInputRef = useRef(null)
  const editCoverInputRef = useRef(null)
  const addMorePhotosInputRef = useRef(null)

  const isAuthorizedToManage = canManageGallery(user?.role)
  const isAuthorizedToDelete = canDeleteGallery(user?.role)

  // Cargar usuario y álbumes al iniciar
  const loadGalleryData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const [currentUser, galleryData] = await Promise.all([
        getCurrentUser(),
        fetchAlbumsAndPhotos(),
      ])
      setUser(currentUser)
      setAlbums(galleryData.albums || [])
      setTotalPhotosCount(galleryData.totalPhotos || 0)
    } catch (err) {
      console.error("Error al cargar álbumes de la galería:", err)
      toast.error("No se pudieron cargar los álbumes fotográficos")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGalleryData()
  }, [loadGalleryData])

  // Limpiar ObjectURLs al desmontar
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview)
      })
      if (createForm.coverPreview) URL.revokeObjectURL(createForm.coverPreview)
      if (editForm.newCoverPreview) URL.revokeObjectURL(editForm.newCoverPreview)
    }
  }, [])

  // Álbum activo seleccionado
  const activeAlbum = useMemo(
    () => albums.find((a) => a.id === activeAlbumId) || null,
    [albums, activeAlbumId]
  )

  // Años disponibles para el filtro por año
  const availableYears = useMemo(() => {
    const yearsSet = new Set()
    albums.forEach((alb) => {
      const year = alb.fecha_actividad ? String(alb.fecha_actividad).slice(0, 4) : ""
      if (/^\d{4}$/.test(year)) {
        yearsSet.add(year)
      }
    })
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a))
  }, [albums])

  // Álbumes filtrados y ordenados
  const filteredAlbums = useMemo(() => {
    let list = [...albums]

    // 1. Buscador por nombre, lugar o descripción
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (alb) =>
          (alb.nombre || "").toLowerCase().includes(q) ||
          (alb.lugar || "").toLowerCase().includes(q) ||
          (alb.descripcion || "").toLowerCase().includes(q)
      )
    }

    // 2. Filtro por año
    if (selectedYear !== "todos") {
      list = list.filter((alb) => String(alb.fecha_actividad || "").startsWith(selectedYear))
    }

    // 3. Filtro por fecha exacta
    if (selectedDate) {
      list = list.filter((alb) => String(alb.fecha_actividad || "").slice(0, 10) === selectedDate)
    }

    // 4. Ordenamiento
    list.sort((a, b) => {
      if (sortBy === "oldest") {
        return String(a.fecha_actividad || "").localeCompare(String(b.fecha_actividad || ""))
      }
      if (sortBy === "most_photos") {
        return (b.fotos_count || 0) - (a.fotos_count || 0)
      }
      if (sortBy === "name_asc") {
        return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es")
      }
      // Por defecto: más recientes primero
      const dateCmp = String(b.fecha_actividad || "").localeCompare(String(a.fecha_actividad || ""))
      if (dateCmp !== 0) return dateCmp
      return String(b.created_at || "").localeCompare(String(a.created_at || ""))
    })

    return list
  }, [albums, searchQuery, selectedYear, selectedDate, sortBy])

  // ---------------------------------------------------------------------------
  // MANEJO DE ARCHIVOS MÚLTIPLES (SELECCIÓN, VALIDACIÓN Y DESCARTE DE DUPLICADOS)
  // ---------------------------------------------------------------------------
  const handleSelectMultipleFiles = (e) => {
    const fileList = Array.from(e.target.files || [])
    if (!fileList.length) return

    const existingKeys = new Set(
      selectedFiles.map((item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}`)
    )

    const validNewItems = []
    const errors = []

    for (const file of fileList) {
      const key = `${file.name}-${file.size}-${file.lastModified}`
      if (existingKeys.has(key)) {
        continue // Evitar archivos duplicados en la selección
      }

      const check = validateImageFile(file)
      if (!check.valid) {
        errors.push(check.error)
        continue
      }

      existingKeys.add(key)
      validNewItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        status: "pending", // "pending" | "optimizing" | "uploading" | "completed" | "error"
        progress: 0,
        error: null,
      })
    }

    if (errors.length > 0) {
      toast.error(errors[0])
    }

    if (validNewItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validNewItems])
      toast.success(
        validNewItems.length === 1
          ? "1 fotografía agregada a la selección"
          : `${validNewItems.length} fotografías agregadas a la selección`
      )
    }

    // Limpiar el valor del input para permitir volver a elegir archivos
    e.target.value = ""
  }

  const handleRemoveSelectedFile = (indexToRemove) => {
    if (uploading) return
    setSelectedFiles((prev) => {
      const target = prev[indexToRemove]
      if (target?.preview) URL.revokeObjectURL(target.preview)
      const next = prev.filter((_, idx) => idx !== indexToRemove)
      return next
    })
    setCreateForm((prev) => {
      if (prev.coverIndex === indexToRemove) {
        return { ...prev, coverIndex: 0 }
      }
      if (prev.coverIndex > indexToRemove) {
        return { ...prev, coverIndex: prev.coverIndex - 1 }
      }
      return prev
    })
  }

  const handleSelectCustomCover = (e, isEdit = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    const check = validateImageFile(file)
    if (!check.valid) {
      toast.error(check.error)
      e.target.value = ""
      return
    }

    const previewUrl = URL.createObjectURL(file)
    if (isEdit) {
      setEditForm((prev) => {
        if (prev.newCoverPreview) URL.revokeObjectURL(prev.newCoverPreview)
        return {
          ...prev,
          newCoverFile: file,
          newCoverPreview: previewUrl,
          selectedCoverPhotoId: "",
        }
      })
    } else {
      setCreateForm((prev) => {
        if (prev.coverPreview) URL.revokeObjectURL(prev.coverPreview)
        return {
          ...prev,
          coverFile: file,
          coverPreview: previewUrl,
        }
      })
    }
    e.target.value = ""
  }

  const resetCreateModalState = () => {
    selectedFiles.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview)
    })
    if (createForm.coverPreview) URL.revokeObjectURL(createForm.coverPreview)

    setSelectedFiles([])
    setCreateForm({
      nombre: "",
      descripcion: "",
      fecha_actividad: new Date().toISOString().slice(0, 10),
      lugar: "",
      coverFile: null,
      coverPreview: "",
      coverIndex: 0,
    })
    setOverallProgress({ completed: 0, total: 0, percent: 0 })
    isCancelledRef.current = false
  }

  // ---------------------------------------------------------------------------
  // CREAR ÁLBUM Y SUBIR LOTE DE FOTOGRAFÍAS
  // ---------------------------------------------------------------------------
  const handleCreateAlbumSubmit = async (e) => {
    e.preventDefault()
    if (!createForm.nombre.trim()) {
      toast.error("Ingresa el nombre de la actividad")
      return
    }
    if (selectedFiles.length === 0) {
      toast.error("Selecciona al menos una fotografía para el álbum")
      return
    }

    try {
      setUploading(true)
      isCancelledRef.current = false
      setOverallProgress({ completed: 0, total: selectedFiles.length, percent: 0 })

      const createdId = await createAlbumWithPhotos({
        nombre: createForm.nombre,
        descripcion: createForm.descripcion,
        fecha_actividad: createForm.fecha_actividad,
        lugar: createForm.lugar,
        coverFile: createForm.coverFile,
        coverIndex: createForm.coverIndex,
        files: selectedFiles,
        userId: user?.id || null,
        isCancelledRef,
        onPhotoProgress: (idx, stateUpdate) => {
          setSelectedFiles((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, ...stateUpdate } : item))
          )
        },
        onOverallProgress: (prog) => {
          setOverallProgress(prog)
        },
      })

      toast.success(
        `¡Álbum "${createForm.nombre.trim()}" creado con ${selectedFiles.length} ${
          selectedFiles.length === 1 ? "fotografía" : "fotografías"
        }!`
      )

      setShowCreateModal(false)
      resetCreateModalState()
      await loadGalleryData(true)

      if (createdId) {
        setActiveAlbumId(createdId)
      }
    } catch (err) {
      console.error("Error al crear álbum:", err)
      toast.error(err.message || "Error al guardar el álbum y sus fotografías")
    } finally {
      setUploading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // AGREGAR MÁS FOTOGRAFÍAS A UN ÁLBUM EXISTENTE
  // ---------------------------------------------------------------------------
  const handleAddPhotosSubmit = async (e) => {
    e.preventDefault()
    if (!activeAlbum || selectedFiles.length === 0) {
      toast.error("Selecciona al menos una fotografía para subir")
      return
    }

    try {
      setUploading(true)
      isCancelledRef.current = false
      setOverallProgress({ completed: 0, total: selectedFiles.length, percent: 0 })

      await addPhotosToExistingAlbum({
        album: activeAlbum,
        files: selectedFiles,
        userId: user?.id || null,
        isCancelledRef,
        onPhotoProgress: (idx, stateUpdate) => {
          setSelectedFiles((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, ...stateUpdate } : item))
          )
        },
        onOverallProgress: (prog) => {
          setOverallProgress(prog)
        },
      })

      toast.success(
        `¡Se agregaron ${selectedFiles.length} ${
          selectedFiles.length === 1 ? "fotografía" : "fotografías"
        } al álbum "${activeAlbum.nombre}"!`
      )

      setShowAddPhotosModal(false)
      resetCreateModalState()
      await loadGalleryData(true)
    } catch (err) {
      console.error("Error al agregar fotografías:", err)
      toast.error(err.message || "Error al agregar las fotografías al álbum")
    } finally {
      setUploading(false)
    }
  }

  const handleCancelUpload = () => {
    if (!uploading) return
    isCancelledRef.current = true
    toast("Cancelando subida en curso...", { icon: "⚠️" })
  }

  // ---------------------------------------------------------------------------
  // EDITAR INFORMACIÓN Y PORTADA DEL ÁLBUM
  // ---------------------------------------------------------------------------
  const openEditModalForAlbum = (album) => {
    setEditForm({
      nombre: album.nombre || "",
      descripcion: album.descripcion || "",
      fecha_actividad: album.fecha_actividad ? String(album.fecha_actividad).slice(0, 10) : "",
      lugar: album.lugar || "",
      newCoverFile: null,
      newCoverPreview: "",
      selectedCoverPhotoId:
        album.fotos?.find((f) => f.imagen_url === album.portada_url)?.id || "",
    })
    setShowEditAlbumModal(true)
  }

  const handleSaveEditAlbum = async (e) => {
    e.preventDefault()
    const targetAlbum = activeAlbum
    if (!targetAlbum) return
    if (!editForm.nombre.trim()) {
      toast.error("El nombre del álbum no puede estar vacío")
      return
    }

    try {
      setSavingEdit(true)
      const chosenPhoto = targetAlbum.fotos?.find(
        (f) => f.id === editForm.selectedCoverPhotoId
      )

      await updateAlbumDetails({
        album: targetAlbum,
        nombre: editForm.nombre,
        descripcion: editForm.descripcion,
        fecha_actividad: editForm.fecha_actividad,
        lugar: editForm.lugar,
        newCoverFile: editForm.newCoverFile,
        selectedCoverPhoto: chosenPhoto || null,
        userId: user?.id || null,
      })

      toast.success("Información del álbum actualizada correctamente")
      setShowEditAlbumModal(false)
      await loadGalleryData(true)
    } catch (err) {
      console.error("Error al actualizar álbum:", err)
      toast.error(err.message || "No se pudo actualizar la información del álbum")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleQuickSetCover = async (photo) => {
    if (!activeAlbum || !isAuthorizedToManage) return
    try {
      await updateAlbumDetails({
        album: activeAlbum,
        nombre: activeAlbum.nombre,
        descripcion: activeAlbum.descripcion,
        fecha_actividad: activeAlbum.fecha_actividad,
        lugar: activeAlbum.lugar,
        selectedCoverPhoto: photo,
        userId: user?.id || null,
      })
      toast.success("Fotografía establecida como portada del álbum")
      await loadGalleryData(true)
    } catch (err) {
      console.error("Error al cambiar portada:", err)
      toast.error("No se pudo actualizar la portada del álbum")
    }
  }

  // ---------------------------------------------------------------------------
  // ELIMINAR FOTOGRAFÍA INDIVIDUAL O ÁLBUM COMPLETO
  // ---------------------------------------------------------------------------
  const confirmDeleteSinglePhoto = async () => {
    if (!photoToDelete || !activeAlbum) return
    if (!isAuthorizedToDelete) {
      toast.error("No tienes permisos para eliminar fotografías")
      return
    }

    try {
      setDeletingBusy(true)
      await deleteSinglePhoto({ album: activeAlbum, photo: photoToDelete })
      toast.success("Fotografía eliminada del álbum")

      // Ajustar Lightbox si estaba abierto
      if (lightboxIndex !== null) {
        const currentPhotos = activeAlbum.fotos || []
        if (currentPhotos.length <= 1) {
          setLightboxIndex(null)
        } else if (lightboxIndex >= currentPhotos.length - 1) {
          setLightboxIndex(Math.max(0, currentPhotos.length - 2))
        }
      }

      setPhotoToDelete(null)
      await loadGalleryData(true)
    } catch (err) {
      console.error("Error al eliminar fotografía:", err)
      toast.error(err.message || "Error al eliminar la fotografía")
    } finally {
      setDeletingBusy(false)
    }
  }

  const confirmDeleteWholeAlbum = async () => {
    if (!albumToDelete) return
    if (!isAuthorizedToDelete) {
      toast.error("No tienes permisos administrativos para eliminar álbumes")
      return
    }

    try {
      setDeletingBusy(true)
      const deletedName = albumToDelete.nombre
      const deletedId = albumToDelete.id
      await deleteCompleteAlbum(albumToDelete)

      toast.success(`Álbum "${deletedName}" y sus fotografías eliminados correctamente`)
      setAlbumToDelete(null)
      if (activeAlbumId === deletedId) {
        setActiveAlbumId(null)
      }
      await loadGalleryData(true)
    } catch (err) {
      console.error("Error al eliminar álbum:", err)
      toast.error(err.message || "Error al intentar eliminar el álbum")
    } finally {
      setDeletingBusy(false)
    }
  }

  // Mover fotos individuales anteriores a un álbum
  const handleMoveLegacyPhotos = async (e) => {
    e.preventDefault()
    if (!activeAlbum?.isLegacyGroup || !targetMoveAlbumId) return
    const destinationAlbum = albums.find((a) => a.id === targetMoveAlbumId)
    if (!destinationAlbum) return

    try {
      setSavingEdit(true)
      await moveLegacyPhotosToAlbum({
        photos: activeAlbum.fotos || [],
        targetAlbum: destinationAlbum,
        userId: user?.id || null,
      })
      toast.success(`Fotografías organizadas dentro del álbum "${destinationAlbum.nombre}"`)
      setShowMoveLegacyModal(false)
      setActiveAlbumId(destinationAlbum.id)
      await loadGalleryData(true)
    } catch (err) {
      console.error("Error al organizar fotografías:", err)
      toast.error("No se pudieron mover las fotografías al álbum seleccionado")
    } finally {
      setSavingEdit(false)
    }
  }

  // ---------------------------------------------------------------------------
  // DESCARGA DE FOTOGRAFÍAS EN RESOLUCIÓN ORIGINAL (ANDROID / IPHONE / PWA)
  // ---------------------------------------------------------------------------
  const closeIosSaveModal = useCallback(() => {
    setIosSaveModalData((prev) => {
      if (prev?.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl)
      }
      return null
    })
  }, [])

  const handleDownloadPhoto = async (photo, e = null, preferShareSheet = false) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!photo) return

    const photoKey = photo.id || photo.imagen_url
    if (downloadingPhotoId === photoKey) return

    try {
      setDownloadingPhotoId(photoKey)
      const result = await downloadPhotoToDevice({
        photo,
        albumName: activeAlbum?.nombre || "Vive y Canta",
        preferShareSheet,
      })

      if (result.status === "cancelled") {
        return
      }

      if (result.status === "saved_ios_share") {
        toast.success("¡Fotografía guardada exitosamente en Fotos!")
        return
      }

      if (result.status === "ios_manual_fallback") {
        setIosSaveModalData({
          photo,
          blobUrl: result.blobUrl,
          file: result.file,
          fileName: result.fileName,
          canShareFile: result.canShareFile,
        })
        return
      }

      if (result.status === "shared_android") {
        toast.success("¡Fotografía enviada a Galería / Fotos en calidad original!")
        return
      }

      if (result.status === "downloaded_android") {
        if (result.canShareToPhotos && result.file) {
          toast.success(
            (t) => (
              <div className="flex flex-col gap-2">
                <span className="font-bold text-xs">
                  ¡Fotografía descargada en resolución original!
                </span>
                <span className="text-[11px] opacity-85">
                  Guardada en tu dispositivo ({result.fileName}).
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    toast.dismiss(t.id)
                    try {
                      await triggerNativePhotoShare(result.file, result.fileName)
                    } catch {
                      // Cancelado por el usuario
                    }
                  }}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#111111] font-extrabold text-[11px] uppercase tracking-wider text-center cursor-pointer"
                >
                  Abrir / Guardar en Google Fotos
                </button>
              </div>
            ),
            { duration: 6000 }
          )
        } else {
          toast.success("¡Fotografía guardada en tu dispositivo en máxima calidad!")
        }
        return
      }

      toast.success("¡Fotografía descargada en resolución original!")
    } catch (err) {
      console.error("Error al descargar fotografía:", err)
      toast.error(err.message || "No se pudo descargar la fotografía. Intenta nuevamente.")
    } finally {
      setDownloadingPhotoId(null)
    }
  }

  const handleIosShareFromModal = async () => {
    if (!iosSaveModalData?.file) return
    try {
      const shared = await triggerNativePhotoShare(
        iosSaveModalData.file,
        iosSaveModalData.fileName
      )
      if (shared) {
        toast.success("¡Fotografía guardada exitosamente en Fotos!")
        closeIosSaveModal()
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(
          "Mantén presionada la imagen de abajo durante 1 segundo y elige «Guardar en Fotos»."
        )
      }
    }
  }

  // Descargar múltiples fotografías desde el álbum actual
  const handleDownloadAlbum = async (albumToDownload = activeAlbum, e = null) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const photosList = albumToDownload?.fotos || []
    if (!photosList.length || downloadingAlbum) return

    const { isIOS } = detectMobilePlatform()
    if (isIOS) {
      // En iOS, iniciar con la primera fotografía (o la foto activa) para guardar en Fotos
      await handleDownloadPhoto(photosList[0])
      return
    }

    try {
      setDownloadingAlbum(true)
      setAlbumDownloadProgress({ current: 0, total: photosList.length })

      for (let i = 0; i < photosList.length; i++) {
        setAlbumDownloadProgress({ current: i + 1, total: photosList.length })
        await downloadPhotoToDevice({
          photo: photosList[i],
          albumName: albumToDownload.nombre || "Vive y Canta",
          preferShareSheet: false,
        })
        // Pausa breve para que el navegador móvil procese cada descarga sin bloquearlas
        if (i < photosList.length - 1) {
          await new Promise((r) => setTimeout(r, 450))
        }
      }

      toast.success(
        `¡Se descargaron las ${photosList.length} fotografías del álbum "${albumToDownload.nombre}" en calidad original!`
      )
    } catch (err) {
      console.error("Error al descargar álbum:", err)
      toast.error(err.message || "Ocurrió un error al descargar las fotografías del álbum")
    } finally {
      setDownloadingAlbum(false)
      setAlbumDownloadProgress({ current: 0, total: 0 })
    }
  }

  // ---------------------------------------------------------------------------
  // NAVEGACIÓN DEL VISOR LIGHTBOX (TECLADO Y GESTOS SWIPE MÓVIL)
  // ---------------------------------------------------------------------------
  const activePhotos = activeAlbum?.fotos || []
  const currentLightboxPhoto =
    lightboxIndex !== null && activePhotos[lightboxIndex] ? activePhotos[lightboxIndex] : null

  const goPrevPhoto = useCallback(() => {
    if (!activePhotos.length) return
    setLightboxIndex((prev) => (prev === null ? null : (prev - 1 + activePhotos.length) % activePhotos.length))
  }, [activePhotos.length])

  const goNextPhoto = useCallback(() => {
    if (!activePhotos.length) return
    setLightboxIndex((prev) => (prev === null ? null : (prev + 1) % activePhotos.length))
  }, [activePhotos.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goPrevPhoto()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        goNextPhoto()
      } else if (e.key === "Escape") {
        e.preventDefault()
        setLightboxIndex(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxIndex, goPrevPhoto, goNextPhoto])

  const handleTouchStart = (e) => {
    touchEndXRef.current = null
    touchStartXRef.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return
    const distance = touchStartXRef.current - touchEndXRef.current
    const minSwipeDistance = 45
    if (distance > minSwipeDistance) {
      // Deslizar hacia la izquierda -> Siguiente foto
      goNextPhoto()
    } else if (distance < -minSwipeDistance) {
      // Deslizar hacia la derecha -> Foto anterior
      goPrevPhoto()
    }
    touchStartXRef.current = null
    touchEndXRef.current = null
  }

  // ===========================================================================
  // RENDERIZADO
  // ===========================================================================
  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-32 font-sans antialiased text-[var(--text-primary)] transition-colors duration-200">
      {/* =====================================================================
          ENCABEZADO SUPERIOR DORADO EJECUTIVO
         ===================================================================== */}
      <div className="page-header-gold rounded-b-[36px] px-5 sm:px-8 pt-6 pb-10 shadow-xl relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {activeAlbum ? (
            /* ENCABEZADO CUANDO SE VISUALIZA UN ÁLBUM ESPECÍFICO */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setActiveAlbumId(null)
                    setLightboxIndex(null)
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/15 hover:bg-black/25 text-[var(--header-text-primary)] text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Volver a Álbumes</span>
                </button>

                {/* Botones de administración y descarga del álbum */}
                <div className="flex flex-wrap items-center gap-2">
                  {activePhotos.length > 0 && (
                    <button
                      type="button"
                      disabled={downloadingAlbum}
                      onClick={(e) => handleDownloadAlbum(activeAlbum, e)}
                      className="px-3.5 py-2 rounded-2xl bg-[#111111]/85 hover:bg-[#111111] text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-60"
                      title="Descargar fotografías de este álbum en calidad original"
                    >
                      {downloadingAlbum ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-[#D4AF37]" />
                          <span>
                            Descargando ({albumDownloadProgress.current}/{albumDownloadProgress.total})…
                          </span>
                        </>
                      ) : (
                        <>
                          <Download size={15} />
                          <span>Descargar Álbum</span>
                        </>
                      )}
                    </button>
                  )}

                  {activeAlbum.isLegacyGroup && isAuthorizedToManage && albums.length > 1 && (
                    <button
                      onClick={() => {
                        const firstTarget = albums.find((a) => !a.isLegacyGroup)
                        setTargetMoveAlbumId(firstTarget?.id || "")
                        setShowMoveLegacyModal(true)
                      }}
                      className="btn-secondary !py-2 !px-3.5 text-xs inline-flex items-center gap-1.5 bg-black/80 text-[#F5F0E6] border-black/40 cursor-pointer"
                    >
                      <FolderOpen size={15} className="text-[#D4AF37]" />
                      <span>Organizar en Álbum</span>
                    </button>
                  )}

                  {!activeAlbum.isLegacyGroup && isAuthorizedToManage && (
                    <>
                      <button
                        onClick={() => {
                          resetCreateModalState()
                          setShowAddPhotosModal(true)
                        }}
                        className="btn-primary !py-2 !px-4 text-xs inline-flex items-center gap-1.5 bg-[#111111] !text-[#D4AF37] hover:bg-[#252525] border border-[#D4AF37]/40 cursor-pointer shadow-md"
                      >
                        <Plus size={16} />
                        <span>Agregar Fotografías</span>
                      </button>

                      <button
                        onClick={() => openEditModalForAlbum(activeAlbum)}
                        className="px-3.5 py-2 rounded-2xl bg-black/15 hover:bg-black/25 text-[var(--header-text-primary)] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Editar información o portada del álbum"
                      >
                        <Edit3 size={15} />
                        <span className="hidden xs:inline">Editar Álbum</span>
                      </button>
                    </>
                  )}

                  {isAuthorizedToDelete && (
                    <button
                      onClick={() => setAlbumToDelete(activeAlbum)}
                      className="px-3.5 py-2 rounded-2xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Eliminar álbum completo"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">Eliminar Álbum</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="header-chip text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                  <Sparkles size={11} />
                  Álbum de Actividad Oficial
                </span>
                <h1 className="title-professional title-gold-black text-2xl sm:text-4xl mt-2 tracking-tight uppercase break-words">
                  {activeAlbum.nombre}
                </h1>
                {activeAlbum.descripcion && (
                  <p className="header-text-secondary text-xs sm:text-sm mt-1.5 max-w-3xl leading-relaxed">
                    {activeAlbum.descripcion}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
                  <div className="header-chip px-3.5 py-1.5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{formatActivityDate(activeAlbum.fecha_actividad)}</span>
                  </div>
                  {activeAlbum.lugar && (
                    <div className="header-chip px-3.5 py-1.5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5">
                      <MapPin size={14} />
                      <span>{activeAlbum.lugar}</span>
                    </div>
                  )}
                  <div className="header-chip px-3.5 py-1.5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5">
                    <Images size={14} />
                    <span>
                      {activeAlbum.fotos_count}{" "}
                      {activeAlbum.fotos_count === 1 ? "fotografía" : "fotografías"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ENCABEZADO PRINCIPAL DE GALERÍA DE ÁLBUMES */
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl header-text-primary">📸</span>
                  <h1 className="title-professional title-gold-black text-2xl sm:text-4xl tracking-tight">
                    Galería Oficial
                  </h1>
                </div>
                <p className="header-text-secondary text-xs sm:text-sm mt-1 max-w-xl">
                  Álbumes fotográficos por actividades, conciertos, misas y convivios del Coro de Alabanza Vive y Canta
                </p>

                {/* Contadores globales (Sección 9) */}
                <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
                  <span className="header-chip text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
                    <FolderOpen size={13} />
                    <span>
                      {albums.length} {albums.length === 1 ? "Álbum" : "Álbumes"}
                    </span>
                  </span>
                  <span className="header-chip text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
                    <Images size={13} />
                    <span>
                      {totalPhotosCount} {totalPhotosCount === 1 ? "Fotografía" : "Fotografías"}
                    </span>
                  </span>
                </div>
              </div>

              {/* BOTÓN DESTACADO: + CREAR ÁLBUM (Sección 2) */}
              {isAuthorizedToManage && (
                <button
                  onClick={() => {
                    resetCreateModalState()
                    setShowCreateModal(true)
                  }}
                  className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-[#111111] hover:bg-[#252525] text-[#D4AF37] border border-[#D4AF37]/40 font-bold text-xs sm:text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2.5 shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Plus size={19} strokeWidth={2.5} />
                  <span>Crear Álbum</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          CONTENIDO PRINCIPAL (VISTA DE ÁLBUMES O DETALLE DE ÁLBUM)
         ===================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {loading ? (
          <div className="card-premium p-14 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Cargando álbumes fotográficos oficiales…
            </p>
          </div>
        ) : activeAlbum ? (
          /* ===================================================================
             VISTA DETALLADA DE UN ÁLBUM (Sección 5)
             =================================================================== */
          <div className="space-y-6">
            {activePhotos.length === 0 ? (
              <div className="card-premium text-center py-16 px-6 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-4 border border-[#D4AF37]/30">
                  <ImageIcon size={30} />
                </div>
                <h2 className="title-professional text-xl font-bold text-[var(--text-primary)]">
                  Este álbum aún no tiene fotografías
                </h2>
                <p className="text-[var(--text-secondary)] text-xs mt-2 max-w-md mx-auto">
                  Agrega fotografías de la actividad para compartirlas con todos los integrantes del coro.
                </p>
                {isAuthorizedToManage && !activeAlbum.isLegacyGroup && (
                  <button
                    onClick={() => {
                      resetCreateModalState()
                      setShowAddPhotosModal(true)
                    }}
                    className="btn-primary mt-5 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Agregar Fotografías</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-5">
                {activePhotos.map((photo, idx) => {
                  const isCurrentCover = activeAlbum.portada_url === photo.imagen_url
                  return (
                    <div
                      key={photo.id || idx}
                      className="card-premium overflow-hidden group relative flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:border-[#D4AF37]/60"
                    >
                      <div
                        onClick={() => setLightboxIndex(idx)}
                        className="relative aspect-square sm:aspect-4/3 w-full overflow-hidden bg-[var(--bg-muted)] cursor-pointer"
                      >
                        <img
                          src={photo.imagen_url}
                          alt={photo.nombre_archivo || `Fotografía ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Insignia de número / Portada */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-black/70 text-[#F5F0E6] text-[10px] font-bold backdrop-blur-xs border border-white/10">
                            #{idx + 1}
                          </span>
                          {isCurrentCover && (
                            <span className="px-2 py-0.5 rounded-lg bg-[#D4AF37] text-[#111111] text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
                              <Star size={10} fill="#111111" />
                              Portada
                            </span>
                          )}
                        </div>

                        {/* Overlay de ampliación al pasar el cursor */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="p-2.5 rounded-full bg-black/75 text-[#D4AF37] border border-[#D4AF37]/40 backdrop-blur-xs">
                            <ZoomIn size={20} />
                          </span>
                        </div>
                      </div>

                      {/* Pie de tarjeta de fotografía con controles */}
                      <div className="px-3 py-2.5 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                        <span
                          className="text-[11px] font-medium text-[var(--text-secondary)] truncate"
                          title={photo.nombre_archivo}
                        >
                          {photo.nombre_archivo || `Imagen ${idx + 1}`}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={downloadingPhotoId === (photo.id || photo.imagen_url)}
                            onClick={(e) => handleDownloadPhoto(photo, e)}
                            className="px-2 py-1.5 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#111111] transition-colors inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer disabled:opacity-60"
                            title="Descargar foto en resolución original a Galería / Fotos"
                          >
                            {downloadingPhotoId === (photo.id || photo.imagen_url) ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            <span className="hidden xs:inline">Descargar</span>
                          </button>

                          {isAuthorizedToManage && !isCurrentCover && !activeAlbum.isLegacyGroup && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickSetCover(photo)
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
                              title="Usar esta fotografía como portada del álbum"
                            >
                              <Star size={14} />
                            </button>
                          )}

                          {isAuthorizedToDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setPhotoToDelete(photo)
                              }}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer"
                              title="Eliminar esta fotografía"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ===================================================================
             VISTA PRINCIPAL DE TARJETAS DE ÁLBUMES (Secciones 4 y 9)
             =================================================================== */
          <div className="space-y-6">
            {/* BARRA DE BÚSQUEDA, FILTRO POR AÑO, FECHA Y ORDENAMIENTO */}
            <div className="card-premium p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                {/* Buscador */}
                <div className="lg:col-span-5 relative">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gold)] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar álbum por actividad, lugar o descripción..."
                    className="input-premium w-full !pl-10 !py-2.5 text-xs sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Filtro por Año */}
                <div className="lg:col-span-2 relative">
                  <div className="flex items-center gap-1.5">
                    <Filter size={14} className="text-[var(--gold)] shrink-0 hidden sm:block" />
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="input-premium w-full !py-2.5 text-xs font-semibold cursor-pointer"
                      aria-label="Filtrar por año"
                    >
                      <option value="todos">Todos los años</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          Año {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filtro por Fecha exacta */}
                <div className="lg:col-span-3 relative flex items-center gap-1.5">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input-premium w-full !py-2 text-xs font-semibold cursor-pointer"
                    title="Filtrar por fecha de actividad"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate("")}
                      className="p-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] cursor-pointer shrink-0"
                      title="Limpiar filtro de fecha"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Ordenar por */}
                <div className="lg:col-span-2 relative">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={14} className="text-[var(--gold)] shrink-0 hidden sm:block" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="input-premium w-full !py-2.5 text-xs font-semibold cursor-pointer"
                      aria-label="Ordenar álbumes"
                    >
                      <option value="recent">Más recientes</option>
                      <option value="oldest">Más antiguos</option>
                      <option value="most_photos">Más fotografías</option>
                      <option value="name_asc">Nombre (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* LISTADO DE TARJETAS DE ÁLBUMES */}
            {albums.length === 0 ? (
              /* ESTADO VACÍO CUANDO TODAVÍA NO EXISTEN ÁLBUMES */
              <div className="card-premium text-center py-16 px-6 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-4 border border-[#D4AF37]/30">
                  <FolderPlus size={32} />
                </div>
                <h2 className="title-professional text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  Aún no existen álbumes fotográficos
                </h2>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-2 max-w-md mx-auto leading-relaxed">
                  Crea el primer álbum de una presentación, concierto, misa o ensayo para organizar todas las fotografías de la actividad en un solo lugar.
                </p>
                {isAuthorizedToManage && (
                  <button
                    onClick={() => {
                      resetCreateModalState()
                      setShowCreateModal(true)
                    }}
                    className="btn-primary mt-6 inline-flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Plus size={18} />
                    <span>Crear Primer Álbum</span>
                  </button>
                )}
              </div>
            ) : filteredAlbums.length === 0 ? (
              /* SIN RESULTADOS EN EL FILTRO */
              <div className="card-premium text-center py-14 px-6 max-w-lg mx-auto">
                <Search size={28} className="text-[#D4AF37] mx-auto mb-3 opacity-80" />
                <h3 className="title-professional text-lg font-bold text-[var(--text-primary)]">
                  No se encontraron álbumes con esos criterios
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Prueba limpiando los filtros de búsqueda, año o fecha.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedYear("todos")
                    setSelectedDate("")
                  }}
                  className="btn-secondary mt-4 text-xs cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              /* CUADRÍCULA RESPONSIVE DE TARJETAS DE ÁLBUMES (Sección 4) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlbums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => setActiveAlbumId(album.id)}
                    className="card-premium overflow-hidden group flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:border-[#D4AF37]/60 cursor-pointer"
                  >
                    {/* Fotografía de Portada del Álbum */}
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-[#111111]">
                      {album.portada_url ? (
                        <img
                          src={album.portada_url}
                          alt={album.nombre}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#D4AF37]/50 gap-2">
                          <Images size={38} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            Sin portada
                          </span>
                        </div>
                      )}

                      {/* Degradado oscuro elegante en la base de la portada */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      {/* Badge superior derecho: Cantidad de fotografías */}
                      <div className="absolute top-3.5 right-3.5 px-3 py-1 rounded-full bg-black/75 text-[#D4AF37] border border-[#D4AF37]/40 backdrop-blur-md text-[11px] font-extrabold tracking-wide inline-flex items-center gap-1.5 shadow-lg">
                        <Images size={13} />
                        <span>
                          {album.fotos_count}{" "}
                          {album.fotos_count === 1 ? "fotografía" : "fotografías"}
                        </span>
                      </div>

                      {/* Botón rápido de eliminar álbum (solo Admin/Director) */}
                      {isAuthorizedToDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setAlbumToDelete(album)
                          }}
                          className="absolute top-3.5 left-3.5 p-2 rounded-full bg-black/70 hover:bg-red-950/90 text-red-400 hover:text-red-200 border border-white/15 transition-all cursor-pointer"
                          title="Eliminar álbum completo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      {/* Lugar sobre la base de la imagen si existe */}
                      {album.lugar && (
                        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-1.5 text-[#F5F0E6] text-xs font-semibold drop-shadow">
                          <MapPin size={13} className="text-[#D4AF37] shrink-0" />
                          <span className="truncate">{album.lugar}</span>
                        </div>
                      )}
                    </div>

                    {/* Cuerpo de la tarjeta del álbum */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--gold)] uppercase tracking-wider mb-1.5">
                          <Calendar size={12} />
                          <span>{formatActivityDate(album.fecha_actividad)}</span>
                        </div>

                        <h3 className="title-professional text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors uppercase tracking-tight line-clamp-1">
                          {album.nombre}
                        </h3>

                        {album.descripcion ? (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1.5 leading-relaxed">
                            {album.descripcion}
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-muted)] italic mt-1.5">
                            Álbum oficial de actividad del Coro Vive y Canta
                          </p>
                        )}
                      </div>

                      {/* Botón VER ÁLBUM */}
                      <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                          {album.fotos_count}{" "}
                          {album.fotos_count === 1 ? "imagen registrada" : "imágenes registradas"}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveAlbumId(album.id)
                          }}
                          className="px-4 py-2 rounded-xl bg-[#D4AF37]/15 group-hover:bg-[#D4AF37] text-[var(--gold)] group-hover:text-[#111111] border border-[#D4AF37]/40 text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <FolderOpen size={14} />
                          <span>Ver Álbum</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL 1: + CREAR ÁLBUM CON SELECCIÓN MÚLTIPLE Y PROGRESO (Secciones 2 y 3)
         ===================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="page-header-gold px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FolderPlus size={20} className="header-text-primary" />
                <div>
                  <h3 className="title-professional title-gold-black text-lg sm:text-xl font-bold leading-tight">
                    Crear Álbum Fotográfico
                  </h3>
                  <p className="header-text-secondary text-[11px]">
                    Agrupa múltiples fotografías de una actividad del Coro Vive y Canta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (uploading) {
                    handleCancelUpload()
                  } else {
                    setShowCreateModal(false)
                    resetCreateModalState()
                  }
                }}
                className="p-1.5 rounded-full bg-black/15 text-[var(--header-text-primary)] hover:bg-black/25 cursor-pointer"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo desplazable del Modal */}
            <form onSubmit={handleCreateAlbumSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre de la actividad */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 ml-1">
                    Nombre de la Actividad <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={uploading}
                    placeholder="Ej. Concierto El Cedrito"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="input-premium w-full text-sm font-bold"
                  />
                </div>

                {/* Fecha de la actividad */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 ml-1">
                    Fecha de la Actividad <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={uploading}
                    value={createForm.fecha_actividad}
                    onChange={(e) => setCreateForm((p) => ({ ...p, fecha_actividad: e.target.value }))}
                    className="input-premium w-full text-xs sm:text-sm font-semibold"
                  />
                </div>

                {/* Lugar donde se realizó */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 ml-1">
                    Lugar donde se realizó <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={uploading}
                    placeholder="Ej. El Cedrito"
                    value={createForm.lugar}
                    onChange={(e) => setCreateForm((p) => ({ ...p, lugar: e.target.value }))}
                    className="input-premium w-full text-xs sm:text-sm font-semibold"
                  />
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 ml-1">
                    Descripción de la Actividad
                  </label>
                  <textarea
                    disabled={uploading}
                    placeholder="Ej. Fotografías de nuestra presentación musical del Coro de Alabanza Vive y Canta."
                    value={createForm.descripcion}
                    onChange={(e) => setCreateForm((p) => ({ ...p, descripcion: e.target.value }))}
                    className="input-premium w-full text-xs min-h-[68px] resize-none py-2"
                  />
                </div>
              </div>

              {/* Fotografía de portada opcional dedicada */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-muted)]/60 border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {createForm.coverPreview ? (
                    <img
                      src={createForm.coverPreview}
                      alt="Portada personalizada"
                      className="w-12 h-12 rounded-xl object-cover border border-[#D4AF37]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
                      <Star size={18} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Fotografía de Portada del Álbum
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {createForm.coverFile
                        ? `Portada personalizada: ${createForm.coverFile.name}`
                        : "Puedes tocar la estrella en cualquier foto de abajo o subir una portada específica."}
                    </p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={customCoverInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleSelectCustomCover(e, false)}
                  className="hidden"
                />

                <div className="flex items-center gap-2 shrink-0">
                  {createForm.coverFile && !uploading && (
                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm((p) => {
                          if (p.coverPreview) URL.revokeObjectURL(p.coverPreview)
                          return { ...p, coverFile: null, coverPreview: "" }
                        })
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-400 text-[11px] font-bold cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => customCoverInputRef.current?.click()}
                    className="btn-secondary !py-1.5 !px-3 text-[11px] cursor-pointer"
                  >
                    {createForm.coverFile ? "Cambiar portada" : "Elegir archivo de portada"}
                  </button>
                </div>
              </div>

              {/* Selección de Múltiples Fotografías */}
              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Selección de Múltiples Fotografías <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-[var(--gold)]">
                    {selectedFiles.length}{" "}
                    {selectedFiles.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}
                  </span>
                </div>

                <input
                  type="file"
                  ref={multiplePhotosInputRef}
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleSelectMultipleFiles}
                  className="hidden"
                />

                <div
                  onClick={() => {
                    if (!uploading) multiplePhotosInputRef.current?.click()
                  }}
                  className={`rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--gold)] bg-[var(--bg-muted)]/40 p-5 text-center transition-all ${
                    uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-2 border border-[#D4AF37]/30">
                    <Upload size={20} />
                  </div>
                  <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                    Toca aquí para seleccionar múltiples fotografías
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Compatible con iPhone, Android y Computadora • Formatos JPG, JPEG, PNG y WEBP
                  </p>
                </div>

                {/* Barra de Progreso General durante la subida */}
                {uploading && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[#D4AF37]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[var(--text-primary)] flex items-center gap-2">
                        <Loader2 size={15} className="animate-spin text-[#D4AF37]" />
                        Subiendo fotografías a Supabase Storage ({overallProgress.completed} de{" "}
                        {overallProgress.total})
                      </span>
                      <span className="text-[#D4AF37]">{overallProgress.percent}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#BFA15A] to-[#D4AF37] transition-all duration-300"
                        style={{ width: `${overallProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Vista Previa de todas las imágenes seleccionadas con nombre y progreso individual */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 max-h-60 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {selectedFiles.map((item, idx) => {
                      const isChosenCover = !createForm.coverFile && createForm.coverIndex === idx
                      return (
                        <div
                          key={item.id}
                          className={`relative rounded-xl overflow-hidden border bg-[var(--bg-muted)] flex flex-col justify-between ${
                            isChosenCover
                              ? "border-[#D4AF37] ring-1 ring-[#D4AF37]"
                              : "border-[var(--border-color)]"
                          }`}
                        >
                          <div className="relative aspect-video w-full bg-black">
                            <img
                              src={item.preview}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />

                            {/* Botón para marcar como portada */}
                            {!uploading && !createForm.coverFile && (
                              <button
                                type="button"
                                onClick={() => setCreateForm((p) => ({ ...p, coverIndex: idx }))}
                                className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  isChosenCover
                                    ? "bg-[#D4AF37] text-[#111111]"
                                    : "bg-black/70 text-white hover:bg-black/90"
                                }`}
                                title="Usar esta imagen como portada del álbum"
                              >
                                <Star size={10} fill={isChosenCover ? "#111111" : "none"} />
                                <span>{isChosenCover ? "Portada" : "Usar portada"}</span>
                              </button>
                            )}

                            {/* Botón para quitar fotografía antes de guardar */}
                            {!uploading && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSelectedFile(idx)}
                                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/75 text-red-300 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                title="Quitar fotografía de la lista"
                              >
                                <X size={12} />
                              </button>
                            )}

                            {/* Indicador de estado de subida sobre la imagen */}
                            {item.status !== "pending" && (
                              <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center p-2 text-center">
                                {item.status === "optimizing" && (
                                  <>
                                    <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
                                    <span className="text-[10px] font-bold text-[#F5F0E6] mt-1">
                                      Optimizando…
                                    </span>
                                  </>
                                )}
                                {item.status === "uploading" && (
                                  <>
                                    <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
                                    <span className="text-[10px] font-bold text-[#D4AF37] mt-1">
                                      Subiendo {item.progress}%
                                    </span>
                                  </>
                                )}
                                {item.status === "completed" && (
                                  <>
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-300 mt-0.5">
                                      Subida ✓
                                    </span>
                                  </>
                                )}
                                {item.status === "error" && (
                                  <>
                                    <AlertTriangle size={18} className="text-red-400" />
                                    <span className="text-[9px] font-bold text-red-300 mt-0.5 line-clamp-2">
                                      {item.error || "Error"}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Nombre del archivo y barra individual */}
                          <div className="p-2 bg-[var(--bg-card)]">
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <span className="font-semibold text-[var(--text-primary)] truncate">
                                {item.name}
                              </span>
                              <span className="text-[var(--text-muted)] shrink-0">
                                {formatFileSize(item.size)}
                              </span>
                            </div>
                            <div className="w-full h-1 rounded-full bg-[var(--bg-muted)] mt-1 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-200 ${
                                  item.status === "error"
                                    ? "bg-red-500"
                                    : item.status === "completed"
                                    ? "bg-emerald-500"
                                    : "bg-[#D4AF37]"
                                }`}
                                style={{ width: `${item.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Botones inferiores del Modal */}
              <div className="pt-3 border-t border-[var(--border-color)] flex items-center gap-3">
                {uploading ? (
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="btn-danger flex-1 py-3 text-xs font-bold cursor-pointer"
                  >
                    Cancelar Operación
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetCreateModalState()
                    }}
                    className="btn-secondary flex-1 py-3 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0 || !createForm.nombre.trim()}
                  className="btn-primary flex-[2] py-3 text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-[#111111]" />
                      <span>
                        Guardando Álbum ({overallProgress.completed}/{overallProgress.total})…
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Guardar Álbum ({selectedFiles.length} fotos)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: AGREGAR MÁS FOTOGRAFÍAS A UN ÁLBUM EXISTENTE
         ===================================================================== */}
      {showAddPhotosModal && activeAlbum && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="page-header-gold px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Plus size={19} className="header-text-primary" />
                <div>
                  <h3 className="title-professional title-gold-black text-lg font-bold">
                    Agregar Fotografías al Álbum
                  </h3>
                  <p className="header-text-secondary text-[11px] truncate max-w-xs sm:max-w-md">
                    {activeAlbum.nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (uploading) {
                    handleCancelUpload()
                  } else {
                    setShowAddPhotosModal(false)
                    resetCreateModalState()
                  }
                }}
                className="p-1.5 rounded-full bg-black/15 text-[var(--header-text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPhotosSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <input
                type="file"
                ref={addMorePhotosInputRef}
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleSelectMultipleFiles}
                className="hidden"
              />

              <div
                onClick={() => {
                  if (!uploading) addMorePhotosInputRef.current?.click()
                }}
                className="rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--gold)] bg-[var(--bg-muted)]/40 p-6 text-center cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-2 border border-[#D4AF37]/30">
                  <Upload size={22} />
                </div>
                <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                  Seleccionar nuevas fotografías para este álbum
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Puedes elegir múltiples imágenes a la vez (JPG, JPEG, PNG, WEBP)
                </p>
              </div>

              {uploading && (
                <div className="p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[#D4AF37]/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
                      Subiendo {overallProgress.completed} de {overallProgress.total} fotografías…
                    </span>
                    <span className="text-[#D4AF37]">{overallProgress.percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full bg-[#D4AF37] transition-all duration-300"
                      style={{ width: `${overallProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="max-h-60 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 pr-1">
                  {selectedFiles.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-muted)]"
                    >
                      <div className="relative aspect-video bg-black">
                        <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/75 text-red-300 hover:bg-red-600 hover:text-white cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                        {item.status !== "pending" && (
                          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-center p-1">
                            {item.status === "completed" ? (
                              <CheckCircle2 size={18} className="text-emerald-400" />
                            ) : item.status === "error" ? (
                              <AlertTriangle size={18} className="text-red-400" />
                            ) : (
                              <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-[10px] truncate font-semibold text-[var(--text-primary)]">
                        {item.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-[var(--border-color)] flex gap-3">
                {uploading ? (
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="btn-danger flex-1 py-3 text-xs font-bold cursor-pointer"
                  >
                    Cancelar Subida
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPhotosModal(false)
                      resetCreateModalState()
                    }}
                    className="btn-secondary flex-1 py-3 text-xs cursor-pointer"
                  >
                    Cerrar
                  </button>
                )}

                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0}
                  className="btn-primary flex-[2] py-3 text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-[#111111]" />
                      <span>Subiendo…</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Subir {selectedFiles.length} Fotografías</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: EDITAR INFORMACIÓN Y PORTADA DEL ÁLBUM (Sección 6)
         ===================================================================== */}
      {showEditAlbumModal && activeAlbum && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="page-header-gold px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="header-text-primary" />
                <h3 className="title-professional title-gold-black text-lg font-bold">
                  Editar Álbum Fotográfico
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditAlbumModal(false)}
                className="p-1.5 rounded-full bg-black/15 text-[var(--header-text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAlbum} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                  Nombre de la Actividad <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nombre}
                  onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="input-premium w-full text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                    Fecha de la Actividad
                  </label>
                  <input
                    type="date"
                    value={editForm.fecha_actividad}
                    onChange={(e) => setEditForm((p) => ({ ...p, fecha_actividad: e.target.value }))}
                    className="input-premium w-full text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                    Lugar
                  </label>
                  <input
                    type="text"
                    value={editForm.lugar}
                    onChange={(e) => setEditForm((p) => ({ ...p, lugar: e.target.value }))}
                    className="input-premium w-full text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="input-premium w-full text-xs min-h-[70px] resize-none py-2"
                />
              </div>

              {/* Cambiar Fotografía de Portada */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Fotografía de Portada
                  </label>
                  <input
                    type="file"
                    ref={editCoverInputRef}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handleSelectCustomCover(e, true)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editCoverInputRef.current?.click()}
                    className="text-[11px] font-bold text-[var(--gold)] hover:underline cursor-pointer"
                  >
                    + Subir nueva portada desde dispositivo
                  </button>
                </div>

                {editForm.newCoverPreview ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-video border border-[#D4AF37]">
                    <img
                      src={editForm.newCoverPreview}
                      alt="Nueva portada"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 text-[#D4AF37] text-[10px] font-bold">
                      Nueva portada seleccionada
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                    {(activeAlbum.fotos || []).map((photo) => {
                      const isSelected = editForm.selectedCoverPhotoId === photo.id
                      return (
                        <div
                          key={photo.id}
                          onClick={() =>
                            setEditForm((p) => ({
                              ...p,
                              selectedCoverPhotoId: photo.id,
                              newCoverFile: null,
                              newCoverPreview: "",
                            }))
                          }
                          className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected
                              ? "border-[#D4AF37] scale-[0.98]"
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={photo.imagen_url} alt="" className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#D4AF37]/25 flex items-center justify-center">
                              <span className="p-1 rounded-full bg-[#D4AF37] text-[#111111]">
                                <Star size={12} fill="#111111" />
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditAlbumModal(false)}
                  className="btn-secondary flex-1 py-3 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary flex-[2] py-3 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-[#111111]" />
                      <span>Guardando cambios…</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: CONFIRMACIÓN PARA ELIMINAR UN ÁLBUM COMPLETO (Sección 6)
         ===================================================================== */}
      {albumToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-red-500/40 w-full max-w-md rounded-[28px] p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>

            <h3 className="title-professional text-xl font-bold text-[var(--text-primary)]">
              ¿Eliminar álbum completo?
            </h3>

            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Estás por eliminar el álbum{" "}
              <strong className="text-[var(--text-primary)]">"{albumToDelete.nombre}"</strong>.
              <br />
              <span className="text-red-400 font-semibold block mt-1.5">
                Esta acción también eliminará permanentemente sus {albumToDelete.fotos_count || 0}{" "}
                {albumToDelete.fotos_count === 1 ? "fotografía asociada" : "fotografías asociadas"}{" "}
                de la base de datos y del almacenamiento.
              </span>
            </p>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                disabled={deletingBusy}
                onClick={() => setAlbumToDelete(null)}
                className="btn-secondary flex-1 py-3 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingBusy}
                onClick={confirmDeleteWholeAlbum}
                className="btn-danger flex-1 py-3 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {deletingBusy ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Eliminando…</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Sí, Eliminar Álbum</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: CONFIRMACIÓN PARA ELIMINAR FOTOGRAFÍA INDIVIDUAL
         ===================================================================== */}
      {photoToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-sm rounded-[28px] p-6 shadow-2xl text-center space-y-4">
            <img
              src={photoToDelete.imagen_url}
              alt=""
              className="w-24 h-24 rounded-2xl object-cover mx-auto border border-[var(--border-color)]"
            />
            <h3 className="title-professional text-lg font-bold text-[var(--text-primary)]">
              ¿Eliminar esta fotografía?
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Se eliminará del álbum <strong>"{activeAlbum?.nombre}"</strong> y de Supabase Storage.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={deletingBusy}
                onClick={() => setPhotoToDelete(null)}
                className="btn-secondary flex-1 py-2.5 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingBusy}
                onClick={confirmDeleteSinglePhoto}
                className="btn-danger flex-1 py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {deletingBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: ORGANIZAR FOTOGRAFÍAS INDIVIDUALES PREVIAS EN UN ÁLBUM
         ===================================================================== */}
      {showMoveLegacyModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form
            onSubmit={handleMoveLegacyPhotos}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-md rounded-[28px] p-6 shadow-2xl space-y-4"
          >
            <h3 className="title-professional text-lg font-bold text-[var(--text-primary)]">
              Organizar fotografías en un álbum
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Selecciona el álbum al que deseas trasladar estas fotografías sin perder sus archivos originales:
            </p>
            <select
              value={targetMoveAlbumId}
              onChange={(e) => setTargetMoveAlbumId(e.target.value)}
              className="input-premium w-full text-xs font-bold"
              required
            >
              {albums
                .filter((a) => !a.isLegacyGroup)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({formatActivityDate(a.fecha_actividad)})
                  </option>
                ))}
            </select>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMoveLegacyModal(false)}
                className="btn-secondary flex-1 py-2.5 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit || !targetMoveAlbumId}
                className="btn-primary flex-1 py-2.5 text-xs font-bold cursor-pointer"
              >
                {savingEdit ? "Moviendo…" : "Confirmar Traslado"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          VISOR LIGHTBOX DE PANTALLA COMPLETA (TECLADO Y GESTOS SWIPE - Sección 5)
         ===================================================================== */}
      {currentLightboxPhoto && activeAlbum && (
        <div
          className="fixed inset-0 z-[115] bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-150 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Barra superior del Lightbox */}
          <div className="px-4 sm:px-8 py-4 flex items-center justify-between border-b border-white/10 bg-black/50">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-[#111111] text-[11px] font-extrabold">
                  {lightboxIndex + 1} / {activePhotos.length}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-[#F5F0E6] truncate">
                  {activeAlbum.nombre}
                </h4>
              </div>
              <p className="text-[11px] text-white/60 truncate mt-0.5">
                {currentLightboxPhoto.nombre_archivo}
              </p>
            </div>

            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Cerrar visor (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Área central con la fotografía ampliada y botones Anterior / Siguiente */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden px-2 sm:px-14"
            onClick={() => setLightboxIndex(null)}
          >
            {activePhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goPrevPhoto()
                }}
                className="absolute left-3 sm:left-6 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-[#D4AF37] text-white hover:text-[#111111] border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg"
                title="Fotografía anterior (←)"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img
              src={currentLightboxPhoto.imagen_url}
              alt={currentLightboxPhoto.nombre_archivo}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[72vh] max-w-full w-auto object-contain rounded-lg shadow-2xl transition-all duration-200"
            />

            {activePhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goNextPhoto()
                }}
                className="absolute right-3 sm:right-6 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-[#D4AF37] text-white hover:text-[#111111] border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg"
                title="Fotografía siguiente (→)"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Barra inferior del Lightbox con acciones e indicador de deslizamiento móvil */}
          <div className="px-4 sm:px-8 py-4 border-t border-white/10 bg-black/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-white/70 flex items-center gap-3">
              <span>{formatActivityDate(activeAlbum.fecha_actividad)}</span>
              {activeAlbum.lugar && <span>• {activeAlbum.lugar}</span>}
              <span className="hidden md:inline text-white/40">
                (Usa las flechas ← → del teclado o desliza en móvil)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAuthorizedToManage &&
                !activeAlbum.isLegacyGroup &&
                activeAlbum.portada_url !== currentLightboxPhoto.imagen_url && (
                  <button
                    type="button"
                    onClick={() => handleQuickSetCover(currentLightboxPhoto)}
                    className="px-3.5 py-2 rounded-xl bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#111111] border border-[#D4AF37]/40 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Star size={14} />
                    <span>Usar como Portada</span>
                  </button>
                )}

              <button
                type="button"
                disabled={
                  downloadingPhotoId ===
                  (currentLightboxPhoto.id || currentLightboxPhoto.imagen_url)
                }
                onClick={(e) => handleDownloadPhoto(currentLightboxPhoto, e)}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#BFA15A] text-[#111111] text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-60"
                title="Guardar fotografía en Galería / Fotos en calidad original"
              >
                {downloadingPhotoId ===
                (currentLightboxPhoto.id || currentLightboxPhoto.imagen_url) ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-[#111111]" />
                    <span>Descargando…</span>
                  </>
                ) : (
                  <>
                    <Download size={14} strokeWidth={2.4} />
                    <span>Descargar Foto</span>
                  </>
                )}
              </button>

              {isAuthorizedToDelete && (
                <button
                  type="button"
                  onClick={() => setPhotoToDelete(currentLightboxPhoto)}
                  className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 7: GUARDAR FOTOGRAFÍA EN APP «FOTOS» (iPHONE / iPAD SAFARI & PWA)
         ===================================================================== */}
      {iosSaveModalData && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#111111] border border-[#D4AF37]/40 w-full max-w-md rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-extrabold uppercase tracking-wider">
                Calidad Original • Fotos iOS
              </span>
              <button
                type="button"
                onClick={closeIosSaveModal}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="title-professional text-lg sm:text-xl font-bold text-[#F5F0E6]">
              Guardar en «Fotos» de tu iPhone
            </h3>

            {iosSaveModalData.canShareFile && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleIosShareFromModal}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#D4AF37] hover:bg-[#BFA15A] text-[#111111] font-extrabold text-xs sm:text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                >
                  <Download size={17} strokeWidth={2.5} />
                  <span> Abrir menú y tocar «Guardar imagen»</span>
                </button>
                <p className="text-[11px] text-[#F5F0E6]/70">
                  Al tocar el botón superior, selecciona <strong>«Guardar imagen»</strong> para guardarla directamente en tu aplicación <strong>Fotos</strong>.
                </p>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden bg-black border border-white/15 p-2">
              <img
                src={iosSaveModalData.blobUrl || iosSaveModalData.photo?.imagen_url}
                alt={iosSaveModalData.fileName}
                className="max-h-[46vh] w-auto mx-auto object-contain rounded-xl select-auto"
              />
            </div>

            <div className="p-3 rounded-2xl bg-[#252525]/90 border border-[#D4AF37]/25 text-left space-y-1">
              <p className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Opción directa en Safari / PWA:</span>
              </p>
              <p className="text-[11px] text-[#F5F0E6]/85 leading-relaxed">
                Mantén presionada la fotografía de arriba durante 1 segundo y selecciona{" "}
                <strong className="text-[#D4AF37]">«Guardar en Fotos»</strong> (o{" "}
                <strong className="text-[#D4AF37]">«Añadir a Fotos»</strong>).
              </p>
            </div>

            <button
              type="button"
              onClick={closeIosSaveModal}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#F5F0E6] text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Gallery
