import { supabase } from "../lib/supabase"

const BUCKET_NAME = "gallery"
const ALBUM_JSON_PREFIX = "__VYC_ALBUM_JSON__:"
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB límite de entrada

// Cache en memoria para saber si las tablas nuevas ya están creadas en Supabase
let cachedSchemaMode = null // "relational" | "legacy_compatible"

/**
 * Genera un slug limpio para organizar las carpetas en Supabase Storage
 */
export function slugifyAlbumName(name = "") {
  const clean = String(name || "actividad")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return clean || "album-coro"
}

/**
 * Genera un identificador corto único
 */
function shortUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`
}

/**
 * Extrae la ruta interna del bucket `gallery` a partir de una URL pública de Supabase
 */
export function extractStoragePathFromUrl(url = "") {
  if (!url || typeof url !== "string") return ""
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`
  const idx = url.indexOf(marker)
  if (idx !== -1) {
    return decodeURIComponent(url.substring(idx + marker.length).split("?")[0])
  }
  return ""
}

/**
 * Valida que el archivo sea una imagen permitida (JPG, JPEG, PNG, WEBP) y no exceda el límite
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: "Archivo inválido" }
  }

  const ext = (file.name?.split(".").pop() || "").toLowerCase()
  const mimeOk = ALLOWED_MIME_TYPES.includes((file.type || "").toLowerCase())
  const extOk = ALLOWED_EXTENSIONS.includes(ext)

  if (!mimeOk && !extOk) {
    return {
      valid: false,
      error: `Formato no permitido (${file.name}). Usa JPG, JPEG, PNG o WEBP.`,
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `El archivo "${file.name}" (${sizeMb} MB) supera el máximo de 20 MB.`,
    }
  }

  return { valid: true }
}

/**
 * Optimiza una imagen en el navegador usando Canvas sin bloquear el hilo principal.
 * Reduce el peso de fotos pesadas de iPhone/Android conservando excelente nitidez.
 */
export async function optimizeImageFile(file, maxDimension = 1920, quality = 0.84) {
  try {
    // Si el archivo ya es ligero (< 550 KB), no hace falta recomprimirlo
    if (file.size <= 550 * 1024) {
      return file
    }

    // Ceder un ciclo al hilo principal para mantener la UI fluida
    await new Promise((resolve) => setTimeout(resolve, 0))

    const imageSource = await new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(img)
      }
      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl)
        reject(err)
      }
      img.src = objectUrl
    })

    let { width, height } = imageSource
    if (!width || !height) return file

    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height * maxDimension) / width)
        width = maxDimension
      } else {
        width = Math.round((width * maxDimension) / height)
        height = maxDimension
      }
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(imageSource, 0, 0, width, height)

    const isPng = file.type === "image/png"
    const outputType = isPng && file.size < 1.5 * 1024 * 1024 ? "image/png" : "image/jpeg"

    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), outputType, quality)
    )

    if (!blob || blob.size >= file.size) {
      return file
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "")
    const newExt = outputType === "image/png" ? "png" : "jpg"
    return new File([blob], `${baseName}.${newExt}`, {
      type: outputType,
      lastModified: Date.now(),
    })
  } catch {
    // Si algo falla en la compresión, usar el archivo original sin interrumpir
    return file
  }
}

/**
 * Detecta si las tablas relacionales `galeria_albumes` y `galeria_fotos` existen en Supabase
 */
export async function detectGallerySchemaMode(forceRefresh = false) {
  if (cachedSchemaMode && !forceRefresh) {
    return cachedSchemaMode
  }

  const { error } = await supabase
    .from("galeria_albumes")
    .select("id")
    .limit(1)

  if (!error) {
    cachedSchemaMode = "relational"
    return "relational"
  }

  // Si la tabla no existe aún en Supabase (PGRST205 o 42P01), usar modo compatible sobre `public.galeria`
  const code = String(error.code || "")
  const msg = String(error.message || "").toLowerCase()
  if (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("galeria_albumes") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  ) {
    cachedSchemaMode = "legacy_compatible"
    return "legacy_compatible"
  }

  cachedSchemaMode = "relational"
  return "relational"
}

/**
 * Codifica y decodifica metadatos de álbum en `public.galeria.descripcion` para modo compatible
 */
function encodeFallbackMeta(meta) {
  return `${ALBUM_JSON_PREFIX}${JSON.stringify(meta)}`
}

function decodeFallbackMeta(descripcion) {
  if (!descripcion || typeof descripcion !== "string") return null
  if (!descripcion.startsWith(ALBUM_JSON_PREFIX)) return null
  try {
    return JSON.parse(descripcion.slice(ALBUM_JSON_PREFIX.length))
  } catch {
    return null
  }
}

/**
 * Sube un archivo individual al bucket `gallery` organizado por carpeta del álbum
 */
async function uploadFileToAlbumFolder({
  file,
  albumSlug,
  albumFolderId,
  prefix = "foto",
  index = 1,
}) {
  const optimizedFile = await optimizeImageFile(file)
  const ext = (optimizedFile.name?.split(".").pop() || "jpg").toLowerCase()
  const paddedIndex = String(index).padStart(3, "0")
  const uniqueSuffix = shortUid()

  const fileName =
    prefix === "portada"
      ? `portada-${uniqueSuffix}.${ext}`
      : `${prefix}-${paddedIndex}-${uniqueSuffix}.${ext}`

  const storagePath = `galeria/${albumSlug}-${albumFolderId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, optimizedFile, {
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Error al subir "${file.name}": ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath)

  const publicUrl = publicUrlData?.publicUrl
  if (!publicUrl) {
    throw new Error(`No se pudo obtener la URL pública de "${file.name}"`)
  }

  return {
    storagePath,
    publicUrl,
    fileName: file.name,
  }
}

/**
 * Carga todos los álbumes y sus fotografías, respetando tanto las tablas nuevas
 * (`galeria_albumes` + `galeria_fotos`) como cualquier registro existente en `public.galeria`.
 */
export async function fetchAlbumsAndPhotos() {
  const mode = await detectGallerySchemaMode()

  if (mode === "relational") {
    const [albumsRes, photosRes, legacyRes] = await Promise.all([
      supabase
        .from("galeria_albumes")
        .select("*")
        .order("fecha_actividad", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("galeria_fotos")
        .select("*")
        .order("orden", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("galeria")
        .select("*")
        .order("created_at", { ascending: false }),
    ])

    if (albumsRes.error) throw albumsRes.error
    if (photosRes.error) throw photosRes.error

    const rawAlbums = albumsRes.data || []
    const rawPhotos = photosRes.data || []
    const rawLegacy = legacyRes.data || []

    // Agrupar fotos por album_id
    const photosByAlbum = new Map()
    for (const photo of rawPhotos) {
      const list = photosByAlbum.get(photo.album_id) || []
      list.push({
        id: photo.id,
        album_id: photo.album_id,
        nombre_archivo: photo.nombre_archivo || "Fotografía",
        ruta_storage: photo.ruta_storage || extractStoragePathFromUrl(photo.imagen_url),
        imagen_url: photo.imagen_url,
        descripcion: photo.descripcion || "",
        orden: photo.orden || list.length + 1,
        subido_por: photo.subido_por,
        created_at: photo.created_at,
        source: "galeria_fotos",
      })
      photosByAlbum.set(photo.album_id, list)
    }

    const albums = rawAlbums.map((alb) => {
      const albPhotos = photosByAlbum.get(alb.id) || []
      const cover = alb.portada_url || albPhotos[0]?.imagen_url || ""
      return {
        id: alb.id,
        nombre: alb.nombre,
        descripcion: alb.descripcion || "",
        fecha_actividad: alb.fecha_actividad || (alb.created_at ? alb.created_at.slice(0, 10) : ""),
        lugar: alb.lugar || "",
        portada_url: cover,
        portada_storage_path: alb.portada_storage_path || extractStoragePathFromUrl(cover),
        creado_por: alb.creado_por,
        created_at: alb.created_at,
        updated_at: alb.updated_at || alb.created_at,
        fotos: albPhotos,
        fotos_count: albPhotos.length,
        source: "relational",
      }
    })

    // Verificar si en `public.galeria` hay álbumes guardados en modo compatible o fotos sueltas no migradas
    const existingUrls = new Set(rawPhotos.map((p) => p.imagen_url))
    const fallbackGroups = new Map()
    const looseLegacyPhotos = []

    for (const row of rawLegacy) {
      if (row.album_id) continue
      const meta = decodeFallbackMeta(row.descripcion)
      if (meta && meta.albumKey) {
        if (!fallbackGroups.has(meta.albumKey)) {
          fallbackGroups.set(meta.albumKey, {
            albumKey: meta.albumKey,
            nombre: meta.nombre || row.titulo || "Álbum",
            descripcion: meta.descripcion || "",
            fecha_actividad: meta.fecha_actividad || (row.created_at ? row.created_at.slice(0, 10) : ""),
            lugar: meta.lugar || "",
            portada_url: meta.portada_url || row.imagen_url,
            creado_por: row.uploaded_by,
            created_at: row.created_at,
            updated_at: row.created_at,
            rows: [],
          })
        }
        const grp = fallbackGroups.get(meta.albumKey)
        if (meta.metaUpdatedAt && (!grp.metaUpdatedAt || meta.metaUpdatedAt > grp.metaUpdatedAt)) {
          grp.nombre = meta.nombre || grp.nombre
          grp.descripcion = meta.descripcion ?? grp.descripcion
          grp.fecha_actividad = meta.fecha_actividad || grp.fecha_actividad
          grp.lugar = meta.lugar ?? grp.lugar
          grp.portada_url = meta.portada_url || grp.portada_url
          grp.metaUpdatedAt = meta.metaUpdatedAt
        }
        if (!meta.isMetadataOnly) {
          grp.rows.push({ row, meta })
        }
      } else if (!existingUrls.has(row.imagen_url)) {
        looseLegacyPhotos.push({
          id: row.id,
          album_id: "legacy-loose",
          nombre_archivo: row.titulo || "Fotografía histórica",
          ruta_storage: extractStoragePathFromUrl(row.imagen_url),
          imagen_url: row.imagen_url,
          descripcion: row.descripcion || "",
          orden: looseLegacyPhotos.length + 1,
          subido_por: row.uploaded_by,
          created_at: row.created_at,
          source: "galeria_legacy",
        })
      }
    }

    // Incluir grupos compatibles si existieran
    for (const [, grp] of fallbackGroups.entries()) {
      const fPhotos = grp.rows
        .sort((a, b) => (a.meta.orden || 0) - (b.meta.orden || 0))
        .map(({ row, meta }, idx) => ({
          id: row.id,
          album_id: grp.albumKey,
          nombre_archivo: meta.nombre_archivo || row.titulo || `Foto ${idx + 1}`,
          ruta_storage: meta.ruta_storage || extractStoragePathFromUrl(row.imagen_url),
          imagen_url: row.imagen_url,
          descripcion: meta.foto_descripcion || "",
          orden: meta.orden || idx + 1,
          subido_por: row.uploaded_by,
          created_at: row.created_at,
          source: "galeria_fallback",
          rawMeta: meta,
        }))

      albums.push({
        id: grp.albumKey,
        nombre: grp.nombre,
        descripcion: grp.descripcion,
        fecha_actividad: grp.fecha_actividad,
        lugar: grp.lugar,
        portada_url: grp.portada_url || fPhotos[0]?.imagen_url || "",
        portada_storage_path: extractStoragePathFromUrl(grp.portada_url || fPhotos[0]?.imagen_url || ""),
        creado_por: grp.creado_por,
        created_at: grp.created_at,
        updated_at: grp.updated_at,
        fotos: fPhotos,
        fotos_count: fPhotos.length,
        source: "fallback",
      })
    }

    // Si hay fotografías individuales antiguas sin álbum, presentarlas en un álbum especial para no perderlas
    if (looseLegacyPhotos.length > 0) {
      albums.push({
        id: "legacy-loose",
        nombre: "Fotografías Individuales Anteriores",
        descripcion:
          "Fotografías registradas antes de la actualización por álbumes. Puedes visualizarlas o moverlas a cualquier álbum.",
        fecha_actividad: looseLegacyPhotos[0]?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        lugar: "Parroquia Nuestro Señor de Esquipulas",
        portada_url: looseLegacyPhotos[0]?.imagen_url || "",
        portada_storage_path: looseLegacyPhotos[0]?.ruta_storage || "",
        creado_por: looseLegacyPhotos[0]?.subido_por || null,
        created_at: looseLegacyPhotos[0]?.created_at || new Date().toISOString(),
        updated_at: looseLegacyPhotos[0]?.created_at || new Date().toISOString(),
        fotos: looseLegacyPhotos,
        fotos_count: looseLegacyPhotos.length,
        isLegacyGroup: true,
        source: "legacy_loose",
      })
    }

    const totalPhotos = albums.reduce((acc, a) => acc + (a.fotos?.length || 0), 0)
    return {
      albums,
      totalAlbums: albums.length,
      totalPhotos,
      mode: "relational",
    }
  }

  // MODO COMPATIBLE SOBRE `public.galeria`
  const { data: rawRows, error } = await supabase
    .from("galeria")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) throw error

  const groups = new Map()
  const loosePhotos = []

  for (const row of rawRows || []) {
    const meta = decodeFallbackMeta(row.descripcion)
    if (meta && meta.albumKey) {
      if (!groups.has(meta.albumKey)) {
        groups.set(meta.albumKey, {
          id: meta.albumKey,
          nombre: meta.nombre || row.titulo || "Álbum sin título",
          descripcion: meta.descripcion || "",
          fecha_actividad: meta.fecha_actividad || (row.created_at ? row.created_at.slice(0, 10) : ""),
          lugar: meta.lugar || "",
          portada_url: meta.portada_url || row.imagen_url,
          portada_storage_path: meta.portada_storage_path || extractStoragePathFromUrl(meta.portada_url || row.imagen_url),
          creado_por: row.uploaded_by,
          created_at: row.created_at,
          updated_at: row.created_at,
          metaUpdatedAt: meta.metaUpdatedAt || 0,
          allRowIds: [],
          photoEntries: [],
        })
      }
      const grp = groups.get(meta.albumKey)
      grp.allRowIds.push(row.id)

      if ((meta.metaUpdatedAt || 0) >= (grp.metaUpdatedAt || 0)) {
        grp.nombre = meta.nombre || grp.nombre
        grp.descripcion = meta.descripcion ?? grp.descripcion
        grp.fecha_actividad = meta.fecha_actividad || grp.fecha_actividad
        grp.lugar = meta.lugar ?? grp.lugar
        if (meta.portada_url) {
          grp.portada_url = meta.portada_url
          grp.portada_storage_path = meta.portada_storage_path || extractStoragePathFromUrl(meta.portada_url)
        }
        grp.metaUpdatedAt = meta.metaUpdatedAt || grp.metaUpdatedAt
        grp.updated_at = row.created_at
      }

      if (!meta.isMetadataOnly) {
        grp.photoEntries.push({ row, meta })
      }
    } else {
      loosePhotos.push({
        id: row.id,
        album_id: "legacy-loose",
        nombre_archivo: row.titulo || "Fotografía",
        ruta_storage: extractStoragePathFromUrl(row.imagen_url),
        imagen_url: row.imagen_url,
        descripcion: row.descripcion || "",
        orden: loosePhotos.length + 1,
        subido_por: row.uploaded_by,
        created_at: row.created_at,
        source: "galeria_legacy",
      })
    }
  }

  const albums = Array.from(groups.values()).map((grp) => {
    const fotos = grp.photoEntries
      .sort((a, b) => (a.meta.orden || 0) - (b.meta.orden || 0))
      .map(({ row, meta }, idx) => ({
        id: row.id,
        album_id: grp.id,
        nombre_archivo: meta.nombre_archivo || row.titulo || `Foto ${idx + 1}`,
        ruta_storage: meta.ruta_storage || extractStoragePathFromUrl(row.imagen_url),
        imagen_url: row.imagen_url,
        descripcion: meta.foto_descripcion || "",
        orden: meta.orden || idx + 1,
        subido_por: row.uploaded_by,
        created_at: row.created_at,
        source: "galeria_fallback",
        rawMeta: meta,
      }))

    const coverUrl = grp.portada_url || fotos[0]?.imagen_url || ""
    return {
      id: grp.id,
      nombre: grp.nombre,
      descripcion: grp.descripcion,
      fecha_actividad: grp.fecha_actividad,
      lugar: grp.lugar,
      portada_url: coverUrl,
      portada_storage_path: grp.portada_storage_path || extractStoragePathFromUrl(coverUrl),
      creado_por: grp.creado_por,
      created_at: grp.created_at,
      updated_at: grp.updated_at,
      allRowIds: grp.allRowIds,
      fotos,
      fotos_count: fotos.length,
      source: "fallback",
    }
  })

  if (loosePhotos.length > 0) {
    albums.push({
      id: "legacy-loose",
      nombre: "Fotografías Individuales Anteriores",
      descripcion:
        "Fotografías registradas previamente en la galería. Puedes visualizarlas o moverlas a un álbum de actividad.",
      fecha_actividad: loosePhotos[0]?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      lugar: "Parroquia Nuestro Señor de Esquipulas",
      portada_url: loosePhotos[0]?.imagen_url || "",
      portada_storage_path: loosePhotos[0]?.ruta_storage || "",
      creado_por: loosePhotos[0]?.subido_por || null,
      created_at: loosePhotos[0]?.created_at || new Date().toISOString(),
      updated_at: loosePhotos[0]?.created_at || new Date().toISOString(),
      fotos: loosePhotos,
      fotos_count: loosePhotos.length,
      isLegacyGroup: true,
      source: "legacy_loose",
    })
  }

  // Ordenar por fecha de actividad más reciente por defecto
  albums.sort((a, b) => {
    const dateA = a.fecha_actividad || ""
    const dateB = b.fecha_actividad || ""
    if (dateA !== dateB) return dateB.localeCompare(dateA)
    return String(b.created_at || "").localeCompare(String(a.created_at || ""))
  })

  const totalPhotos = albums.reduce((acc, a) => acc + (a.fotos?.length || 0), 0)

  return {
    albums,
    totalAlbums: albums.length,
    totalPhotos,
    mode: "legacy_compatible",
  }
}

/**
 * Crea un álbum nuevo y sube múltiples fotografías a Supabase Storage con reporte de progreso
 * individual y general, manejo de errores y soporte de cancelación.
 */
export async function createAlbumWithPhotos({
  nombre,
  descripcion = "",
  fecha_actividad,
  lugar = "",
  coverFile = null,
  coverIndex = 0,
  files = [],
  userId = null,
  onPhotoProgress,
  onOverallProgress,
  isCancelledRef,
}) {
  if (!nombre?.trim()) {
    throw new Error("El nombre de la actividad es obligatorio.")
  }
  if (!files || files.length === 0) {
    throw new Error("Selecciona al menos una fotografía para el álbum.")
  }

  const mode = await detectGallerySchemaMode()
  const albumSlug = slugifyAlbumName(nombre)
  const albumFolderId = shortUid()
  const uploadedStoragePaths = []
  const uploadedItems = []

  const totalSteps = files.length + (coverFile ? 1 : 0)
  let completedSteps = 0

  const reportOverall = () => {
    const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
    onOverallProgress?.({
      completed: completedSteps,
      total: totalSteps,
      percent,
    })
  }

  try {
    reportOverall()

    // 1. Si se seleccionó un archivo específico de portada independiente, subirlo primero
    let dedicatedCoverResult = null
    if (coverFile) {
      if (isCancelledRef?.current) throw new Error("__CANCELLED__")
      dedicatedCoverResult = await uploadFileToAlbumFolder({
        file: coverFile,
        albumSlug,
        albumFolderId,
        prefix: "portada",
        index: 0,
      })
      uploadedStoragePaths.push(dedicatedCoverResult.storagePath)
      completedSteps += 1
      reportOverall()
    }

    // 2. Subir todas las fotografías del álbum con progreso individual
    for (let i = 0; i < files.length; i++) {
      if (isCancelledRef?.current) {
        throw new Error("__CANCELLED__")
      }

      const fileObj = files[i]
      const rawFile = fileObj.file || fileObj

      onPhotoProgress?.(i, {
        status: "optimizing",
        progress: 25,
        error: null,
      })

      try {
        onPhotoProgress?.(i, {
          status: "uploading",
          progress: 60,
          error: null,
        })

        const uploaded = await uploadFileToAlbumFolder({
          file: rawFile,
          albumSlug,
          albumFolderId,
          prefix: "foto",
          index: i + 1,
        })

        uploadedStoragePaths.push(uploaded.storagePath)
        uploadedItems.push({
          ...uploaded,
          orden: i + 1,
          originalIndex: i,
        })

        completedSteps += 1
        onPhotoProgress?.(i, {
          status: "completed",
          progress: 100,
          error: null,
        })
        reportOverall()
      } catch (photoErr) {
        onPhotoProgress?.(i, {
          status: "error",
          progress: 0,
          error: photoErr.message || "Error al subir imagen",
        })
        throw photoErr
      }
    }

    if (isCancelledRef?.current) {
      throw new Error("__CANCELLED__")
    }

    // Determinar URL y ruta de portada
    const chosenFromList =
      uploadedItems.find((item) => item.originalIndex === coverIndex) || uploadedItems[0]

    const finalCoverUrl = dedicatedCoverResult?.publicUrl || chosenFromList?.publicUrl || ""
    const finalCoverPath = dedicatedCoverResult?.storagePath || chosenFromList?.storagePath || ""

    // 3. Guardar en la base de datos según el modo activo
    if (mode === "relational") {
      const { data: createdAlbum, error: albumErr } = await supabase
        .from("galeria_albumes")
        .insert({
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          fecha_actividad: fecha_actividad || new Date().toISOString().slice(0, 10),
          lugar: lugar?.trim() || null,
          portada_url: finalCoverUrl,
          portada_storage_path: finalCoverPath,
          creado_por: userId || null,
        })
        .select()
        .single()

      if (albumErr) throw albumErr

      const photoRows = uploadedItems.map((item) => ({
        album_id: createdAlbum.id,
        nombre_archivo: item.fileName,
        ruta_storage: item.storagePath,
        imagen_url: item.publicUrl,
        descripcion: null,
        orden: item.orden,
        subido_por: userId || null,
      }))

      const { error: photosErr } = await supabase
        .from("galeria_fotos")
        .insert(photoRows)

      if (photosErr) {
        // Revertir el álbum recién creado si falló la inserción de fotos
        await supabase.from("galeria_albumes").delete().eq("id", createdAlbum.id)
        throw photosErr
      }

      return createdAlbum.id
    } else {
      // Modo compatible sobre `public.galeria`
      const albumKey = `alb-${albumFolderId}`
      const metaTimestamp = Date.now()
      const rowsToInsert = uploadedItems.map((item) => ({
        titulo: nombre.trim(),
        imagen_url: item.publicUrl,
        uploaded_by: userId || null,
        descripcion: encodeFallbackMeta({
          albumKey,
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || "",
          fecha_actividad: fecha_actividad || new Date().toISOString().slice(0, 10),
          lugar: lugar?.trim() || "",
          portada_url: finalCoverUrl,
          portada_storage_path: finalCoverPath,
          nombre_archivo: item.fileName,
          ruta_storage: item.storagePath,
          orden: item.orden,
          metaUpdatedAt: metaTimestamp,
        }),
      }))

      const { error: insertErr } = await supabase
        .from("galeria")
        .insert(rowsToInsert)

      if (insertErr) throw insertErr
      return albumKey
    }
  } catch (err) {
    // Limpiar archivos subidos a Storage si la operación se canceló o falló antes de guardar en BD
    if (uploadedStoragePaths.length > 0) {
      await supabase.storage.from(BUCKET_NAME).remove(uploadedStoragePaths).catch(() => {})
    }
    if (err.message === "__CANCELLED__") {
      throw new Error("Subida cancelada por el usuario.")
    }
    throw err
  }
}

/**
 * Agrega nuevas fotografías a un álbum existente
 */
export async function addPhotosToExistingAlbum({
  album,
  files = [],
  userId = null,
  onPhotoProgress,
  onOverallProgress,
  isCancelledRef,
}) {
  if (!album || !files.length) return

  const albumSlug = slugifyAlbumName(album.nombre)
  const albumFolderId = String(album.id).replace(/^alb-/, "").slice(0, 14) || shortUid()
  const currentMaxOrder = (album.fotos || []).reduce(
    (max, f) => Math.max(max, Number(f.orden) || 0),
    0
  )

  const uploadedStoragePaths = []
  const uploadedItems = []
  let completedSteps = 0

  const reportOverall = () => {
    const percent = Math.round((completedSteps / files.length) * 100)
    onOverallProgress?.({
      completed: completedSteps,
      total: files.length,
      percent,
    })
  }

  try {
    reportOverall()

    for (let i = 0; i < files.length; i++) {
      if (isCancelledRef?.current) throw new Error("__CANCELLED__")

      const rawFile = files[i].file || files[i]
      onPhotoProgress?.(i, { status: "optimizing", progress: 25, error: null })

      try {
        onPhotoProgress?.(i, { status: "uploading", progress: 65, error: null })

        const uploaded = await uploadFileToAlbumFolder({
          file: rawFile,
          albumSlug,
          albumFolderId,
          prefix: "foto",
          index: currentMaxOrder + i + 1,
        })

        uploadedStoragePaths.push(uploaded.storagePath)
        uploadedItems.push({
          ...uploaded,
          orden: currentMaxOrder + i + 1,
        })

        completedSteps += 1
        onPhotoProgress?.(i, { status: "completed", progress: 100, error: null })
        reportOverall()
      } catch (photoErr) {
        onPhotoProgress?.(i, {
          status: "error",
          progress: 0,
          error: photoErr.message || "Error al subir",
        })
        throw photoErr
      }
    }

    if (isCancelledRef?.current) throw new Error("__CANCELLED__")

    if (album.source === "relational") {
      const photoRows = uploadedItems.map((item) => ({
        album_id: album.id,
        nombre_archivo: item.fileName,
        ruta_storage: item.storagePath,
        imagen_url: item.publicUrl,
        descripcion: null,
        orden: item.orden,
        subido_por: userId || null,
      }))

      const { error } = await supabase.from("galeria_fotos").insert(photoRows)
      if (error) throw error

      // Si el álbum no tenía portada, asignar la primera foto subida
      if (!album.portada_url && uploadedItems[0]) {
        await supabase
          .from("galeria_albumes")
          .update({
            portada_url: uploadedItems[0].publicUrl,
            portada_storage_path: uploadedItems[0].storagePath,
          })
          .eq("id", album.id)
      }
    } else {
      const metaTimestamp = Date.now()
      const coverUrl = album.portada_url || uploadedItems[0]?.publicUrl || ""
      const coverPath = album.portada_storage_path || uploadedItems[0]?.storagePath || ""

      const rowsToInsert = uploadedItems.map((item) => ({
        titulo: album.nombre,
        imagen_url: item.publicUrl,
        uploaded_by: userId || null,
        descripcion: encodeFallbackMeta({
          albumKey: album.id,
          nombre: album.nombre,
          descripcion: album.descripcion || "",
          fecha_actividad: album.fecha_actividad,
          lugar: album.lugar || "",
          portada_url: coverUrl,
          portada_storage_path: coverPath,
          nombre_archivo: item.fileName,
          ruta_storage: item.storagePath,
          orden: item.orden,
          metaUpdatedAt: metaTimestamp,
        }),
      }))

      const { error } = await supabase.from("galeria").insert(rowsToInsert)
      if (error) throw error
    }
  } catch (err) {
    if (uploadedStoragePaths.length > 0) {
      await supabase.storage.from(BUCKET_NAME).remove(uploadedStoragePaths).catch(() => {})
    }
    if (err.message === "__CANCELLED__") {
      throw new Error("Operación cancelada por el usuario.")
    }
    throw err
  }
}

/**
 * Actualiza la información de un álbum (nombre, descripción, fecha, lugar y/o portada)
 */
export async function updateAlbumDetails({
  album,
  nombre,
  descripcion,
  fecha_actividad,
  lugar,
  newCoverFile = null,
  selectedCoverPhoto = null,
  userId = null,
}) {
  if (!album) throw new Error("Álbum no válido")

  let finalCoverUrl = selectedCoverPhoto?.imagen_url || album.portada_url || ""
  let finalCoverPath = selectedCoverPhoto?.ruta_storage || album.portada_storage_path || ""

  if (newCoverFile) {
    const albumSlug = slugifyAlbumName(nombre || album.nombre)
    const albumFolderId = String(album.id).replace(/^alb-/, "").slice(0, 14) || shortUid()
    const uploadedCover = await uploadFileToAlbumFolder({
      file: newCoverFile,
      albumSlug,
      albumFolderId,
      prefix: "portada",
      index: 0,
    })
    finalCoverUrl = uploadedCover.publicUrl
    finalCoverPath = uploadedCover.storagePath
  }

  if (album.source === "relational") {
    const { error } = await supabase
      .from("galeria_albumes")
      .update({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        fecha_actividad: fecha_actividad || album.fecha_actividad,
        lugar: lugar?.trim() || null,
        portada_url: finalCoverUrl,
        portada_storage_path: finalCoverPath,
      })
      .eq("id", album.id)

    if (error) throw error
  } else {
    // Actualizar en modo compatible sobre `public.galeria`
    const metaTimestamp = Date.now()
    const firstPhoto = album.fotos?.[0]

    if (firstPhoto?.id) {
      const updatedDesc = encodeFallbackMeta({
        ...(firstPhoto.rawMeta || {}),
        albumKey: album.id,
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || "",
        fecha_actividad: fecha_actividad || album.fecha_actividad,
        lugar: lugar?.trim() || "",
        portada_url: finalCoverUrl,
        portada_storage_path: finalCoverPath,
        nombre_archivo: firstPhoto.nombre_archivo,
        ruta_storage: firstPhoto.ruta_storage,
        orden: firstPhoto.orden || 1,
        metaUpdatedAt: metaTimestamp,
      })

      const { data: updatedRows, error: updateErr } = await supabase
        .from("galeria")
        .update({
          titulo: nombre.trim(),
          descripcion: updatedDesc,
        })
        .eq("id", firstPhoto.id)
        .select()

      // Si RLS aún no tiene la política UPDATE en `public.galeria`, insertar marcador de metadatos actualizado
      if (updateErr || !updatedRows || updatedRows.length === 0) {
        const { error: markerErr } = await supabase.from("galeria").insert({
          titulo: nombre.trim(),
          imagen_url: finalCoverUrl || firstPhoto.imagen_url,
          uploaded_by: userId || null,
          descripcion: encodeFallbackMeta({
            albumKey: album.id,
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || "",
            fecha_actividad: fecha_actividad || album.fecha_actividad,
            lugar: lugar?.trim() || "",
            portada_url: finalCoverUrl,
            portada_storage_path: finalCoverPath,
            isMetadataOnly: true,
            metaUpdatedAt: metaTimestamp,
          }),
        })
        if (markerErr) throw markerErr
      }
    }
  }
}

/**
 * Elimina una fotografía individual del álbum manteniendo consistencia entre BD y Storage
 */
export async function deleteSinglePhoto({ album, photo }) {
  if (!photo?.id) throw new Error("Fotografía no válida")

  // 1. Eliminar primero el registro en la base de datos
  if (photo.source === "galeria_fotos") {
    const { error } = await supabase
      .from("galeria_fotos")
      .delete()
      .eq("id", photo.id)

    if (error) throw error
  } else {
    const { error } = await supabase
      .from("galeria")
      .delete()
      .eq("id", photo.id)

    if (error) throw error
  }

  // 2. Si la foto eliminada era la portada del álbum, actualizar la portada a la siguiente foto disponible
  const remainingPhotos = (album?.fotos || []).filter((p) => p.id !== photo.id)
  if (album && album.portada_url === photo.imagen_url && album.source === "relational") {
    const nextPhoto = remainingPhotos[0]
    await supabase
      .from("galeria_albumes")
      .update({
        portada_url: nextPhoto?.imagen_url || null,
        portada_storage_path: nextPhoto?.ruta_storage || null,
      })
      .eq("id", album.id)
      .catch(() => {})
  }

  // 3. Eliminar el archivo físico de Supabase Storage solo después de confirmar el borrado en BD
  const storagePath = photo.ruta_storage || extractStoragePathFromUrl(photo.imagen_url)
  if (storagePath) {
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]).catch((err) => {
      console.warn("Aviso al limpiar archivo en Storage:", err)
    })
  }
}

/**
 * Elimina un álbum completo y todas sus fotografías asociadas en BD y Supabase Storage
 */
export async function deleteCompleteAlbum(album) {
  if (!album?.id) throw new Error("Álbum no válido")

  // Recolectar todas las rutas de Storage de las fotografías y portada del álbum
  const pathsToDelete = new Set()
  if (album.portada_storage_path) {
    pathsToDelete.add(album.portada_storage_path)
  } else if (album.portada_url) {
    const p = extractStoragePathFromUrl(album.portada_url)
    if (p) pathsToDelete.add(p)
  }

  for (const photo of album.fotos || []) {
    const p = photo.ruta_storage || extractStoragePathFromUrl(photo.imagen_url)
    if (p) pathsToDelete.add(p)
  }

  // 1. Eliminar primero en la base de datos (consistencia garantizada)
  if (album.source === "relational") {
    const { error } = await supabase
      .from("galeria_albumes")
      .delete()
      .eq("id", album.id)

    if (error) throw error
  } else if (album.isLegacyGroup) {
    const ids = (album.fotos || []).map((f) => f.id).filter(Boolean)
    if (ids.length > 0) {
      const { error } = await supabase
        .from("galeria")
        .delete()
        .in("id", ids)
      if (error) throw error
    }
  } else {
    const ids = album.allRowIds?.length
      ? album.allRowIds
      : (album.fotos || []).map((f) => f.id).filter(Boolean)

    if (ids.length > 0) {
      const { error } = await supabase
        .from("galeria")
        .delete()
        .in("id", ids)
      if (error) throw error
    }
  }

  // 2. Una vez eliminados los registros en BD, limpiar los archivos del bucket `gallery`
  const pathList = Array.from(pathsToDelete).filter(Boolean)
  if (pathList.length > 0) {
    await supabase.storage.from(BUCKET_NAME).remove(pathList).catch((err) => {
      console.warn("Aviso al eliminar archivos del álbum en Storage:", err)
    })
  }
}

/**
 * Organiza/mueve fotografías individuales anteriores hacia un álbum existente sin perder sus archivos
 */
export async function moveLegacyPhotosToAlbum({ photos = [], targetAlbum, userId = null }) {
  if (!photos.length || !targetAlbum) return

  const startOrder = (targetAlbum.fotos || []).reduce(
    (max, f) => Math.max(max, Number(f.orden) || 0),
    0
  )

  if (targetAlbum.source === "relational") {
    const rows = photos.map((p, idx) => ({
      album_id: targetAlbum.id,
      nombre_archivo: p.nombre_archivo || `Fotografía ${idx + 1}`,
      ruta_storage: p.ruta_storage || extractStoragePathFromUrl(p.imagen_url),
      imagen_url: p.imagen_url,
      descripcion: p.descripcion || null,
      orden: startOrder + idx + 1,
      subido_por: p.subido_por || userId || null,
    }))

    const { error: insertErr } = await supabase.from("galeria_fotos").insert(rows)
    if (insertErr) throw insertErr

    const legacyIds = photos.map((p) => p.id).filter(Boolean)
    if (legacyIds.length > 0) {
      // Vincular o limpiar el registro suelto en `public.galeria`
      await supabase
        .from("galeria")
        .update({ album_id: targetAlbum.id })
        .in("id", legacyIds)
        .catch(() => {})
    }
  } else {
    const metaTimestamp = Date.now()
    const newRows = photos.map((p, idx) => ({
      titulo: targetAlbum.nombre,
      imagen_url: p.imagen_url,
      uploaded_by: p.subido_por || userId || null,
      descripcion: encodeFallbackMeta({
        albumKey: targetAlbum.id,
        nombre: targetAlbum.nombre,
        descripcion: targetAlbum.descripcion || "",
        fecha_actividad: targetAlbum.fecha_actividad,
        lugar: targetAlbum.lugar || "",
        portada_url: targetAlbum.portada_url || p.imagen_url,
        portada_storage_path: targetAlbum.portada_storage_path || p.ruta_storage,
        nombre_archivo: p.nombre_archivo || `Fotografía ${idx + 1}`,
        ruta_storage: p.ruta_storage || extractStoragePathFromUrl(p.imagen_url),
        foto_descripcion: p.descripcion || "",
        orden: startOrder + idx + 1,
        metaUpdatedAt: metaTimestamp,
      }),
    }))

    const { error: insErr } = await supabase.from("galeria").insert(newRows)
    if (insErr) throw insErr

    const oldIds = photos.map((p) => p.id).filter(Boolean)
    if (oldIds.length > 0) {
      await supabase.from("galeria").delete().in("id", oldIds).catch(() => {})
    }
  }
}
