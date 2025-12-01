import * as XLSX from 'xlsx'

export type TableData = {
  headers: string[]
  rows: (number | string)[][]
}

export const parseCSV = (text: string): TableData => {
  const lines = text.split('\n').filter((line) => line.trim())
  if (lines.length === 0) {
    throw new Error('File is empty')
  }

  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/"/g, ''))
    .filter((h) => h && h.trim() !== '') // Drop blank headers

  if (headers.length === 0) {
    throw new Error('Column headers not found')
  }

  const rows = lines
    .slice(1)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/"/g, '')))

  return { headers, rows }
}

export const parseJSON = (text: string): TableData => {
  const data = JSON.parse(text)
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('JSON must contain an array of objects')
  }

  // Ensure the first entry is an object
  if (typeof data[0] !== 'object' || data[0] === null) {
    throw new Error('JSON must contain an array of objects')
  }

  const headers = Object.keys(data[0]).filter((key) => key && key.trim() !== '') // Drop blank keys

  if (headers.length === 0) {
    throw new Error('Field headers not found')
  }

  const rows = data.map((item) => {
    if (typeof item !== 'object' || item === null) {
      // Non-object rows become empty strings for each header
      return headers.map(() => '')
    }
    return headers.map((header) => {
      const value = item[header]
      // Convert all values to strings, handling null/undefined
      if (value === null || value === undefined) {
        return ''
      }
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return String(value)
    })
  })

  return { headers, rows }
}

export const parseXLSX = async (file: File): Promise<TableData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Use the first worksheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to JSON matrix
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        })

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
          throw new Error('XLSX file is empty')
        }

        const headers = (jsonData[0] as any[]).map((h) => String(h || ''))
        const rows = jsonData
          .slice(1)
          .map((row: any) => headers.map((_, index) => String(row[index] || '')))

        resolve({ headers, rows })
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Error processing XLSX file'))
      }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsArrayBuffer(file)
  })
}

export const readFile = async (file: File): Promise<TableData> => {
  let parsedData: TableData

  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text()
    parsedData = parseCSV(text)
  } else if (file.name.toLowerCase().endsWith('.json')) {
    const text = await file.text()
    try {
      parsedData = parseJSON(text)
    } catch (jsonError) {
      throw new Error(
        `Error parsing JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
      )
    }
  } else if (
    file.name.toLowerCase().endsWith('.xlsx') ||
    file.name.toLowerCase().endsWith('.xls')
  ) {
    parsedData = await parseXLSX(file)
  } else {
    throw new Error('Supported file types: CSV, JSON, XLSX, XLS')
  }

  // Validate parsed data before returning
  if (!parsedData || !parsedData.headers || !Array.isArray(parsedData.rows)) {
    throw new Error('Invalid data structure in file')
  }

  return parsedData
}
