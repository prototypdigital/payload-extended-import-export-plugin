export interface CollectionField {
  example?: string
  hasDefaultValue?: boolean // Indicates Presence of default value
  hasMany?: boolean // Upload fields: supports multiple values
  label: string
  name: string
  relationTo?: string // Upload/relationship: target collection
  required?: boolean
  type: string
}

export interface FieldMapping {
  collectionField: string
  csvField: string
}

export interface ImportSettings {
  compareField?: string // Field used to match for updates
  fieldMappings: FieldMapping[]
  locale?: string // Selected locale for import
  mode: 'create' | 'update' | 'upsert'
}

export type ImportMode = 'create' | 'update' | 'upsert'

export interface ImportConfig {
  collectionFields: CollectionField[]
  settings: ImportSettings
}
