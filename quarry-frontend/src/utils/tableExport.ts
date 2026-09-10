import * as XLSX from 'xlsx'

export type ExportColumn<T> = {
  header: string
  value: (row: T) => string | number | null | undefined
  /** Prefer raw numbers in Excel when set. */
  excelValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'right'
}

export type PrintMeta = {
  title: string
  subtitle?: string
  lines?: string[]
  filenameBase?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cellText(value: string | number | null | undefined) {
  if (value == null || value === '') return '—'
  return String(value)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportRowsToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filenameBase: string,
) {
  const sheetRows = rows.map((row) => {
    const record: Record<string, string | number> = {}
    for (const column of columns) {
      const raw = column.excelValue?.(row) ?? column.value(row)
      record[column.header] = raw == null || raw === '' ? '' : raw
    }
    return record
  })

  const worksheet = XLSX.utils.json_to_sheet(sheetRows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entries')
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase}.xlsx`,
  )
}

function buildPrintHtml<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  meta: PrintMeta,
) {
  const metaLines = [meta.subtitle, ...(meta.lines ?? [])].filter(Boolean) as string[]
  const headerHtml = metaLines
    .map((line) => `<p class="meta">${escapeHtml(line)}</p>`)
    .join('')

  const headHtml = columns
    .map(
      (column) =>
        `<th class="${column.align === 'right' ? 'num' : ''}">${escapeHtml(column.header)}</th>`,
    )
    .join('')

  const bodyHtml = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const text = escapeHtml(cellText(column.value(row)))
          return `<td class="${column.align === 'right' ? 'num' : ''}">${text}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(meta.title)}</title>
  <style>
    @page { margin: 16mm; }
    body {
      font-family: "Segoe UI", Helvetica, Arial, sans-serif;
      color: #1f1f1f;
      margin: 24px;
      font-size: 12px;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 6px;
      font-weight: 650;
    }
    .meta {
      margin: 0 0 4px;
      color: #595959;
    }
    .toolbar {
      margin: 16px 0 20px;
      display: flex;
      gap: 8px;
    }
    .toolbar button {
      border: 1px solid #d9d9d9;
      background: #fff;
      border-radius: 6px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 13px;
    }
    .toolbar button.primary {
      background: #1677ff;
      border-color: #1677ff;
      color: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      border: 1px solid #d9d9d9;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #fafafa;
      font-weight: 600;
    }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .empty { margin-top: 24px; color: #8c8c8c; }
    @media print {
      .toolbar { display: none !important; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(meta.title)}</h1>
  ${headerHtml}
  <div class="toolbar">
    <button class="primary" type="button" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>
  ${
    rows.length === 0
      ? '<p class="empty">No entries for the current filters.</p>'
      : `<table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>`
  }
</body>
</html>`
}

/** Opens a clean printable window. Use autoPrint for Print; leave false for Export PDF (user picks Save as PDF). */
export function openPrintableTable<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  meta: PrintMeta,
  options?: { autoPrint?: boolean },
) {
  const html = buildPrintHtml(rows, columns, meta)
  // Do not pass noopener/noreferrer in features — Chromium then returns null and
  // we cannot write into the print document (looks like a silent/blocked pop-up).
  const popup = window.open('', '_blank', 'width=1100,height=800')
  if (!popup) {
    throw new Error(
      'Pop-up blocked. Allow pop-ups for this site, then try Print or Export PDF again.',
    )
  }
  try {
    popup.opener = null
  } catch {
    /* ignore */
  }

  popup.document.open()
  popup.document.write(html)
  popup.document.close()

  if (!options?.autoPrint) {
    popup.focus()
    return
  }

  let printed = false
  const triggerPrint = () => {
    if (printed || popup.closed) return
    printed = true
    try {
      popup.focus()
      popup.print()
    } catch {
      /* ignore */
    }
  }

  const schedulePrint = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(triggerPrint)
    })
  }

  if (popup.document.readyState === 'complete') {
    schedulePrint()
  } else {
    popup.addEventListener('load', schedulePrint, { once: true })
  }
  // Fallback when load already fired during document.write, or never fires.
  setTimeout(schedulePrint, 300)
}
