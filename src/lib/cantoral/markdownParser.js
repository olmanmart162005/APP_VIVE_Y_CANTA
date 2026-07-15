/**
 * markdownParser.js
 * Converts letra_markdown strings into pdfmake-compatible content nodes.
 *
 * Markdown conventions for letra_markdown:
 *   # Song Title          → song title (handled externally in pdfGenerator)
 *   **line one**          → chorus line (bold)
 *   **line two**          → chorus line (bold)
 *   (blank line)          → strophe boundary
 *   Normal line           → verse line (regular weight)
 *   ---                   → visual separator between sections
 *
 * CHORUS RULE:
 *   A strophe is a CHORUS when EVERY non-empty line is wrapped in **…**.
 *   The ENTIRE block renders in bold — never auto-detect, only use markup.
 *
 * VERSE RULE:
 *   Any block with at least one line NOT wrapped in **…** is a verse.
 *   Verse lines may still contain inline bold words, but the block itself
 *   is not a chorus block.
 */

const INK = '#1a1a1a'
const BODY = '#2d2d2d'

// ---------------------------------------------------------------------------
// Parse a single text line — handles **bold** markers inline
// ---------------------------------------------------------------------------
function parseLine(line) {
  // Full-line bold: **entire line**
  const fullBold = line.match(/^\*\*(.+)\*\*$/)
  if (fullBold) return { text: fullBold[1].trim(), bold: true }

  // Mixed inline: some words bold, some not
  const parts = []
  const regex = /\*\*([^*]+)\*\*/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push({ text: line.slice(lastIndex, match.index) })
    parts.push({ text: match[1], bold: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < line.length) parts.push({ text: line.slice(lastIndex) })
  if (parts.length === 0) return { text: line }
  if (parts.length === 1) return parts[0]
  return { text: parts }
}

// A strophe is a CHORUS when every non-empty line is wrapped in **…**
function isChorusBlock(lines) {
  const nonEmpty = lines.filter((l) => l.trim() !== '')
  if (nonEmpty.length === 0) return false
  return nonEmpty.every((l) => /^\*\*/.test(l.trim()) && /\*\*$/.test(l.trim()))
}

function stripBoldMarkers(line) {
  const trimmed = line.trim()
  if (/^\*\*(.*)\*\*$/.test(trimmed)) {
    return trimmed.replace(/^\*\*|\*\*$/g, '').trim()
  }
  if (trimmed.startsWith('**')) {
    return trimmed.slice(2).trim()
  }
  if (trimmed.endsWith('**')) {
    return trimmed.slice(0, -2).trim()
  }
  return line
}

// ---------------------------------------------------------------------------
// parseMarkdown — splits markdown into typed block objects
// ---------------------------------------------------------------------------
export function parseMarkdown(markdown) {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const blocks = []
  let stropheLines = []
  let chorusMode = false

  const flushStrophe = () => {
    if (stropheLines.length === 0) return
    const chorus = chorusMode || isChorusBlock(stropheLines)
    blocks.push({
      type: chorus ? 'chorus' : 'verse',
      lines: stropheLines.map(stripBoldMarkers),
    })
    stropheLines = []
    chorusMode = false
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '')
    const trimmed = line.trim()

    if (trimmed.startsWith('# ')) {
      flushStrophe()
      continue
    }

    if (trimmed === '---') {
      flushStrophe()
      blocks.push({ type: 'separator' })
      continue
    }

    if (trimmed === '') {
      flushStrophe()
      continue
    }

    const startsBold = trimmed.startsWith('**')
    const endsBold = trimmed.endsWith('**')

    if (chorusMode) {
      stropheLines.push(stripBoldMarkers(line))
      if (endsBold) {
        chorusMode = false
      }
      continue
    }

    if (startsBold && !endsBold) {
      chorusMode = true
      stropheLines.push(stripBoldMarkers(line))
      continue
    }

    if (startsBold && endsBold) {
      stropheLines.push(stripBoldMarkers(line))
      continue
    }

    stropheLines.push(line)
  }

  flushStrophe()
  return blocks
}

// ---------------------------------------------------------------------------
// blocksToPdfmake — converts typed blocks into pdfmake content nodes
//
// CHORUS: entire block in bold (9pt), with breathing space above and below
// VERSE:  regular weight (9pt), tighter spacing
// No font: specified — pdfmake uses its bundled Roboto default
// ---------------------------------------------------------------------------
export function blocksToPdfmake(blocks) {
  const nodes = []

  for (const block of blocks) {
    switch (block.type) {
      case 'chorus': {
        // Every line in the chorus block is bold — render as a compact stanza
        nodes.push({
          stack: block.lines.map((line) => {
            const parsed = parseLine(line)
            const node = {
              fontSize: 9,
              lineHeight: 1.18,
              color: INK,
              bold: true,
            }
            node.text = typeof parsed.text === 'string' ? parsed.text : parsed.text
            return node
          }),
          unbreakable: true,   // Never split a chorus across columns/pages
          margin: [0, 0, 0, 2],
        })
        break
      }

      case 'verse': {
        // Verse lines in regular weight; inline **…** still renders bold spans
        nodes.push({
          stack: block.lines.map((line) => {
            const parsed = parseLine(line)
            const node = {
              fontSize: 9,
              lineHeight: 1.18,
              color: BODY,
            }
            if (typeof parsed.text === 'string') {
              node.text = parsed.text
              node.bold = parsed.bold || false
            } else {
              node.text = parsed.text
            }
            return node
          }),
          unbreakable: true,   // Never split a verse strophe
          margin: [0, 0, 0, 2],
        })
        break
      }

      case 'separator':
        nodes.push({
          canvas: [{
            type: 'line',
            x1: 8, y1: 3, x2: 80, y2: 3,
            lineWidth: 0.5,
            lineColor: '#D4AF37',
            dash: { length: 2.5, space: 2 },
          }],
          margin: [0, 5, 0, 5],
        })
        break
    }
  }

  return nodes
}
