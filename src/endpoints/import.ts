import type { Endpoint, PayloadRequest, RelationshipField } from 'payload'

import { handleUploadField } from '../utils/upload-handler.js'

// Converts plain text into minimal Lexical richText structure
function convertStringToLexicalFormat(text: string) {
  if (!text || typeof text !== 'string') {
    return null
  }

  // Split by newlines and trim empty paragraphs
  const paragraphs = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  // Return an empty richText structure when no paragraphs remain
  if (paragraphs.length === 0) {
    return {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }
  }

  // Build Lexical paragraphs for every line
  const children = paragraphs.map((paragraph) => ({
    type: 'paragraph',
    children: [
      {
        type: 'text',
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text: paragraph,
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  }))

  return {
    root: {
      type: 'root',
      children,
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

export interface ImportRequest {
  collection: string
  data: Record<string, any>[]
  settings: {
    compareField?: string
    fieldMappings: { collectionField: string; csvField: string }[]
    locale?: string
    mode: 'create' | 'update' | 'upsert'
  }
}

export interface ImportResponse {
  created: number
  details?: any[]
  errors: string[]
  message: string
  success: boolean
  updated: number
}

export const importEndpoint: Endpoint = {
  handler: async (req: PayloadRequest) => {
    try {
      // Read body as a ReadableStream to support large payloads
      let requestData: ImportRequest

      if (req.body) {
        const reader = req.body.getReader()
        const decoder = new TextDecoder()
        let bodyText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          bodyText += decoder.decode(value, { stream: true })
        }

        requestData = JSON.parse(bodyText) as ImportRequest
      } else {
        throw new Error('Unable to read request payload')
      }

      const { collection, data, settings } = requestData
      const { compareField, fieldMappings, locale, mode } = settings

      // Basic input validation
      if (!collection || !data || !Array.isArray(data)) {
        return Response.json(
          {
            created: 0,
            errors: ['Missing required fields: collection, data'],
            message: 'Invalid import payload',
            success: false,
            updated: 0,
          },
          { status: 400 },
        )
      }

      let created = 0
      let updated = 0
      const errors: string[] = []
      const details: any[] = []

      // Map incoming rows according to configured field mappings
      const mappedDataPromises = data.map(async (row, index) => {
        try {
          const mapped: Record<string, any> = {}

          // Get collection config to understand field types
          const collectionConfig = req.payload.config.collections?.find(
            (col) => col.slug === collection,
          )

          // Build a field-type map for quick lookups
          const fieldTypeMap = new Map<string, string>()
          if (collectionConfig) {
            const mapFieldTypes = (fields: any[], prefix = '') => {
              fields.forEach((field) => {
                if (!field.name) {
                  return
                }
                const fieldName = prefix ? `${prefix}.${field.name}` : field.name
                fieldTypeMap.set(fieldName, field.type)

                // Traverse nested fields
                if (field.fields && Array.isArray(field.fields)) {
                  mapFieldTypes(field.fields, fieldName)
                }
              })
            }
            mapFieldTypes(collectionConfig.fields)

            // Debug logging in development mode
            if (process.env.NODE_ENV === 'development') {
              console.log('Available schema fields:', Array.from(fieldTypeMap.keys()))
              console.log(
                'Field mappings:',
                fieldMappings.map((m) => `${m.csvField} -> ${m.collectionField}`),
              )
            }
          }

          for (const { collectionField, csvField } of fieldMappings) {
            if (row[csvField] !== undefined && row[csvField] !== '') {
              // Directly assign IDs without further processing
              if (collectionField === 'id') {
                mapped[collectionField] = row[csvField]
                return
              }

              // Determine field type
              const fieldType = fieldTypeMap.get(collectionField)

              // Skip fields missing from the schema (except id)
              if (!fieldType && collectionField !== 'id') {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`Field "${collectionField}" was not found in "${collection}" schema`)
                }
                return
              }

              // Field-type specific handling
              let value = row[csvField]

              // Convert richText strings into Lexical payloads
              if (fieldType === 'richText') {
                value = convertStringToLexicalFormat(value)
              }

              if (fieldType === 'relationship') {
                const isMultiple = collectionConfig?.fields?.find((_field) => {
                  const field = _field as unknown as RelationshipField
                  return field?.name === collectionField && field.relationTo && field.hasMany
                })

                if (isMultiple) {
                  // Multiple relationships expect an array of values
                  const items =
                    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value
                  value = items.map((item: any) => {
                    return {
                      id: item, // Assumes value is the ID of the related record
                    }
                  })
                } else {
                  // Single relationships expect an object with ID
                  value = {
                    id: value, // Assumes value is the ID of the related record
                  }
                }
              }

              // Upload fields
              if (fieldType === 'upload') {
                const uploadField = collectionConfig?.fields?.find((_field) => {
                  const field = _field as any
                  return field?.name === collectionField && field.type === 'upload'
                }) as any

                if (uploadField && uploadField.relationTo) {
                  const hasMany = uploadField.hasMany || false

                  // Upload media referenced by URLs
                  value = await handleUploadField(
                    req.payload,
                    value,
                    uploadField.relationTo,
                    hasMany,
                  )
                }
              }

              // Number coercion helpers
              if (fieldType === 'number') {
                if (typeof value === 'string') {
                  // Handle common textual representations
                  const normalized = value.toLowerCase()
                  const positiveTokens = ['available', 'in stock', 'yes', 'true']
                  const negativeTokens = ['not available', 'no', 'absent', 'out of stock', 'false']

                  if (positiveTokens.some((token) => normalized.includes(token))) {
                    value = 1
                  } else if (negativeTokens.some((token) => normalized.includes(token))) {
                    value = 0
                  } else {
                    // Extract numeric value from strings
                    const numValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'))
                    value = isNaN(numValue) ? 0 : numValue
                  }
                } else if (typeof value !== 'number') {
                  value = 0
                }
              }

              // Array field handling
              if (fieldType === 'array') {
                // Ensure we have valid JSON/array data
                if (typeof value === 'string') {
                  try {
                    value = JSON.parse(value)
                  } catch {
                    // If parsing fails, leave as string
                  }
                }

                // Coerce into an array
                if (!Array.isArray(value)) {
                  value = []
                }

                // Process nested items
                if (Array.isArray(value)) {
                  value = value.map((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                      const processedItem = { ...item }

                      // Ensure every item has an id
                      if (!processedItem.id) {
                        processedItem.id = `item_${index}_${Date.now()}`
                      }

                      // Treat nested keys as potential relationship sub-fields
                      Object.keys(processedItem).forEach((key) => {
                        const subFieldType = fieldTypeMap.get(`${collectionField}.${key}`)

                        if (subFieldType === 'relationship') {
                          const subValue = processedItem[key]

                          if (Array.isArray(subValue)) {
                            // Handle multiple relationships
                            processedItem[key] = subValue.map((val) =>
                              typeof val === 'string' ? { id: val } : val,
                            )
                          } else if (typeof subValue === 'string') {
                            // Handle single relationships
                            processedItem[key] = { id: subValue }
                          }
                        }
                      })

                      return processedItem
                    }
                    return item
                  })
                }
              }

              mapped[collectionField] = value
            }
          }

          // Auto-fill required fields with defaults when creating new records
          if (collectionConfig && mode === 'create') {
            // Walk through every field in the collection
            const processFields = (fields: any[], prefix = '') => {
              fields.forEach((field) => {
                if (!field.name) {
                  return
                }

                const fieldName = prefix ? `${prefix}.${field.name}` : field.name

                // Determine whether we need to populate the field
                const isRequired = field.required === true
                const hasDefaultValue = field.defaultValue !== undefined
                const isNotMapped = mapped[fieldName] === undefined

                if (isRequired && hasDefaultValue && isNotMapped) {
                  // Support functional defaultValue definitions
                  if (typeof field.defaultValue === 'function') {
                    try {
                      mapped[fieldName] = field.defaultValue({
                        user: req.user,
                      })
                    } catch (error) {
                      console.warn(`Failed to compute defaultValue for ${fieldName}:`, error)
                    }
                  } else {
                    // Otherwise use the literal defaultValue
                    mapped[fieldName] = field.defaultValue
                  }
                }

                // Process nested fields (group, tabs, etc.)
                if (field.fields && Array.isArray(field.fields)) {
                  processFields(field.fields, fieldName)
                }
              })
            }

            processFields(collectionConfig.fields)
          }

          return { index, mapped, original: row }
        } catch (error) {
          errors.push(`Row ${index + 1} mapping error: ${error}`)
          return null
        }
      })

      // Wait for all mapping promises
      const mappedDataResults = await Promise.all(mappedDataPromises)
      const mappedData = mappedDataResults.filter(Boolean)

      // Process mapped data according to the selected mode
      for (const item of mappedData) {
        if (!item) {
          continue
        }

        try {
          if (mode === 'create') {
            // Create-only: strip id because Payload generates it automatically
            const createData = { ...item.mapped }
            delete createData.id

            const result = await req.payload.create({
              collection: collection as any,
              data: createData,
              locale: (locale || req.locale || 'en-GB') as 'bg' | 'en-GB' | 'ru' | 'uk',
            })
            created++
            details.push({
              id: result.id,
              action: 'created',
              data: createData,
            })
          } else if (mode === 'update') {
            // Update-only path
            if (!compareField || !item.mapped[compareField]) {
              errors.push(`Row ${item.index + 1}: missing compare field "${compareField}"`)
              continue
            }

            const existing = await req.payload.find({
              collection: collection as any,
              limit: 1,
              locale: (locale || req.locale || 'en-GB') as 'bg' | 'en-GB' | 'ru' | 'uk',
              where:
                compareField === 'id'
                  ? {
                      id: {
                        equals: item.mapped[compareField],
                      },
                    }
                  : {
                      [compareField]: {
                        equals: item.mapped[compareField],
                      },
                    },
            })

            if (existing.docs.length > 0) {
              // Merge with existing record to avoid required-field validation issues
              const existingData = existing.docs[0]
              const mergedData = { ...existingData, ...item.mapped }

              const _result = await req.payload.update({
                id: existing.docs[0].id,
                collection: collection as any,
                data: mergedData,
                locale: (locale || req.locale || 'en-GB') as 'bg' | 'en-GB' | 'ru' | 'uk',
              })
              updated++
              details.push({
                id: existing.docs[0].id,
                action: 'updated',
                data: item.mapped,
              })
            } else {
              errors.push(
                `Row ${item.index + 1}: record with ${compareField}="${item.mapped[compareField]}" not found`,
              )
            }
          } else if (mode === 'upsert') {
            // Upsert: create or update depending on compareField match
            if (compareField && item.mapped[compareField]) {
              const existing = await req.payload.find({
                collection: collection as any,
                limit: 1,
                locale: (locale || req.locale || 'en-GB') as 'bg' | 'en-GB' | 'ru' | 'uk',
                where:
                  compareField === 'id'
                    ? {
                        id: {
                          equals: item.mapped[compareField],
                        },
                      }
                    : {
                        [compareField]: {
                          equals: item.mapped[compareField],
                        },
                      },
              })

              if (existing.docs.length > 0) {
                // Merge existing data with new payload before update
                const existingData = existing.docs[0]
                const mergedData = { ...existingData, ...item.mapped }

                const _result = await req.payload.update({
                  id: existing.docs[0].id,
                  collection: collection as any,
                  data: mergedData,
                  locale: (locale || req.locale || 'en-GB') as 'bg' | 'en-GB' | 'ru' | 'uk',
                })
                updated++
                details.push({
                  id: existing.docs[0].id,
                  action: 'updated',
                  data: item.mapped,
                })
              } else {
                const result = await req.payload.create({
                  collection: collection as any,
                  data: item.mapped,
                  locale: (locale || req.locale || 'en-GB') as 'bg' | 'en-GB' | 'ru' | 'uk',
                })
                created++
                details.push({
                  id: result.id,
                  action: 'created',
                  data: item.mapped,
                })
              }
            } else {
              // No compare field: fall back to creating a new record
              const result = await req.payload.create({
                collection: collection as any,
                data: item.mapped,
                locale: (locale || req.locale || 'en-GB') as 'bg' | 'en-GB' | 'ru' | 'uk',
              })
              created++
              details.push({
                id: result.id,
                action: 'created',
                data: item.mapped,
              })
            }
          }
        } catch (error: any) {
          // Provide detailed error info
          let errorMessage = `Row ${item.index + 1}: `

          if (error.message) {
            errorMessage += error.message
          } else {
            errorMessage += String(error)
          }

          // Extra debug logging in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Error while creating/updating record:', {
              error: error.message || error,
              data: item.mapped,
              collection,
            })
          }

          errors.push(errorMessage)
        }
      }

      const response: ImportResponse = {
        created,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
        errors,
        message: `Import completed: created ${created}, updated ${updated} records`,
        success: true,
        updated,
      }

      return Response.json(response)
    } catch (error: any) {
      console.error('Import error:', error)
      const response: ImportResponse = {
        created: 0,
        errors: [error.message || 'Unknown error'],
        message: 'Internal server error',
        success: false,
        updated: 0,
      }
      return Response.json(response, { status: 500 })
    }
  },
  path: '/import',

  method: 'post',
}
