import type { Collection, Field } from 'payload'

import type { CollectionField } from '../types/import.js'

/**
 * Extracts fields from a Payload collection config.
 */
export const extractCollectionFields = (
  collectionConfig: Collection['config'],
): CollectionField[] => {
  const fields: CollectionField[] = []

  const processField = (field: Field, prefix = ''): void => {
    // Skip layout/service fields
    if (field.type === 'tabs' || field.type === 'collapsible' || field.type === 'row') {
      // Process child fields for composite structures
      if ('fields' in field && Array.isArray(field.fields)) {
        field.fields.forEach((subField) => processField(subField, prefix))
      }
      return
    }

    // Skip fields without a name
    if (!('name' in field) || !field.name) {
      return
    }

    const fieldName = prefix ? `${prefix}.${field.name}` : field.name

    // Resolve label value
    let label = field.name
    if ('label' in field && field.label) {
      if (typeof field.label === 'string') {
        label = field.label
      } else if (typeof field.label === 'object' && field.label.en) {
        label = field.label.en
      }
    }
    // Ensure label is not empty
    if (!label || label.trim() === '') {
      label = field.name
    }

    // Describe the field type
    let typeDescription: string = field.type
    let relationTo: string | undefined
    let hasMany: boolean | undefined

    if (field.type === 'relationship' && 'relationTo' in field) {
      relationTo = Array.isArray(field.relationTo) ? field.relationTo.join(' | ') : field.relationTo
      typeDescription = `relationship (${relationTo})`
      hasMany = 'hasMany' in field ? Boolean(field.hasMany) : false
    } else if (field.type === 'select' && 'options' in field) {
      typeDescription = `select`
    } else if (field.type === 'upload' && 'relationTo' in field) {
      relationTo = field.relationTo
      typeDescription = `upload (${relationTo})`
      hasMany = 'hasMany' in field ? Boolean(field.hasMany) : false
    }

    // Determine required flag:
    // 1. Explicitly marked as required
    // 2. And does NOT have a default value (Payload won't demand it if default exists)
    const hasRequired = 'required' in field ? Boolean(field.required) : false
    const hasDefaultValue = 'defaultValue' in field && field.defaultValue !== undefined
    const required = hasRequired && !hasDefaultValue

    // Generate an example value
    const example = generateFieldExample(field)

    const fieldData: CollectionField = {
      name: fieldName,
      type: typeDescription,
      example,
      hasDefaultValue,
      label,
      required,
    }

    // Attach extra info for upload/relationship fields
    if (relationTo) {
      fieldData.relationTo = relationTo
    }
    if (hasMany !== undefined) {
      fieldData.hasMany = hasMany
    }

    fields.push(fieldData)

    // Process nested fields for group/blocks
    if (field.type === 'group' && 'fields' in field) {
      field.fields.forEach((subField) => processField(subField, fieldName))
    }
  }

  // Prepend the implicit Payload `id` field
  fields.unshift({
    name: 'id',
    type: 'text',
    example: 'Auto-generated record ID',
    hasDefaultValue: true, // ID is created automatically
    label: 'ID',
    required: false, // Not required on create, may be used for updates
  })

  // Traverse all collection fields
  collectionConfig.fields.forEach((field) => processField(field))

  return fields
}

/**
 * Generates a sample value for the provided field.
 */
const generateFieldExample = (field: Field): string => {
  // Prefer explicit default values when available
  if ('defaultValue' in field && field.defaultValue !== undefined) {
    if (
      typeof field.defaultValue === 'string' ||
      typeof field.defaultValue === 'number' ||
      typeof field.defaultValue === 'boolean'
    ) {
      return String(field.defaultValue)
    }
    return '[auto]' // Use placeholder for complex default values
  }

  switch (field.type) {
    case 'checkbox':
      return 'true'
    case 'code':
      return '{ "key": "value" }'
    case 'date':
      return '2024-01-01'

    case 'email':
      return 'user@example.com'

    case 'json':
      return '{ "data": {} }'
    case 'number':
      if ('name' in field) {
        if (field.name === 'price' || field.name === 'cost') {
          return '1000'
        }
        if (field.name === 'quantity' || field.name === 'stock') {
          return '50'
        }
      }
      return '123'
    case 'radio':
      if ('options' in field && Array.isArray(field.options) && field.options.length > 0) {
        const firstOption = field.options[0]
        return typeof firstOption === 'string' ? firstOption : firstOption.value
      }
      return 'option1'
    case 'relationship':
      if ('relationTo' in field) {
        const relationTo = Array.isArray(field.relationTo)
          ? field.relationTo.join(' | ')
          : field.relationTo
        return `Record ID from ${relationTo}`
      }
      return 'relationship-id'
    case 'richText':
      return 'Formatted text'

    case 'select':
      if ('options' in field && Array.isArray(field.options) && field.options.length > 0) {
        const firstOption = field.options[0]
        return typeof firstOption === 'string' ? firstOption : firstOption.value
      }
      return 'option1'
    case 'text':
      if ('name' in field) {
        if (field.name === 'title' || field.name === 'name') {
          return 'Product title'
        }
        if (field.name === 'slug') {
          return 'product-title'
        }
        if (field.name === 'sku') {
          return 'SKU-001'
        }
        if (field.name === 'email') {
          return 'user@example.com'
        }
      }
      return 'Text value'

    case 'textarea':
      return 'Long form description...'

    case 'upload':
      if ('relationTo' in field) {
        if ('hasMany' in field && field.hasMany) {
          return 'https://example.com/image1.jpg,https://example.com/image2.jpg'
        }
        return 'https://example.com/image.jpg'
      }
      return 'image.jpg'

    default:
      return 'Value'
  }
}
