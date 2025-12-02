'use client'
import { Drawer, DrawerToggler } from '@payloadcms/ui'
import { Button } from '@payloadcms/ui/elements/Popup/PopupButtonList'
import { Upload } from 'lucide-react'
import React from 'react'

import type { CollectionField, ImportSettings } from '../../types/import.js'

import { useFileProcessor, useImportManager } from '../../hooks/index.js'
import DataPreview from '../DataPreview/DataPreview.js'
import ErrorDisplay from '../ErrorDisplay/ErrorDisplay.js'
import FileInfo from '../FileInfo/FileInfo.js'
import FileUpload from '../FileUpload/FileUpload.js'
import ImportConfiguration from '../ImportConfiguration/ImportConfiguration.js'
import ImportProgressComponent from '../ImportProgress/ImportProgress.js'
import LoadingState from '../LoadingState/LoadingState.js'
import SampleFiles from '../SampleFiles/SampleFiles.js'

type ImportButtonProps = {
  collection: string
  collectionFields: CollectionField[]
  collectionName?: string
}

const DRAWER_SLUG = 'extended-import-export-drawer'

const ImportButton: React.FC<ImportButtonProps> = ({
  collection,
  collectionFields,
  collectionName,
}) => {
  const { clearFile, error, file, isLoading, onFileChange, tableData } = useFileProcessor()
  const togglerRef = React.useRef<HTMLButtonElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const { currentStep, goToStep, importProgress, resetImport, setTotalRecords, startImport } =
    useImportManager(collectionFields)

  const handleClearFile = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    clearFile()
    goToStep('upload')
  }

  const handleConfigureImport = () => {
    if (tableData) {
      setTotalRecords(tableData.rows.length)
      goToStep('configure')
    }
  }

  const handleStartImport = async (settings: ImportSettings) => {
    if (tableData) {
      // Convert row arrays into objects keyed by their headers
      const dataAsObjects = tableData.rows.map((row: any) => {
        const obj: Record<string, any> = {}
        tableData.headers.forEach((header: any, index: number) => {
          obj[header] = row[index] || ''
        })
        return obj
      })

      await startImport(settings, dataAsObjects, collection)
    }
  }

  const handleBackToPreview = () => {
    goToStep('upload')
  }

  const handleResetImport = () => {
    resetImport()
    handleClearFile()
  }

  const renderContent = () => {
    // When import is running or finished show progress view
    if (currentStep === 'processing' || currentStep === 'complete') {
      return <ImportProgressComponent onReset={handleResetImport} progress={importProgress} />
    }

    // Show configuration step when data is ready
    if (currentStep === 'configure' && tableData) {
      return (
        <ImportConfiguration
          collectionFields={collectionFields}
          onBack={handleBackToPreview}
          onImport={handleStartImport}
          tableData={tableData}
        />
      )
    }

    // Default file upload experience
    if (!file) {
      return (
        <div>
          <FileUpload inputRef={inputRef} onFileChange={onFileChange} />
          <SampleFiles
            collectionFields={collectionFields}
            collectionName={collectionName || collection}
          />
        </div>
      )
    }

    return (
      <div>
        <FileInfo file={file} onClear={handleClearFile} />
        <LoadingState isLoading={isLoading} />
        <ErrorDisplay error={error} />
        {tableData && !isLoading && (
          <DataPreview onConfigure={handleConfigureImport} tableData={tableData} />
        )}
      </div>
    )
  }

  return (
    <>
      <DrawerToggler
        // @ts-ignore
        ref={togglerRef}
        slug={DRAWER_SLUG}
        style={{ display: 'none' }}
        title={`Import ${collection}`}
      >
        hidden toggler
      </DrawerToggler>
      <Button onClick={() => togglerRef.current?.click()}>
        <span>Import {collection}</span>
      </Button>
      <Drawer slug={DRAWER_SLUG} title={`Import ${collection}`}>
        {renderContent()}
      </Drawer>
    </>
  )
}

export default ImportButton
