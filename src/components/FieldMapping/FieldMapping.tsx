import { ArrowRight, Info, Lightbulb } from 'lucide-react'
import React, { useEffect } from 'react'

import type { CollectionField, FieldMapping, ImportMode } from '../../types/import.js'

import { getFieldMappingRecommendations } from '../../utils/sample-generators.js'

interface FieldMappingComponentProps {
  collectionFields: CollectionField[]
  csvHeaders: string[]
  fieldMappings: FieldMapping[]
  importMode: ImportMode
  onMappingChange: (mappings: FieldMapping[]) => void
}

const FieldMappingComponent: React.FC<FieldMappingComponentProps> = ({
  collectionFields,
  csvHeaders,
  fieldMappings,
  importMode,
  onMappingChange,
}) => {
  // Apply recommendations automatically on first load
  useEffect(() => {
    if (fieldMappings.length === 0 && csvHeaders.length > 0) {
      const recommendations = getFieldMappingRecommendations(csvHeaders, collectionFields)
      const mappings: FieldMapping[] = recommendations.map((rec) => ({
        collectionField: rec.recommendedField,
        csvField: rec.csvField,
      }))
      onMappingChange(mappings)
    }
  }, [csvHeaders, collectionFields, fieldMappings.length, onMappingChange])

  const updateMapping = (csvField: string, collectionField: string) => {
    const newMappings = fieldMappings.filter((m) => m.csvField !== csvField)
    if (collectionField) {
      newMappings.push({ collectionField, csvField })
    }
    onMappingChange(newMappings)
  }

  const applyRecommendations = () => {
    const recommendations = getFieldMappingRecommendations(csvHeaders, collectionFields)
    const mappings: FieldMapping[] = recommendations.map((rec) => ({
      collectionField: rec.recommendedField,
      csvField: rec.csvField,
    }))
    onMappingChange(mappings)
  }

  const getMappingForCsvField = (csvField: string) => {
    return fieldMappings.find((m) => m.csvField === csvField)?.collectionField || ''
  }

  const getCollectionField = (fieldName: string) => {
    return collectionFields.find((f) => f.name === fieldName)
  }

  const autoMapFields = () => {
    const autoMappings: FieldMapping[] = []

    // Drop blank headers
    const validHeaders = csvHeaders.filter(
      (header) => header && typeof header === 'string' && header.trim() !== '',
    )

    validHeaders.forEach((csvHeader) => {
      // Attempt to find an exact match by name
      let match = collectionFields.find(
        (field) => field.name && field.name.toLowerCase() === csvHeader.toLowerCase(),
      )

      // Fallback to partial matches in either direction
      if (!match) {
        match = collectionFields.find(
          (field) =>
            field.name &&
            (field.name.toLowerCase().includes(csvHeader.toLowerCase()) ||
              csvHeader.toLowerCase().includes(field.name.toLowerCase())),
        )
      }

      if (match) {
        autoMappings.push({
          collectionField: match.name,
          csvField: csvHeader,
        })
      }
    })

    onMappingChange(autoMappings)
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Field mapping</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={applyRecommendations}
            style={{
              alignItems: 'center',
              backgroundColor: '#f59e0b',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              fontSize: '12px',
              gap: '4px',
              padding: '6px 12px',
            }}
            title="Apply smart recommendations"
            type="button"
          >
            <Lightbulb size={14} />
            Recommendations
          </button>
          <button
            onClick={autoMapFields}
            style={{
              backgroundColor: '#6c757d',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '6px 12px',
            }}
            type="button"
          >
            Auto-match
          </button>
        </div>
      </div>

      <div
        style={{
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'grid',
            fontSize: '14px',
            fontWeight: 'bold',
            gridTemplateColumns: '1fr auto 1fr auto',
            padding: '12px',
          }}
        >
          <div>File column</div>
          <div style={{ textAlign: 'center', width: '40px' }}></div>
          <div>Collection field</div>
          <div style={{ width: '24px' }}></div>
        </div>

        {/* Mapping rows */}
        {csvHeaders.map((csvHeader, index) => {
          const mappedField = getMappingForCsvField(csvHeader)
          const collectionField = mappedField ? getCollectionField(mappedField) : null

          return (
            <div
              key={csvHeader}
              style={{
                alignItems: 'center',
                borderBottom:
                  index < csvHeaders.length - 1 ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr auto',
                padding: '12px',
              }}
            >
              {/* CSV column */}
              <div>
                <div
                  style={{
                    fontWeight: '500',
                    marginBottom: '2px',
                  }}
                >
                  {csvHeader}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>Column from file</div>
              </div>

              {/* Arrow */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '40px',
                }}
              >
                <ArrowRight color="#666" size={16} />
              </div>

              {/* Collection field selection */}
              <div>
                <select
                  onChange={(e) => updateMapping(csvHeader, e.target.value)}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    marginBottom: '4px',
                    padding: '6px 8px',
                    width: '100%',
                  }}
                  value={mappedField}
                >
                  <option value="">Do not map</option>
                  {collectionFields.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label || field.name} ({field.type}){field.required ? ' *' : ''}
                      {field.hasDefaultValue ? ' [auto]' : ''}
                    </option>
                  ))}
                </select>

                {/* Field info */}
                {collectionField && (
                  <div
                    style={{
                      color: '#666',
                      fontSize: '12px',
                    }}
                  >
                    {collectionField.required && (
                      <span
                        style={{
                          color: '#dc3545',
                          marginRight: '4px',
                        }}
                      >
                        Required
                      </span>
                    )}
                    {collectionField.hasDefaultValue && (
                      <span
                        style={{
                          color: '#28a745',
                          marginRight: '4px',
                        }}
                      >
                        (auto value)
                      </span>
                    )}
                    Type: {collectionField.type}
                    {collectionField.example && (
                      <div style={{ marginTop: '2px' }}>Example: {collectionField.example}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '24px',
                }}
              >
                {collectionField?.required && !mappedField && (
                  <div title="This field is required">
                    <Info color="#dc3545" size={16} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Warnings */}
      <div style={{ marginTop: '12px' }}>
        {/* Unmapped required fields (create/upsert only) */}
        {(importMode === 'create' || importMode === 'upsert') &&
          (() => {
            const requiredFields = collectionFields.filter((f) => f.required)
            const mappedFieldNames = fieldMappings.map((m) => m.collectionField)
            const unmappedRequired = requiredFields.filter(
              (f) => !mappedFieldNames.includes(f.name),
            )

            if (unmappedRequired.length > 0) {
              return (
                <div
                  style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                    fontSize: '14px',
                    padding: '12px',
                  }}
                >
                  <strong>
                    <span aria-label="alert" role="img">
                      ⚠️
                    </span>{' '}
                    Warning:
                  </strong>{' '}
                  The following required fields are not mapped:{' '}
                  {unmappedRequired.map((f) => f.label || f.name).join(', ')}
                  <br />
                  <small
                    style={{
                      color: '#666',
                      display: 'block',
                      marginTop: '4px',
                    }}
                  >
                    <span aria-label="lamp" role="img">
                      💡
                    </span>{' '}
                    Fields with default values do not require manual input
                  </small>
                </div>
              )
            }
            return null
          })()}

        {/* Update-mode info */}
        {importMode === 'update' && (
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              fontSize: '14px',
              padding: '12px',
            }}
          >
            <strong>
              <span aria-label="info" role="img">
                ℹ️
              </span>{' '}
              Info:
            </strong>{' '}
            When updating records, required fields do not need to be re-imported because they
            already exist in the database.
          </div>
        )}

        {/* Unmapped CSV columns */}
        {(() => {
          const unmappedCsvFields = csvHeaders.filter((h) => !getMappingForCsvField(h))

          if (unmappedCsvFields.length > 0) {
            return (
              <div
                style={{
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginTop: '8px',
                  padding: '12px',
                }}
              >
                <strong>
                  <span aria-label="info" role="img">
                    ℹ️
                  </span>{' '}
                  Info:
                </strong>{' '}
                The following file columns will not be imported: {unmappedCsvFields.join(', ')}
              </div>
            )
          }
          return null
        })()}
      </div>
    </div>
  )
}

export default FieldMappingComponent
