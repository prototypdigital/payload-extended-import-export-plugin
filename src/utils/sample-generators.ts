import type { CollectionField } from '../types/import.js'

/**
 * Creates a sample CSV file based on collection fields.
 */
export const generateSampleCSV = (fields: CollectionField[]): string => {
  // CSV header row
  const headers = fields.map((field) => field.name)

  // Mock data rows
  const sampleRows = [
    fields.map((field) => field.example || ''),
    fields.map((field) => generateSampleValue(field)),
    fields.map((field) => generateSampleValue(field)),
  ]

  // Join everything into CSV string
  const csvLines = [
    headers.join(','),
    ...sampleRows.map((row) => row.map((value) => `"${value}"`).join(',')),
  ]

  return csvLines.join('\n')
}

/**
 * Creates a sample JSON file based on collection fields.
 */
export const generateSampleJSON = (fields: CollectionField[]): string => {
  const sampleObjects = [
    createSampleObject(fields, 1),
    createSampleObject(fields, 2),
    createSampleObject(fields, 3),
  ]

  return JSON.stringify(sampleObjects, null, 2)
}

/**
 * Builds a single sample object.
 */
const createSampleObject = (fields: CollectionField[], index: number) => {
  const obj: Record<string, any> = {}

  fields.forEach((field) => {
    obj[field.name] = generateSampleValue(field, index)
  })

  return obj
}

/**
 * Generates a sample value for a field.
 */
const generateSampleValue = (field: CollectionField, index = 1): string => {
  const date = new Date()
  const selectOptions = ['published', 'draft', 'archived']
  switch (field.type) {
    case 'checkbox':
      return index % 2 === 0 ? 'true' : 'false'

    case 'date':
      date.setDate(date.getDate() + index)
      return date.toISOString().split('T')[0]
    case 'number':
      if (field.name.includes('price') || field.name.includes('cost')) {
        return String(1000 * index)
      }
      if (field.name.includes('quantity') || field.name.includes('stock')) {
        return String(10 + index * 5)
      }
      return String(index)

    case 'select':
      return selectOptions[index % selectOptions.length]

    case 'text':
      if (field.name.includes('title') || field.name.includes('name')) {
        return `Product ${index}`
      }
      if (field.name.includes('slug')) {
        return `product-${index}`
      }
      if (field.name.includes('sku')) {
        return `SKU-${String(index).padStart(3, '0')}`
      }
      return field.example || `Value ${index}`

    case 'upload':
      if (field.hasMany) {
        return `https://picsum.photos/800/600?random=${index},https://picsum.photos/600/400?random=${index + 100}`
      }
      return `https://picsum.photos/800/600?random=${index}`

    default:
      return field.example || `Value ${index}`
  }
}

/**
 * Derives recommendations for mapping CSV headers to collection fields.
 */
export const getFieldMappingRecommendations = (
  csvHeaders: string[],
  collectionFields: CollectionField[],
): Array<{
  confidence: number
  csvField: string
  recommendedField: string
}> => {
  const recommendations: Array<{
    confidence: number
    csvField: string
    recommendedField: string
  }> = []

  // Keep only meaningful header values
  const validHeaders = csvHeaders.filter(
    (header) => header && typeof header === 'string' && header.trim() !== '',
  )

  validHeaders.forEach((csvHeader) => {
    let bestMatch: { confidence: number; field: string } = {
      confidence: 0,
      field: '',
    }

    collectionFields.forEach((collectionField) => {
      const confidence = calculateFieldSimilarity(csvHeader, collectionField)
      if (confidence > bestMatch.confidence) {
        bestMatch = { confidence, field: collectionField.name }
      }
    })

    if (bestMatch.confidence > 0.3) {
      // Confidence threshold
      recommendations.push({
        confidence: bestMatch.confidence,
        csvField: csvHeader,
        recommendedField: bestMatch.field,
      })
    }
  })

  return recommendations.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Calculates similarity between a CSV header and a collection field.
 */
const calculateFieldSimilarity = (csvField: string, collectionField: CollectionField): number => {
  // Validate input
  if (!csvField || !collectionField.name) {
    return 0
  }

  const csvLower = csvField.toLowerCase()
  const fieldLower = collectionField.name.toLowerCase()
  const labelLower = (collectionField.label || collectionField.name).toLowerCase()

  // Exact match
  if (csvLower === fieldLower || csvLower === labelLower) {
    return 1.0
  }

  // Partial match in field name
  if (fieldLower.includes(csvLower) || csvLower.includes(fieldLower)) {
    return 0.8
  }

  // Partial match in label
  if (labelLower.includes(csvLower) || csvLower.includes(labelLower)) {
    return 0.7
  }

  // Synonyms for common field names
  const synonyms: Record<string, string[]> = {
    category: ['cat', 'category'],
    description: ['desc', 'description', 'content'],
    price: ['cost', 'price', 'amount'],
    quantity: ['qty', 'quantity', 'stock'],
    status: ['state', 'status'],
    title: ['name', 'title'],
  }

  for (const [key, values] of Object.entries(synonyms)) {
    if (fieldLower.includes(key) && values.some((v) => csvLower.includes(v))) {
      return 0.6
    }
    if (csvLower.includes(key) && values.some((v) => fieldLower.includes(v))) {
      return 0.6
    }
  }

  return 0
}
