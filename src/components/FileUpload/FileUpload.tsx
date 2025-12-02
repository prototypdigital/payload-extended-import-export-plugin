import { Dropzone } from '@payloadcms/ui'
import { Database, FileText, FileUpIcon } from 'lucide-react'
import React from 'react'

interface FileUploadProps {
  onFileChange: (files: FileList) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, inputRef }) => {
  return (
    <div style={{ marginBottom: '24px' }}>
      <Dropzone onChange={onFileChange}>
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1rem',
            borderRadius: '4px',
            padding: '2rem',
            position: 'relative',
            transition: 'all 0.2s ease',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileUpIcon color="#3b82f6" size={28} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Upload a file for import
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              Drag a file here or click to choose one
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={16} />
              <span>CSV</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Database size={16} />
              <span>JSON</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={16} />
              <span>XLSX</span>
            </div>
          </div>

          <input
            accept=".csv,.json,.xlsx,.xls"
            onChange={(e) => {
              if (e.target.files) {
                onFileChange(e.target.files)
              }
            }}
            ref={inputRef}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
            }}
            type="file"
          />
        </div>
      </Dropzone>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#92400e',
        }}
      >
        <strong>📝 Supported formats:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>
            <strong>CSV</strong> - plain text files with delimiters
          </li>
          <li>
            <strong>JSON</strong> - structured data in JSON format
          </li>
          <li>
            <strong>XLSX</strong> - Microsoft Excel workbooks
          </li>
        </ul>
      </div>
    </div>
  )
}

export default FileUpload
