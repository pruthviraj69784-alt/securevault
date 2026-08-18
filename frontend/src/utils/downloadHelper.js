import { decryptBuffer } from '../hooks/useCrypto'

function getHeader(headers, name) {
  if (!headers) return null
  if (typeof headers.get === 'function') {
    return headers.get(name) || headers.get(name.toLowerCase()) || headers.get(name.toUpperCase())
  }
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || null
}

export function getFilenameFromHeaders(headers, fallbackName = 'downloaded-file') {
  const disposition = getHeader(headers, 'content-disposition')
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i)
    if (match && match[1]) {
      return decodeURIComponent(match[1].replace(/['"]/g, ''))
    }
  }
  return fallbackName
}

export function ensureExtension(filename, mimeType) {
  if (filename && filename.includes('.')) return filename

  const extMap = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/json': '.json',
    'application/zip': '.zip',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  }

  const ext = extMap[mimeType] || ''
  return filename ? `${filename}${ext}` : `file${ext || '.bin'}`
}

export async function processAndSaveDownload(res, defaultFilename = 'downloaded-file', zkPassphrase = '') {
  const headers = res.headers || {}
  const isZK = getHeader(headers, 'x-zero-knowledge') === 'true'
  const ivHex = getHeader(headers, 'x-file-iv') || ''
  const contentType = getHeader(headers, 'content-type') || 'application/octet-stream'

  let finalFilename = getFilenameFromHeaders(headers, defaultFilename)
  finalFilename = ensureExtension(finalFilename, contentType)

  let blob = res.data
  if (!(blob instanceof Blob)) {
    blob = new Blob([res.data], { type: contentType })
  }

  // Detect if the response is actually a JSON error object (e.g. {"success":false, "message":"..."})
  if (contentType.includes('application/json') || blob.type === 'application/json') {
    const text = await blob.text()
    try {
      const json = JSON.parse(text)
      throw new Error(json.message || json.error || 'Server error occurred during file download.')
    } catch (err) {
      if (err.message && !err.message.includes('JSON')) throw err
    }
  }

  // Inspect first 100 bytes for JSON error payload
  try {
    const textHeader = await blob.slice(0, 100).text()
    if (textHeader.trim().startsWith('{"success":false') || textHeader.trim().startsWith('{"error"')) {
      const fullText = await blob.text()
      const json = JSON.parse(fullText)
      throw new Error(json.message || json.error || 'Server error occurred during file download.')
    }
  } catch (err) {
    if (err.message && !err.message.includes('JSON')) throw err
  }

  if (isZK) {
    if (!zkPassphrase) {
      const err = new Error('This file was encrypted with Zero-Knowledge encryption. Please enter your secret passphrase to decrypt it.')
      err.isZeroKnowledge = true
      err.pendingRes = res
      err.finalFilename = finalFilename
      throw err
    }
    try {
      const arrayBuf = await blob.arrayBuffer()
      blob = await decryptBuffer(arrayBuf, ivHex, zkPassphrase, contentType)
    } catch {
      throw new Error('Failed to decrypt Zero-Knowledge file. The ZK passphrase is incorrect.')
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = finalFilename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
