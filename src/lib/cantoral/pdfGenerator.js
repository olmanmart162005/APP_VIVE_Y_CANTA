/**
 * pdfGenerator.js — Cantoral Litúrgico · Flujo Editorial Continuo
 *
 * Algoritmo de maquetación:
 *  1. Cada sección produce una lista plana de UNIDADES:
 *       • Unidad anclaje = encabezado + número + título + tono + primera estrofa (indivisible)
 *       • Unidades restantes = cada estrofa/coro siguiente (indivisible individualmente)
 *  2. Todas las unidades de todas las secciones se ensamblan en una lista plana única.
 *  3. Las unidades se distribuyen en columnas de forma continua:
 *       Columna 1 → Columna 2 → Columna 3 → Nueva página → Columna 1 → …
 *  4. Si una unidad no cabe al final de la columna actual:
 *       → mover esa unidad COMPLETA al inicio de la siguiente columna.
 *       → NO dividirla. NO dejar espacio enorme.
 *  5. El título de un canto aparece UNA sola vez (en la unidad anclaje).
 *  6. El comportamiento replica el libro "Cantemos con Alegría al Señor".
 */

import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { parseMarkdown, blocksToPdfmake } from './markdownParser'

pdfMake.vfs = pdfFonts?.pdfMake?.vfs ?? pdfFonts?.vfs ?? pdfFonts

// ─── Constantes de diseño ────────────────────────────────────────────────────
const GOLD      = '#D4AF37'
const GOLD_DARK = '#8B6914'
const INK       = '#1a1a1a'
const BODY      = '#2d2d2d'
const MUTED     = '#666666'

// Geometría A4
const PAGE_W   = 595
const PAGE_H   = 841.89
const M_LEFT   = 28
const M_TOP    = 80    // espacio para encabezado
const M_RIGHT  = 28
const M_BOTTOM = 45    // espacio para pie de página
const PRINT_W  = PAGE_W - M_LEFT - M_RIGHT        // 539 pt
const PRINT_H  = PAGE_H - M_TOP  - M_BOTTOM       // ≈ 717 pt

// Tres columnas
const N_COLS  = 3
const COL_GAP = 8                                  // espacio entre columnas
const COL_W   = (PRINT_W - COL_GAP * (N_COLS - 1)) / N_COLS  // ≈ 174 pt

// Límite de altura por columna
// Se usa 88 % del espacio real para absorber errores de estimación.
const MAX_COL_H = Math.floor(PRINT_H * 0.88)      // ≈ 631 pt

// Métricas de fuente (Roboto 9 pt)
const FONT_SZ  = 9
const LH_BODY  = 1.18    // lineHeight en estrofas
const CH_W     = 4.8     // pt por carácter promedio (Roboto 9 pt)
const CPL      = Math.floor(COL_W / CH_W)          // ≈ 36 caracteres por línea

// Identidad parroquial
const PARROQUIA_LINE1 = 'Parroquia Nuestro Señor de Esquipulas'
const PARROQUIA_LINE2 = 'El Triunfo, Choluteca, Honduras'


// ─── Logo (redimensionado una sola vez, cacheado en sesión) ──────────────────
let _logoCache = null

async function getLogoDataUrl(src) {
  if (_logoCache) return _logoCache
  if (!src) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const S   = 180
      const cvs = document.createElement('canvas')
      cvs.width = cvs.height = S
      const ctx = cvs.getContext('2d')
      const sc  = Math.min(S / img.width, S / img.height)
      ctx.clearRect(0, 0, S, S)
      ctx.drawImage(img, (S - img.width * sc) / 2, (S - img.height * sc) / 2,
                    img.width * sc, img.height * sc)
      _logoCache = cvs.toDataURL('image/png', 0.85)
      resolve(_logoCache)
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}


// ─── Utilidades de fecha ─────────────────────────────────────────────────────
function fmtLong(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtShort(iso) {
  if (!iso) return 'sin-fecha'
  const p = (iso || '').split('-')
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : iso
}

function buildFilename(hoja) {
  return `Hoja de Cantos - ${hoja.celebracion || 'Celebracion'} - ${fmtShort(hoja.fecha)}.pdf`
}


// ─── Estimador de altura ──────────────────────────────────────────────────────
//
// Devuelve la altura estimada en pt de un nodo pdfmake.
// Usa un 10 % de margen extra (SAFE = 1.10) para absorber pequeñas diferencias
// entre la estimación y el renderizado real de pdfmake.
//
const SAFE = 1.10

function estimateH(node) {
  if (!node) return 0

  // Pila (stack)
  if (node.stack) {
    const m = node.margin || [0, 0, 0, 0]
    const inner = node.stack.reduce((s, c) => s + estimateH(c), 0)
    return m[1] + inner + m[3]
  }

  // Canvas (regla, separador)
  if (node.canvas) {
    const m = node.margin || [0, 0, 0, 0]
    return m[1] + 2 + m[3]
  }

  // Nodo de texto
  if (node.text !== undefined) {
    const fs  = node.fontSize  || FONT_SZ
    const lh  = node.lineHeight || 1.3
    const m   = node.margin    || [0, 0, 0, 0]

    // Texto plano (puede ser string, array de spans, u objeto {text,bold})
    let raw = ''
    if (typeof node.text === 'string') {
      raw = node.text
    } else if (Array.isArray(node.text)) {
      raw = node.text.map(t => (typeof t === 'string' ? t : t.text || '')).join('')
    }

    const cpl    = Math.max(1, Math.floor(COL_W / (fs * 0.50)))
    const nlines = raw.length > 0 ? Math.ceil(raw.length / cpl) : 1
    return m[1] + (nlines * fs * lh * SAFE) + m[3]
  }

  return 6   // nodo desconocido — margen mínimo de seguridad
}


// ─── Sección → lista plana de unidades ───────────────────────────────────────
//
// Una "unidad" es un nodo pdfmake que NO se puede dividir.
// La unidad [0] de cada sección es el "anclaje":
//   encabezado litúrgico + número + título + tono + primera estrofa.
// Las unidades [1..n] son el resto de las estrofas, cada una individualmente.
//
function sectionToUnits(section) {
  const { sectionLabel, rawValue, song, isNumeric, textoManual } = section
  const units = []

  // ── Encabezado de sección ─────────────────────────────────────────────────
  const headerNode = {
    stack: [
      {
        text: sectionLabel.toUpperCase(),
        fontSize: 7, bold: true, color: GOLD_DARK,
        characterSpacing: 1.8,
        margin: [0, 8, 0, 1],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.8, lineColor: GOLD }],
        margin: [0, 0, 0, 3],
      },
    ],
  }

  let titleNode   = null
  let stropheList = []   // array de nodos pdfmake (uno por estrofa)

  if (isNumeric && song) {
    // ── Número + título + tono ────────────────────────────────────────────
    const titleStack = [
      {
        text: (song.titulo || '').toUpperCase(),
        fontSize: 8.5, bold: true, color: INK,
        margin: [0, 1, 0, 1],
      },
    ]
    if (song.tono || song.compositor) {
      const parts = []
      if (song.tono)       parts.push(`(${song.tono})`)
      if (song.compositor) parts.push(`(${song.compositor})`)
      titleStack.push({
        text: parts.join(' '),
        fontSize: 7.5, italics: true, color: MUTED,
        margin: [0, 0, 0, 3],
      })
    }
    titleNode = { stack: titleStack }

    // ── Letra: preferir letra_markdown, fallback a letra plana ───────────
    if (song.letra_markdown && song.letra_markdown.trim()) {
      stropheList = blocksToPdfmake(parseMarkdown(song.letra_markdown))
    } else if (song.letra && song.letra.trim()) {
      // Dividir en párrafos; cada párrafo = una estrofa
      stropheList = song.letra
        .split(/\r?\n\r?\n/)
        .filter(p => p.trim())
        .map(para => ({
          stack: para.split('\n').map(line => ({
            text: line,
            fontSize: FONT_SZ, lineHeight: LH_BODY, color: BODY,
          })),
          unbreakable: true,
          margin: [0, 0, 0, 4],
        }))
    } else {
      stropheList = [{
        text: `Canto N.° ${rawValue}`,
        fontSize: FONT_SZ, italics: true, color: MUTED,
        margin: [0, 2, 0, 6],
      }]
    }
  } else {
    // ── Sección de texto libre (Salmo, Aleluya, etc.) ─────────────────────
    const raw = textoManual || rawValue || ''
    const lines = raw.split('\n').map(l => l.trim())
    let titleText = lines[0] || ''
    if (titleText.startsWith('# ')) titleText = titleText.slice(2).trim()

    if (titleText) {
      titleNode = {
        text: titleText.toUpperCase(),
        fontSize: 8.5, bold: true, color: INK,
        margin: [0, 1, 0, 3],
      }
    }

    const body = lines.slice(1).join('\n').trim()
    if (body) {
      const parsed = parseMarkdown(body)
      stropheList = parsed.length > 0
        ? blocksToPdfmake(parsed)
        : [{
            text: body,
            fontSize: FONT_SZ, color: BODY, lineHeight: 1.35,
            margin: [0, 2, 0, 6],
          }]
    }
  }

  // ── Armar unidad anclaje (encabezado + título + primera estrofa) ──────────
  // Este bloque NUNCA se separa — el título siempre va con su primera estrofa.
  const anchorChildren = [headerNode]
  if (titleNode) anchorChildren.push(titleNode)

  if (stropheList.length > 0) {
    anchorChildren.push(stropheList[0])   // primera estrofa dentro del anclaje
    units.push({ stack: anchorChildren }) // unidad anclaje

    // Estrofas restantes — cada una es su propia unidad indivisible
    for (let i = 1; i < stropheList.length; i++) {
      units.push(stropheList[i])
    }
  } else {
    // Sin estrofas: solo encabezado + título como anclaje
    units.push({ stack: anchorChildren })
  }

  // Agregar espacio visual al final de la última unidad de esta sección
  if (units.length > 0) {
    const lastUnit = units[units.length - 1]
    const prev = lastUnit.margin || [0, 0, 0, 0]
    units[units.length - 1] = { ...lastUnit, margin: [prev[0], prev[1], prev[2], 10] }
  }

  return units
}


// ─── Encabezado de página ────────────────────────────────────────────────────
function buildHeader(logo, hoja) {
  return {
    margin: [M_LEFT, 14, M_RIGHT, 0],
    stack: [
      {
        columns: [
          ...(logo ? [{ image: logo, width: 36, height: 36, margin: [0, 0, 8, 0] }] : []),
          {
            stack: [
              { text: 'CORO DE ALABANZA VIVE Y CANTA', bold: true, fontSize: 8, characterSpacing: 0.3, color: INK },
              { text: `${PARROQUIA_LINE1} • ${PARROQUIA_LINE2}`, fontSize: 6.5, color: MUTED, margin: [0, 1, 0, 0] },
            ],
            margin: [0, 3, 0, 0],
          },
          {
            stack: [
              { text: (hoja.celebracion || '').toUpperCase(), bold: true, fontSize: 8, alignment: 'right', color: INK },
              { text: [fmtLong(hoja.fecha), hoja.hora].filter(Boolean).join(' • '), fontSize: 7, alignment: 'right', color: MUTED, margin: [0, 1, 0, 0] },
              ...(hoja.lugar ? [{ text: hoja.lugar, fontSize: 7, alignment: 'right', color: '#888', margin: [0, 1, 0, 0] }] : []),
            ],
            margin: [0, 2, 0, 0],
          },
        ],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: PRINT_W, y2: 0, lineWidth: 1, lineColor: GOLD }],
        margin: [0, 6, 0, 0],
      },
    ],
  }
}


// ─── Pie de página ────────────────────────────────────────────────────────────
function buildFooter(currentPage, pageCount) {
  return {
    margin: [M_LEFT, 4, M_RIGHT, 0],
    stack: [
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: PRINT_W, y2: 0, lineWidth: 0.5, lineColor: GOLD }],
        margin: [0, 0, 0, 4],
      },
      {
        columns: [
          { text: 'HOJA DE CANTOS', bold: true, fontSize: 7, characterSpacing: 1, color: GOLD_DARK },
          { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, alignment: 'right', color: MUTED },
        ],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: PRINT_W, y2: 0, lineWidth: 0.5, lineColor: GOLD }],
        margin: [0, 4, 0, 0],
      },
    ],
  }
}


// ─── Exportación principal ────────────────────────────────────────────────────
/**
 * @param {object} hoja              Registro hojas_cantos
 * @param {Array}  enrichedSections  Detalles enriquecidos con datos de libro_cantos
 * @param {string} logoSrc           URL o ruta del logo
 */
export async function generateCantoralPdf(hoja, enrichedSections, logoSrc) {
  const logo = await getLogoDataUrl(logoSrc)

  // 1. Filtrar secciones con contenido
  const activeSections = enrichedSections.filter(s => s.rawValue || s.textoManual)

  // 2. Convertir cada sección en unidades planas
  const allUnits = []
  for (const section of activeSections) {
    allUnits.push(...sectionToUnits(section))
  }

  // 3. Distribuir unidades en columnas (flujo continuo)
  //
  //    Regla: si una unidad NO cabe en la columna actual → avanzar a la siguiente.
  //    Si ya no hay más columnas en esta página → nueva página.
  //    El 10 % de margen de seguridad en MAX_COL_H compensa diferencias entre
  //    la estimación y el renderizado real de pdfmake.
  //
  const pages    = []           // array de páginas; cada página = [col0[], col1[], col2[]]
  let page       = [[], [], []] // página actual
  let colIdx     = 0            // columna actual (0 | 1 | 2)
  let colH       = 0            // altura acumulada en la columna actual (estimada)

  function nextColumn() {
    colIdx++
    if (colIdx > 2) {
      pages.push(page)
      page   = [[], [], []]
      colIdx = 0
    }
    colH = 0
  }

  for (const unit of allUnits) {
    const h = estimateH(unit)

    // Avanzar si la unidad no cabe (solo si la columna no está completamente vacía)
    if (colH > 0 && colH + h > MAX_COL_H) {
      nextColumn()
    }
    // Nota: si una sola unidad supera MAX_COL_H, se coloca de todas formas
    // (un solo canto muy largo no debe causar un bucle infinito).

    page[colIdx].push(unit)
    colH += h
  }

  // Guardar última página
  if (page[0].length || page[1].length || page[2].length) {
    pages.push(page)
  }

  // 4. Construir contenido pdfmake
  //    Cada página es una tabla de 1 fila × 3 columnas con bordes verticales dorados.
  const content = pages.map((pg, i) => ({
    layout: {
      hLineWidth:   ()  => 0,
      vLineWidth:   (c) => (c === 1 || c === 2) ? 0.5 : 0,
      vLineColor:   ()  => GOLD,
      paddingLeft:  (c) => c === 0 ? 0 : COL_GAP,
      paddingRight: (c) => c === 2 ? 0 : COL_GAP,
      paddingTop:   ()  => 0,
      paddingBottom:()  => 0,
    },
    table: {
      widths: ['*', '*', '*'],
      body: [[
        { stack: pg[0].length ? pg[0] : [{ text: '' }] },
        { stack: pg[1].length ? pg[1] : [{ text: '' }] },
        { stack: pg[2].length ? pg[2] : [{ text: '' }] },
      ]],
    },
    pageBreak: i < pages.length - 1 ? 'after' : undefined,
  }))

  // 5. Renderizar y descargar
  const docDefinition = {
    pageSize:        'A4',
    pageOrientation: 'portrait',
    pageMargins:     [M_LEFT, M_TOP, M_RIGHT, M_BOTTOM],
    defaultStyle:    { fontSize: FONT_SZ, lineHeight: 1.3, color: BODY },
    header:          ()          => buildHeader(logo, hoja),
    footer:          (cp, total) => buildFooter(cp, total),
    content,
  }

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).download(buildFilename(hoja), resolve)
    } catch (err) {
      reject(err)
    }
  })
}
