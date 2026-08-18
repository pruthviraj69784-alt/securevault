import { useQuery } from '@tanstack/react-query'
import { fileApi, auditApi, webhookApi, shareApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export function useSecurityScore() {
  const { user } = useAuth()

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['my-files'],
    queryFn: () => fileApi.myFiles().then(r => r.data.data),
    staleTime: 30000,
  })

  const { data: integrityData, isLoading: integrityLoading, refetch: refetchIntegrity } = useQuery({
    queryKey: ['audit-integrity'],
    queryFn: () => auditApi.verify().then(r => r.data.data),
    staleTime: 30000,
  })

  const { data: webhooksData, isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhookApi.list().then(r => r.data.data),
    staleTime: 60000,
  })

  const { data: sharesData, isLoading: sharesLoading } = useQuery({
    queryKey: ['shares-by-me'],
    queryFn: () => shareApi.sharedByMe().then(r => r.data.data),
    staleTime: 30000,
  })

  const isLoading = filesLoading || integrityLoading || webhooksLoading || sharesLoading
  const files = filesData || []
  const webhooks = webhooksData || []
  const shares = sharesData || []
  const integrity = integrityData || {}

  const totalFiles = files.length
  const zkFilesCount = files.filter(f => f.versions?.some(v => v.isZeroKnowledge)).length
  const infectedCount = files.filter(f => f.versions?.some(v => v.status === 'INFECTED' || v.status === 'FAILED')).length
  const isTampered = integrity.isTampered === true
  const totalAudits = integrity.totalRecords || 0
  const validAudits = integrity.validRecords || 0

  // ── Dimension 1: Cryptographic Ledger Integrity (Max 25) ───────────────────
  let ledgerScore = 0
  let ledgerStatus = 'Clean'
  if (isTampered) {
    ledgerScore = 0
    ledgerStatus = 'Compromised'
  } else if (totalAudits > 0 && integrity.isValid) {
    ledgerScore = 25
    ledgerStatus = 'SHA-256 Verified'
  } else {
    ledgerScore = 20
    ledgerStatus = 'Genesis Clean'
  }

  // ── Dimension 2: Zero-Knowledge Adoption (Max 20) ──────────────────────────
  let zkScore = 0
  if (totalFiles > 0) {
    const ratio = zkFilesCount / totalFiles
    zkScore = Math.round(10 + ratio * 10) // 10 base + up to 10
  } else if (zkFilesCount > 0) {
    zkScore = 15
  } else {
    zkScore = 5 // basic capability enabled
  }
  zkScore = Math.min(20, Math.max(0, zkScore))

  // ── Dimension 3: Storage & Encryption Integrity (Max 20) ───────────────────
  let storageScore = 20
  if (infectedCount > 0) {
    storageScore = Math.max(0, 20 - infectedCount * 10)
  }

  // ── Dimension 4: Share Defense & Expiration Policy (Max 15) ────────────────
  let shareScore = 15
  if (shares.length > 0) {
    const unexpiredWithPass = shares.filter(s => s.isPasswordRequired || s.password || s.shareType === 'INTERNAL').length
    const shareRatio = unexpiredWithPass / shares.length
    shareScore = Math.round(8 + shareRatio * 7)
  }

  // ── Dimension 5: Webhook & Security Automation (Max 10) ────────────────────
  let automationScore = webhooks.length > 0 ? 10 : 5

  // ── Dimension 6: Authentication & Credentials (Max 10) ────────────────────
  let authScore = 8
  if (user?.role === 'ADMIN') authScore += 2

  // Total Calculation
  const totalScore = Math.min(100, Math.max(0, ledgerScore + zkScore + storageScore + shareScore + automationScore + authScore))

  const scoreColor = isTampered
    ? 'var(--danger)'
    : totalScore >= 90
    ? 'var(--success)'
    : totalScore >= 75
    ? 'var(--accent)'
    : totalScore >= 60
    ? 'var(--warning)'
    : 'var(--danger)'

  const scoreLabel = isTampered
    ? 'Critical: Tamper Detected'
    : totalScore >= 90
    ? 'Excellent'
    : totalScore >= 75
    ? 'Very Good'
    : totalScore >= 60
    ? 'Moderate'
    : 'Action Required'

  const breakdown = [
    {
      label: 'Audit Ledger Hash Integrity',
      points: ledgerScore,
      max: 25,
      status: ledgerStatus,
      color: isTampered ? 'var(--danger)' : 'var(--success)',
      desc: isTampered ? 'Cryptographic break detected in ledger' : `${validAudits} chained SHA-256 blocks verified`,
    },
    {
      label: 'Zero-Knowledge Privacy',
      points: zkScore,
      max: 20,
      status: `${zkFilesCount} ZK Files`,
      color: zkScore >= 15 ? 'var(--success)' : 'var(--warning)',
      desc: zkFilesCount > 0 ? `${Math.round((zkFilesCount / (totalFiles || 1)) * 100)}% of vault client-encrypted` : 'Enable ZK encryption on sensitive files',
    },
    {
      label: 'Data-at-Rest & Malware Scan',
      points: storageScore,
      max: 20,
      status: infectedCount === 0 ? 'All Safe' : `${infectedCount} Infected`,
      color: infectedCount === 0 ? 'var(--success)' : 'var(--danger)',
      desc: 'AES-256-GCM S3 storage with virus pre-scan',
    },
    {
      label: 'Share Expiry & Access Control',
      points: shareScore,
      max: 15,
      status: `${shares.length} Active`,
      color: 'var(--info)',
      desc: 'Time-to-live restrictions and internal token isolation',
    },
    {
      label: 'Event Automation & Webhooks',
      points: automationScore,
      max: 10,
      status: webhooks.length > 0 ? `${webhooks.length} Active` : 'Unconfigured',
      color: webhooks.length > 0 ? 'var(--accent)' : 'var(--muted)',
      desc: 'Real-time telemetry and webhook alerting',
    },
    {
      label: 'Authentication & Hardening',
      points: authScore,
      max: 10,
      status: 'Bcrypt 10',
      color: 'var(--accent)',
      desc: 'Cryptographic password hashing and RBAC checks',
    },
  ]

  return {
    score: totalScore,
    scoreColor,
    scoreLabel,
    isTampered,
    isLoading,
    breakdown,
    refetchIntegrity,
    stats: {
      totalFiles,
      zkFilesCount,
      totalShares: shares.length,
      webhooksCount: webhooks.length,
      devicesCount: user?.devices?.length || 1,
      totalAudits,
    }
  }
}
