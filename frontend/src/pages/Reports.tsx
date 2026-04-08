import { AdminLayout } from '@/components/AdminLayout'
import { mlInsights } from '@/data/mockData'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, RefreshCw, ShieldAlert } from 'lucide-react'
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiBaseUrl, buildApiUrl } from '@/lib/api'

function clampIndex(value: string | null, max: number) {
  const n = value == null ? NaN : Number(value)
  if (!Number.isFinite(n)) return 0
  const idx = Math.floor(n)
  if (idx < 0) return 0
  if (idx >= max) return Math.max(0, max - 1)
  return idx
}

export default function Reports() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { data } = useAdminDashboardData()
  const queryClient = useQueryClient()

  const reportItems = useMemo(() => {
    return mlInsights
      .map((insight, originalIndex) => ({ insight, originalIndex }))
      .filter(({ insight }) => /high-risk/i.test(insight.title) || /high risk/i.test(insight.title))
  }, [])

  const requestedOriginalIndex = params.get('item')
  const requested = requestedOriginalIndex == null ? NaN : Number(requestedOriginalIndex)
  const requestedIdx = reportItems.findIndex((x) => x.originalIndex === requested)

  const selectedIdx = requestedIdx >= 0 ? requestedIdx : 0
  const selected = reportItems[selectedIdx]?.insight

  const reportMeta = useMemo(() => {
    // This is intentionally lightweight right now. The “real” report body will
    // be swapped to call your ML pipeline once we hook it up.
    const defaultHeadline = selected?.title ?? 'Report'
    const defaultSummary = selected?.description ?? ''

    const isHighRisk = /high-risk/i.test(defaultHeadline) || /high risk/i.test(defaultHeadline)
    const caseCode = (defaultSummary.match(/\bC\d{3,5}\b/)?.[0] ?? '').toUpperCase()

    return {
      headline: isHighRisk ? 'High Risk Resident Review' : defaultHeadline,
      summary: defaultSummary,
      description: isHighRisk
        ? 'Flags residents most likely to need urgent follow‑up in the next 30 days using recent incidents and counseling concerns.'
        : null,
      isHighRisk,
      caseCode: caseCode || null,
      dataSource: data?.source ?? 'mock',
    }
  }, [selected?.title, selected?.description, data?.source])

  type ResidentRiskResponse = {
    generatedAt: string
    asOf: string
    model: {
      isTrained: boolean
      threshold: number
      rocAuc?: number | null
      averagePrecision?: number | null
    }
    highRiskResidents: Array<{
      internalCode: string | null
      riskProbability: number | null
      riskLevel: string | null
      signals: {
        incidents90d: number
        highIncidents90d: number
        followups90d: number
        sessions90d: number
        concerns90d: number
        referrals90d: number
      }
    }>
  }

  async function fetchLatestRisk(): Promise<ResidentRiskResponse> {
    const response = await fetch(buildApiUrl('/api/ml/risk/latest'))

    if (response.status === 404) {
      throw new Error('No saved risk report yet. Click “Refresh report” to generate it.')
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Unable to load resident risk report.')
    }

    return response.json()
  }

  async function refreshRisk(): Promise<ResidentRiskResponse> {
    const response = await fetch(buildApiUrl('/api/ml/risk/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Unable to refresh resident risk report.')
    }

    return response.json()
  }

  const riskQuery = useQuery({
    queryKey: ['resident-risk'],
    queryFn: fetchLatestRisk,
    retry: false,
    enabled: reportMeta.isHighRisk,
  })

  const refreshMutation = useMutation({
    mutationFn: refreshRisk,
    onSuccess: (fresh) => {
      queryClient.setQueryData(['resident-risk'], fresh)
    },
  })

  const riskData = riskQuery.data
  const riskError = (refreshMutation.error ?? riskQuery.error) as Error | null
  const isBusy = riskQuery.isLoading || refreshMutation.isPending
  const showAll = params.get('showAll') === '1'
  const apiStatusLabel = apiBaseUrl || 'this site'

  return (
    <AdminLayout title="Reports & Analytics" subtitle="Click a report to generate details for Giulia">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: report list */}
        <div className="lg:w-96 bg-card rounded-2xl shadow-warm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Reports</h2>
            </div>
            </div>

            {reportMeta.isHighRisk ? (
              <button
                onClick={() => refreshMutation.mutate()}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                Refresh report
              </button>
            ) : null}
          </div>

          <div className="p-3 space-y-2">
            {reportItems.map(({ insight, originalIndex }, idx) => {
              const active = idx === selectedIdx
              const urgent = /high-risk/i.test(insight.title) || /high risk/i.test(insight.title)
              const title = urgent ? 'High Risk Resident Review' : insight.title
              const description = urgent
                ? 'Prioritize residents most likely to need urgent follow‑up in the next 30 days.'
                : insight.description
              return (
                <button
                  key={originalIndex}
                  onClick={() => setParams({ item: String(originalIndex) })}
                  className={[
                    'w-full text-left p-3 rounded-xl border transition-colors',
                    active ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    {urgent ? (
                      <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: report body */}
        <div className="flex-1 bg-card rounded-2xl shadow-warm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-xl font-bold text-foreground truncate">
                {reportMeta.headline}
              </h3>
              {reportMeta.description ? (
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-snug text-balance">
                  {reportMeta.description}
                </p>
              ) : null}
            </div>

            <button
              onClick={() => navigate('/admin')}
              className="text-sm text-primary font-medium hover:underline shrink-0 whitespace-nowrap mt-0.5"
            >
              Back to dashboard
            </button>
          </div>

          <div className="p-6 space-y-6">
            <section className="rounded-2xl bg-muted/30 border border-border p-4">
              <p className="text-sm font-semibold text-foreground">Summary</p>
              {reportMeta.isHighRisk && riskData ? (
                (() => {
                  const highs =
                    (riskData.highRiskResidents ?? []).filter(
                      (r) => (r.riskLevel ?? '').toLowerCase() === 'high',
                    ) ?? []

                  const asOf = new Date(riskData.asOf)
                  const asOfLabel = Number.isNaN(asOf.getTime())
                    ? riskData.asOf
                    : asOf.toLocaleDateString()

                  const residentList = highs
                    .map((r) => r.internalCode)
                    .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)

                  return (
                    <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                      <p>
                        As of <span className="font-medium text-foreground">{asOfLabel}</span>,{' '}
                        <span className="font-medium text-foreground">{highs.length}</span> residents are above the
                        high risk threshold.
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Residents:</span>{' '}
                        {residentList.length ? residentList.join(', ') : '—'}
                      </p>
                    </div>
                  )
                })()
              ) : (
                <p className="text-sm text-muted-foreground mt-2">{reportMeta.summary || '—'}</p>
              )}
            </section>

            {reportMeta.isHighRisk ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-warm space-y-3">
                <p className="text-sm font-semibold text-foreground">High‑risk resident report</p>
                {riskError ? (
                  <div className="rounded-xl border border-destructive/20 bg-background/50 p-3">
                    <p className="text-sm text-foreground font-semibold">Backend report unavailable</p>
                    <p className="text-xs text-muted-foreground mt-1">{riskError.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Make sure the report API is reachable at <code>{apiStatusLabel}</code> and press “Refresh report”.
                    </p>
                  </div>
                ) : null}

                {riskData ? (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Generated <span className="font-medium">{new Date(riskData.generatedAt).toLocaleString()}</span>
                      {riskData.model.isTrained ? (
                        <>
                          {' '}· Model AUC <span className="font-medium">{riskData.model.rocAuc?.toFixed?.(3) ?? '—'}</span>
                        </>
                      ) : (
                        <></>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Showing <span className="font-medium text-foreground">{showAll ? 'all residents' : 'high risk only'}</span>
                      </p>
                      <button
                        onClick={() => {
                          const next = new URLSearchParams(params)
                          if (showAll) next.delete('showAll')
                          else next.set('showAll', '1')
                          setParams(next)
                        }}
                        className="text-xs font-semibold text-primary hover:underline self-start sm:self-auto"
                      >
                        {showAll ? 'Show high risk only' : 'Show all residents'}
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border bg-background/40">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="px-3 py-2 font-medium">Resident</th>
                            <th className="px-3 py-2 font-medium">Signals (last 90 days)</th>
                            <th className="px-3 py-2 font-medium">Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const all = riskData.highRiskResidents ?? []
                            const highs = all.filter((r) => (r.riskLevel ?? '').toLowerCase() === 'high')
                            const rows = showAll ? all : highs
                            const fallback = !showAll && rows.length === 0 ? all.slice(0, 10) : rows.slice(0, 10)

                            return fallback.map((r, idx) => {
                              const isHigh = (r.riskLevel ?? '').toLowerCase() === 'high'
                              return (
                                <tr
                                  key={r.internalCode ?? `row-${idx}`}
                                  className={[
                                    'border-b border-border/50',
                                    isHigh ? 'outline outline-1 outline-destructive/40 bg-destructive/5' : 'bg-background/0',
                                  ].join(' ')}
                                >
                              <td className="px-3 py-2">
                                <span className="font-semibold text-foreground">{r.internalCode ?? '—'}</span>
                              </td>
                              <td className="px-3 py-2">
                                <span className="text-muted-foreground">
                                  Incidents: <span className="font-medium text-foreground">{r.signals.incidents90d}</span>
                                  {' '}· High incidents: <span className="font-medium text-foreground">{r.signals.highIncidents90d}</span>
                                  {' '}· Follow-ups: <span className="font-medium text-foreground">{r.signals.followups90d}</span>
                                  {' '}· Concerns: <span className="font-medium text-foreground">{r.signals.concerns90d}</span>
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-semibold text-foreground">
                                  {r.riskProbability == null ? '—' : `${Math.round(r.riskProbability * 100)}%`}
                                </span>{' '}
                                <span className="text-muted-foreground">({r.riskLevel ?? '—'})</span>
                              </td>
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {!showAll &&
                    (riskData.highRiskResidents ?? []).filter((r) => (r.riskLevel ?? '').toLowerCase() === 'high')
                      .length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No residents crossed the <span className="font-medium text-foreground">High</span> threshold right now.
                        Showing the top 10 residents by risk instead.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click “Refresh report” to run the resident at‑risk pipeline and populate this report.
                  </p>
                )}
              </section>
            ) : (
              <section className="rounded-2xl bg-muted/30 border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Report details</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This report type isn’t wired to the ML pipeline yet. We’ll plug in the pipeline and use the same UI.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
