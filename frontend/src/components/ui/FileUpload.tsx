import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { CloudArrowUpIcon, XMarkIcon, PlayIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface UploadedFile {
  file: File
  preview: string
  type: 'image' | 'video' | 'other'
  progress?: number
  uploaded?: boolean
  error?: string
}

interface FileUploadProps {
  accept?: Record<string, string[]>
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  onFilesChange: (files: UploadedFile[]) => void
  onUploadProgress?: (fileIndex: number, progress: number) => void
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

export default function FileUpload({
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.mov']
  },
  multiple = true,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  onFilesChange,
  onUploadProgress,
  className,
  disabled = false,
  children
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const processFile = (file: File): UploadedFile => {
    const type = file.type.startsWith('image/') 
      ? 'image' 
      : file.type.startsWith('video/')
      ? 'video'
      : 'other'
    
    return {
      file,
      preview: URL.createObjectURL(file),
      type,
      progress: 0,
      uploaded: false
    }
  }

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errorFiles = rejectedFiles.map(rejection => ({
        file: rejection.file,
        preview: '',
        type: 'other' as const,
        error: rejection.errors[0]?.message || 'File rejected'
      }))
      
      // You might want to show these errors to the user
      console.warn('Rejected files:', errorFiles)
    }

    // Process accepted files
    const newFiles = acceptedFiles.map(processFile)
    const updatedFiles = [...uploadedFiles, ...newFiles].slice(0, maxFiles)
    
    setUploadedFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }, [uploadedFiles, maxFiles, onFilesChange])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize,
    disabled
  })

  const removeFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index)
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(uploadedFiles[index].preview)
    setUploadedFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={clsx('w-full', className)}>
      {/* Dropzone */}
      {uploadedFiles.length < maxFiles && (
        <div
          {...getRootProps()}
          className={clsx(
            'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
            isDragActive && !isDragReject && 'border-primary-500 bg-primary-500/10',
            isDragReject && 'border-red-500 bg-red-500/10',
            !isDragActive && 'border-dark-border hover:border-primary-500/50 hover:bg-primary-500/5',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          
          {children || (
            <div className="flex flex-col items-center space-y-4">
              <CloudArrowUpIcon className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-white mb-1">
                  {isDragActive ? 'Drop files here' : 'Upload media'}
                </p>
                <p className="text-gray-400 text-sm">
                  {multiple ? `Drag & drop up to ${maxFiles - uploadedFiles.length} files or click to browse` : 'Drag & drop a file or click to browse'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Max {formatFileSize(maxSize)} per file
                </p>
              </div>
            </div>
          )}
          
          {isDragReject && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-xl">
              <p className="text-red-400 font-medium">Some files are not supported</p>
            </div>
          )}
        </div>
      )}

      {/* File Preview Grid */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected
            </h4>
            <button
              onClick={() => {
                uploadedFiles.forEach(file => URL.revokeObjectURL(file.preview))
                setUploadedFiles([])
                onFilesChange([])
              }}
              className="text-gray-400 hover:text-white text-sm"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedFiles.map((uploadedFile, index) => (
              <FilePreview
                key={`${uploadedFile.file.name}-${index}`}
                uploadedFile={uploadedFile}
                index={index}
                onRemove={removeFile}
                formatFileSize={formatFileSize}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FilePreview({ 
  uploadedFile, 
  index, 
  onRemove, 
  formatFileSize 
}: { 
  uploadedFile: UploadedFile
  index: number
  onRemove: (index: number) => void
  formatFileSize: (bytes: number) => string
}) {
  return (
    <div className="relative group">
      <div className="aspect-square bg-dark-surface rounded-lg overflow-hidden">
        {uploadedFile.type === 'image' && (
          <img
            src={uploadedFile.preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        )}
        
        {uploadedFile.type === 'video' && (
          <div className="relative w-full h-full">
            <video
              src={uploadedFile.preview}
              className="w-full h-full object-cover"
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayIcon className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          </div>
        )}
        
        {uploadedFile.type === 'other' && (
          <div className="w-full h-full flex items-center justify-center">
            <DocumentIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Progress bar */}
        {uploadedFile.progress !== undefined && uploadedFile.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50">
            <div 
              className="h-1 bg-primary-500 transition-all duration-300"
              style={{ width: `${uploadedFile.progress}%` }}
            />
          </div>
        )}

        {/* Error overlay */}
        {uploadedFile.error && (
          <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
            <p className="text-white text-xs text-center p-2">
              {uploadedFile.error}
            </p>
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={() => onRemove(index)}
          className="absolute top-2 right-2 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <XMarkIcon className="w-4 h-4 text-white" />
        </button>

        {/* Upload status */}
        {uploadedFile.uploaded && (
          <div className="absolute top-2 left-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {/* File info */}
      <div className="mt-2">
        <p className="text-white text-sm truncate" title={uploadedFile.file.name}>
          {uploadedFile.file.name}
        </p>
        <p className="text-gray-400 text-xs">
          {formatFileSize(uploadedFile.file.size)}
        </p>
      </div>
    </div>
  )
}