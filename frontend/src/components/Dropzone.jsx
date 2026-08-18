import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, File as FileIcon, X } from 'lucide-react'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function Dropzone({ file, setFile, accept, maxSize = 50 * 1024 * 1024 }) {
  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0])
  }, [setFile])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: false,
    accept,
    maxSize,
  })

  const reject = fileRejections[0]?.errors[0]

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-300 outline-none
          ${isDragActive
            ? 'border-(--accent) bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] scale-[1.01]'
            : 'border-theme hover:border-(--accent) hover:bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]'
          }
        `}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ y: isDragActive ? -6 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
            <UploadCloud size={30} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-semibold text-theme">
              {isDragActive ? 'Drop it here!' : 'Drag & drop your file'}
            </p>
            <p className="text-sm text-muted mt-1">
              or <span style={{ color: 'var(--accent)' }}>browse</span> — max {formatBytes(maxSize)}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Rejection error */}
      <AnimatePresence>
        {reject && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-(--danger) text-center"
          >
            {reject.message}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Selected file preview */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-theme"
            style={{ background: 'var(--card)' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
              <FileIcon size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-theme truncate">{file.name}</p>
              <p className="text-xs text-muted">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-(--danger) transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
