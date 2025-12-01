import React, { useState } from 'react'

import type {
  CollectionField,
  FieldMapping,
  ImportMode,
  ImportSettings,
} from '../../types/import.js'
import type { TableData } from '../../utils/file-parsers.js'

import FieldMappingComponent from '../FieldMapping/FieldMapping.js'
import ImportModeSelector from '../ImportModeSelector/ImportModeSelector.js'
import LocaleSelector from '../LocaleSelector/LocaleSelector.js'

interface ImportConfigurationProps {
  collectionFields: CollectionField[]
  onBack: () => void
  onImport: (settings: ImportSettings, data: Record<string, any>[]) => void
  tableData: TableData
}

const ImportConfiguration: React.FC<ImportConfigurationProps> = ({
  collectionFields,
  onBack,
  onImport,
  tableData,
}) => {
  const [importMode, setImportMode] = useState<ImportMode>('create')
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [compareField, setCompareField] = useState<string>('')
  const [selectedLocale, setSelectedLocale] = useState<string>('en')

  const canProceed = () => {
    // Update mode ignores required fields
    if (importMode === 'update') {
      // Requires compare field + at least one mapping
      const isUsingIdForComparison = compareField === 'id'
      const hasIdMapping = fieldMappings.some((m) => m.collectionField === 'id')

      return fieldMappings.length > 0 && compareField && (!isUsingIdForComparison || hasIdMapping)
    }

    // Create/upsert require required fields to be mapped
    const requiredFields = collectionFields.filter((f) => f.required)
    const mappedFieldNames = fieldMappings.map((m) => m.collectionField)
    const unmappedRequired = requiredFields.filter((f) => !mappedFieldNames.includes(f.name))

    // Upsert mode always needs a compare field
    const needsCompareField = importMode === 'upsert'

    // If comparing by ID ensure ID is present in mappings
    const isUsingIdForComparison = compareField === 'id'
    const hasIdMapping = mappedFieldNames.includes('id')

    return (
      unmappedRequired.length === 0 &&
      fieldMappings.length > 0 &&
      (!needsCompareField || compareField) &&
      (!isUsingIdForComparison || hasIdMapping)
    )
  }

  const handleImport = () => {
    if (!canProceed()) {
      return
    }

    const settings: ImportSettings = {
      compareField: compareField || undefined,
      fieldMappings,
      locale: selectedLocale,
      mode: importMode,
    }

    // Submit both settings and rows
    onImport(settings, tableData.rows)
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          alignItems: 'center',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            Import configuration
          </h2>
          <p
            style={{
              color: '#666',
              fontSize: '14px',
              margin: '4px 0 0 0',
            }}
          >
            Preparing to import {tableData.rows.length} rows
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            backgroundColor: '#6c757d',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            padding: '8px 16px',
          }}
          type="button"
        >
          ← Back to file
        </button>
      </div>

      {/* Import mode */}
      <ImportModeSelector
        collectionFields={collectionFields}
        compareField={compareField}
        onCompareFieldChange={setCompareField}
        onModeChange={setImportMode}
        selectedMode={importMode}
      />

      {/* Locale selection */}
      <LocaleSelector onChange={setSelectedLocale} value={selectedLocale} />

      {/* Field mapping */}
      <FieldMappingComponent
        collectionFields={collectionFields}
        csvHeaders={tableData.headers}
        fieldMappings={fieldMappings}
        importMode={importMode}
        onMappingChange={setFieldMappings}
      />

      {/* Summary + action */}
      <div
        style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginTop: '24px',
          padding: '20px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '16px', margin: '0 0 12px 0' }}>Summary:</h4>
          <div style={{ color: '#555', fontSize: '14px' }}>
            <div>
              • Rows to import: <strong>{tableData.rows.length}</strong>
            </div>
            <div>
              • Mapped fields: <strong>{fieldMappings.length}</strong>
            </div>
            <div>
              • Import mode:{' '}
              <strong>
                {importMode === 'create' && 'Create new records'}
                {importMode === 'update' && 'Update existing records'}
                {importMode === 'upsert' && 'Create or update records'}
              </strong>
            </div>
            {compareField && (
              <div>
                • Compare field: <strong>{compareField}</strong>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            disabled={!canProceed()}
            onClick={handleImport}
            style={{
              backgroundColor: canProceed() ? '#28a745' : '#6c757d',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '12px 24px',
            }}
            type="button"
          >
            <span aria-label="rocket" role="img">
              🚀
            </span>{' '}
            Start import
          </button>

          {!canProceed() && (
            <div style={{ color: '#dc3545', fontSize: '14px' }}>
              {(() => {
                const requiredFields = collectionFields.filter((f) => f.required)
                const mappedFieldNames = fieldMappings.map((m) => m.collectionField)
                const unmappedRequired = requiredFields.filter(
                  (f) => !mappedFieldNames.includes(f.name),
                )
                const needsCompareField = importMode === 'update' || importMode === 'upsert'
                const isUsingIdForComparison = compareField === 'id'
                const hasIdMapping = mappedFieldNames.includes('id')

                if (fieldMappings.length === 0) {
                  return 'Map at least one field'
                }

                // Skip required check for update mode
                if (importMode !== 'update' && unmappedRequired.length > 0) {
                  return `Map required fields: ${unmappedRequired.map((f) => f.label).join(', ')}`
                }

                if (needsCompareField && !compareField) {
                  return 'Select a field to match records'
                }
                if (isUsingIdForComparison && !hasIdMapping) {
                  return 'When comparing by ID the ID field must be mapped to a file column'
                }
                return ''
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportConfiguration
