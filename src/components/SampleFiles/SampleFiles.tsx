import { Check, Copy, Download, FileText } from 'lucide-react'
import React, { useState } from 'react'

import type { CollectionField } from '../../types/import.js'

import { generateSampleCSV, generateSampleJSON } from '../../utils/sample-generators.js'

interface SampleFilesProps {
  collectionFields: CollectionField[]
  collectionName: string
}

const SampleFiles: React.FC<SampleFilesProps> = ({ collectionFields, collectionName }) => {
  const [copiedFormat, setCopiedFormat] = useState<null | string>(null)

  const sampleCSV = generateSampleCSV(collectionFields)
  const sampleJSON = generateSampleJSON(collectionFields)

  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(format)
      setTimeout(() => setCopiedFormat(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <h4
        style={{
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 16px 0',
        }}
      >
        <span aria-label="file" role="img">
          📄
        </span>{' '}
        Sample files for importing into “{collectionName}”
      </h4>

      <div
        style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: '1fr 1fr',
        }}
      >
        {/* CSV example */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 16px',
            }}
          >
            <div style={{ alignItems: 'center', display: 'flex' }}>
              <FileText size={16} style={{ marginRight: '8px' }} />
              <strong>CSV format</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => copyToClipboard(sampleCSV, 'csv')}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  fontSize: '12px',
                  padding: '4px 8px',
                }}
                title="Copy to clipboard"
                type="button"
              >
                {copiedFormat === 'csv' ? <Check color="#28a745" size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={() => downloadFile(sampleCSV, `${collectionName}-sample.csv`, 'text/csv')}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  fontSize: '12px',
                  padding: '4px 8px',
                }}
                title="Download CSV file"
                type="button"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
          <div
            style={{
              backgroundColor: '#f8f8f8',
              fontFamily: 'monospace',
              fontSize: '12px',
              maxHeight: '200px',
              overflow: 'auto',
              padding: '12px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {sampleCSV}
          </div>
        </div>

        {/* JSON example */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 16px',
            }}
          >
            <div style={{ alignItems: 'center', display: 'flex' }}>
              <FileText size={16} style={{ marginRight: '8px' }} />
              <strong>JSON format</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => copyToClipboard(sampleJSON, 'json')}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  fontSize: '12px',
                  padding: '4px 8px',
                }}
                title="Copy to clipboard"
                type="button"
              >
                {copiedFormat === 'json' ? <Check color="#28a745" size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={() =>
                  downloadFile(sampleJSON, `${collectionName}-sample.json`, 'application/json')
                }
                style={{
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  fontSize: '12px',
                  padding: '4px 8px',
                }}
                title="Download JSON file"
                type="button"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
          <div
            style={{
              backgroundColor: '#f8f8f8',
              fontFamily: 'monospace',
              fontSize: '12px',
              maxHeight: '200px',
              overflow: 'auto',
              padding: '12px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {sampleJSON}
          </div>
        </div>
      </div>

      {/* Field information */}
      <div
        style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #bbdefb',
          borderRadius: '8px',
          fontSize: '14px',
          marginTop: '16px',
          padding: '12px',
        }}
      >
        <strong>
          <span aria-label="light bulb" role="img">
            💡
          </span>{' '}
          Tip:
        </strong>{' '}
        The examples above are generated from the “{collectionName}” schema. Use them as a template
        to prepare your own data files.
        <div
          style={{
            color: '#666',
            fontSize: '12px',
            marginTop: '8px',
          }}
        >
          • Fields marked with an asterisk (*) are required
          <br />
          • Fields with [auto] have default values and can be left blank
          <br />• Empty CSV cells will be filled with default values automatically
        </div>
      </div>
    </div>
  )
}

export default SampleFiles
