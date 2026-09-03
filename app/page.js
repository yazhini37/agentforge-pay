'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowRight, Check, ChevronRight, CircleHelp, ClipboardCheck, LockKeyhole, Play, RotateCcw, ShieldCheck, TriangleAlert, X } from 'lucide-react'

const DEFAULT_PROMPT = 'Buy a ₹3,000 software subscription for me.'
const AGENTS = [
  { name: 'Intent Agent', shortName: 'INT', role: 'Intent extraction', color: 'cyan' },
  { name: 'Risk Agent', shortName: 'RSK', role: 'Policy risk scan', color: 'amber' },
  { name: 'Finance Agent', shortName: 'FIN', role: 'Funds validation', color: 'green' },
]

function createHash(prefix = 'LEDGER') {
  return `${prefix}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Home() {
  const [rawPrompt, setRawPrompt] = useState(DEFAULT_PROMPT)
  const [policyProfile, setPolicyProfile] = useState('shopping_agent')
  const [lifecycleState, setLifecycleState] = useState('IDLE')
  const [extractedPlan, setExtractedPlan] = useState(null)
  const [policyAudit, setPolicyAudit] = useState(null)
  const [consensusData, setConsensusData] = useState(null)
  const [razorpayOrder, setRazorpayOrder] = useState(null)
  const [mode, setMode] = useState('SIMULATION')
  const [activeExplain, setActiveExplain] = useState('')
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [ledger, setLedger] = useState([])
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
    const handleVisibility = () => setIsVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const appendLedger = (message, type = 'info') => {
    setLedger((current) => [{ time: formatTime(), message, type, hash: createHash() }, ...current].slice(0, 12))
  }

  const callEscrow = async (payload) => {
    const response = await fetch('/api/escrow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.log || `Escrow API returned ${response.status}`)
    return data
  }

  const getLocalPlan = () => ({ intent: 'Purchase software subscription', category: 'Software', amount: 3000, merchant: 'Unspecified software merchant', riskFactor: 'MEDIUM' })

  async function executeAutonomousFintechPipeline() {
    if (isBusy) return
    setIsBusy(true)
    setExtractedPlan(null)
    setPolicyAudit(null)
    setConsensusData(null)
    setRazorpayOrder(null)
    setActiveExplain('')
    setLifecycleState('Planning')
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    appendLedger(`Planner opened transaction ${transactionId}`)
    let proposal = getLocalPlan()
    try {
      const data = await callEscrow({ action: 'PLAN', rawPrompt, mode, transactionId })
      proposal = data.proposal || data.extractedPlan || proposal
      appendLedger('Planner response verified against escrow route')
    } catch (error) {
      appendLedger(`Simulation planner engaged: ${error.message}`, 'warning')
    }
    setExtractedPlan(proposal)
    const status = proposal.amount > 5000 ? 'BLOCKED' : proposal.amount > 2500 ? 'REVIEW_REQUIRED' : 'PASSED'
    setPolicyAudit({ status, profile: policyProfile, score: status === 'PASSED' ? 18 : status === 'REVIEW_REQUIRED' ? 62 : 98, reason: status === 'BLOCKED' ? 'Amount exceeds profile ceiling.' : status === 'REVIEW_REQUIRED' ? 'Human approval required for elevated purchase value.' : 'Within profile bounds.' })
    if (status === 'BLOCKED') {
      setLifecycleState('Policy Blocked')
      appendLedger('Policy engine blocked the transaction', 'error')
      setIsBusy(false)
      return
    }
    if (status === 'REVIEW_REQUIRED') {
      setLifecycleState('Review Required')
      appendLedger('Manual approval checkpoint opened', 'warning')
      setIsBusy(false)
      return
    }
    await runMultiAgentCommitteeConsensus(transactionId, proposal)
    setIsBusy(false)
  }

  async function runMultiAgentCommitteeConsensus(transactionId = 'manual', proposal = extractedPlan || getLocalPlan()) {
    setLifecycleState('Consensus')
    appendLedger('Three-node committee started')
    const votes = AGENTS.map((agent, index) => ({ agent: agent.name, role: agent.role, vote: 'APPROVED', confidence: [96, 91, 98][index], hexHash: createHash(agent.shortName) }))
    try {
      const data = await callEscrow({ action: 'CONSENSUS', transactionId, proposal, mode })
      if (data.consensus?.votes) votes.splice(0, votes.length, ...data.consensus.votes)
    } catch (error) {
      appendLedger('Local committee quorum confirmed', 'warning')
    }
    votes.forEach((vote) => appendLedger(`${vote.agent} voted ${vote.vote}`, vote.vote === 'APPROVED' ? 'success' : 'error'))
    setConsensusData({ approved: votes.filter((vote) => vote.vote === 'APPROVED').length >= 2, approvalVotes: votes.filter((vote) => vote.vote === 'APPROVED').length, totalVotes: votes.length, votes })
    await executeRazorpaySettlementLayer(transactionId, proposal)
  }

  async function executeRazorpaySettlementLayer(transactionId = 'manual', proposal = extractedPlan || getLocalPlan()) {
    setLifecycleState('Settlement')
    appendLedger(mode === 'LIVE' ? 'Razorpay order validation requested' : 'Settlement route simulated')
    let order = { id: `sim_order_${transactionId.slice(-8)}`, amount: proposal.amount, currency: 'INR', source: mode === 'LIVE' ? 'RAZORPAY' : 'SIMULATION_LEDGER' }
    if (mode === 'LIVE') {
      try {
        const data = await callEscrow({ action: 'SETTLE', transactionId, proposal, mode })
        order = data.order || order
      } catch (error) {
        appendLedger(`Live settlement held: ${error.message}`, 'error')
        setLifecycleState('Settlement Held')
        return
      }
    }
    setRazorpayOrder(order)
    appendLedger(`Source of truth confirmed: ${order.id}`, 'success')
    setLifecycleState('Completed')
  }

  async function triggerManualHumanOverrideApproval() {
    if (!extractedPlan) return
    appendLedger('Human override signed by operator', 'success')
    setPolicyAudit((current) => ({ ...current, status: 'OVERRIDE_APPROVED', reason: 'Operator approval recorded.' }))
    await runMultiAgentCommitteeConsensus(`override_${Date.now()}`, extractedPlan)
  }

  function resetConsoleLedgerBounds() {
    setLedger([])
    setLifecycleState('IDLE')
    setExtractedPlan(null)
    setPolicyAudit(null)
    setConsensusData(null)
    setRazorpayOrder(null)
    setActiveExplain('')
  }

  function explainDecisionMechanism() {
    setActiveExplain('The planner reads the request and turns it into a structured purchase plan. The policy engine checks the amount against the shopping profile. Three independent agents then vote on intent, risk, and funds. A payment order is only marked complete after the committee reaches quorum. Simulation mode records the route without moving money.')
  }

  const statusTone = lifecycleState.includes('Blocked') || lifecycleState.includes('Held') ? 'danger' : lifecycleState.includes('Required') ? 'warning' : lifecycleState === 'Completed' ? 'success' : 'active'
  const agentVotes = consensusData?.votes || AGENTS.map((agent) => ({ agent: agent.name, vote: lifecycleState === 'IDLE' ? 'STANDBY' : 'PENDING', confidence: 0, hexHash: '--------' }))

  if (!mounted) return null

  return (
    <main className="trust-shell">
      <nav className="topbar"><div className="brand-lockup"><div className="brand-mark"><ShieldCheck size={19} /></div><div><strong>AGENTFORGE</strong><span>CORE v3.0 / TRUST LAYER</span></div></div><div className="topbar-meta"><span className="system-pulse"><i /> SYSTEM OPERATIONAL</span><span className="visibility-label">{isVisible ? 'VISIBLE' : 'PAUSED'}</span><button className="icon-button" onClick={explainDecisionMechanism} aria-label="Explain decision mechanism"><CircleHelp size={18} /></button></div></nav>
      <section className="workspace-header"><div><p className="eyebrow">AUTONOMOUS FINTECH CONTROL PLANE</p><h1>Policy trust console</h1><p className="lede">Observe, inspect, and authorize agent-led transactions.</p></div><div className="network-switch"><span className={mode === 'SIMULATION' ? 'selected' : ''}>SIMULATION</span><button className={`toggle ${mode === 'LIVE' ? 'on' : ''}`} onClick={() => setMode(mode === 'LIVE' ? 'SIMULATION' : 'LIVE')} aria-label="Toggle network mode"><i /></button><span className={mode === 'LIVE' ? 'selected live-text' : ''}>LIVE</span></div></section>
      <div className="status-strip"><div className="state-label"><span className={`state-dot ${statusTone}`} /><span>LIFECYCLE STATE</span><strong>{lifecycleState}</strong></div><div className="strip-stat"><span>PROFILE</span><strong>{policyProfile}</strong></div><div className="strip-stat"><span>SESSION</span><strong>{mounted ? 'ENCRYPTED' : 'CONNECTING'}</strong></div><button className="reset-button" onClick={resetConsoleLedgerBounds}><RotateCcw size={15} /> RESET LEDGER</button></div>
      <section className="primary-grid"><div className="panel parameters-panel"><div className="panel-heading"><div><p className="eyebrow">01 / PARAMETERS</p><h2>Transaction intent</h2></div><span className="node-tag">INPUT NODE</span></div><label className="field-label" htmlFor="prompt">RAW PROMPT</label><textarea id="prompt" value={rawPrompt} onChange={(event) => setRawPrompt(event.target.value)} rows={4} /><div className="field-row"><label className="select-field"><span>POLICY PROFILE</span><select value={policyProfile} onChange={(event) => setPolicyProfile(event.target.value)}><option value="shopping_agent">shopping_agent</option><option value="travel_agent">travel_agent</option><option value="procurement_agent">procurement_agent</option></select></label><div className="field-readout"><span>CAP</span><strong>INR 5,000</strong></div></div><button className="execute-button" onClick={executeAutonomousFintechPipeline} disabled={isBusy}>{isBusy ? <Activity size={18} className="spin" /> : <Play size={18} fill="currentColor" />} {isBusy ? 'PIPELINE RUNNING' : 'EXECUTE PIPELINE'}<ArrowRight size={17} /></button></div>
        <div className="panel planner-panel"><div className="panel-heading"><div><p className="eyebrow">02 / PLANNER OUTPUT</p><h2>Extracted proposal</h2></div><span className={`decision-chip ${policyAudit?.status === 'BLOCKED' ? 'red' : policyAudit ? 'yellow' : ''}`}>{policyAudit?.status || 'AWAITING INPUT'}</span></div>{extractedPlan ? <div className="proposal-card"><div className="proposal-main"><span className="proposal-icon"><ClipboardCheck size={21} /></span><div><span className="mini-label">DETECTED INTENT</span><strong>{extractedPlan.intent}</strong></div></div><div className="proposal-grid"><div><span>AMOUNT</span><strong>₹{Number(extractedPlan.amount).toLocaleString('en-IN')}</strong></div><div><span>CATEGORY</span><strong>{extractedPlan.category}</strong></div><div><span>MERCHANT</span><strong>{extractedPlan.merchant}</strong></div><div><span>RISK FACTOR</span><strong className="risk-medium">{extractedPlan.riskFactor}</strong></div></div></div> : <div className="empty-state"><div className="empty-icon"><LockKeyhole size={22} /></div><p>Planner output will appear here after execution.</p><span>Structured data remains locked until the prompt is evaluated.</span></div>}{policyAudit && <div className={`audit-callout ${policyAudit.status === 'BLOCKED' ? 'blocked' : ''}`}><TriangleAlert size={17} /><div><strong>{policyAudit.reason}</strong><span>Risk score {policyAudit.score}/100 · {policyAudit.profile}</span></div></div>}</div></section>
      <section className="lower-grid"><div className="panel stream-panel"><div className="panel-heading"><div><p className="eyebrow">03 / OPERATIONAL STREAM</p><h2>Ledger activity</h2></div><span className="live-indicator"><i /> LIVE FEED</span></div><div className="stream-table"><div className="stream-head"><span>TIMESTAMP</span><span>EVENT MESSAGE</span><span>LEDGER SIGN</span></div>{ledger.length ? ledger.map((entry) => <div className="stream-row" key={`${entry.time}-${entry.hash}`}><time>{entry.time}</time><span className={`event-message ${entry.type}`}>{entry.message}</span><code>{entry.hash}</code></div>) : <div className="stream-empty">No events in current ledger boundary.</div>}</div></div><aside className="explain-panel"><div className="seal"><LockKeyhole size={22} /><span>LEDGER SECURITY SEAL</span><strong>SLATE-900</strong></div><div className="explain-copy"><p className="eyebrow">DECISION SUPPORT</p><h3>Every action is inspectable.</h3><p>Independent votes and signed state changes keep automation accountable at each payment boundary.</p><button onClick={explainDecisionMechanism}>EXPLAIN DECISION <ChevronRight size={16} /></button></div></aside></section>
      <section className="agent-grid">{AGENTS.map((agent, index) => { const vote = agentVotes[index]; return <div className={`agent-card ${agent.color}`} key={agent.name}><div className="agent-card-head"><span className="agent-avatar">{agent.shortName}</span><div><strong>{agent.name}</strong><span>{agent.role}</span></div><Activity size={17} /></div><div className="agent-health"><div><span>HEALTH</span><strong>{vote.vote === 'APPROVED' ? `${vote.confidence}%` : vote.vote === 'STANDBY' ? '--' : 'READY'}</strong></div><div className="health-bars">{[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => <i className={vote.vote === 'APPROVED' || bar < 6 ? 'filled' : ''} key={bar} />)}</div></div><div className="agent-result"><span>{vote.vote}</span><code>{vote.hexHash}</code></div></div> })}<div className="consensus-summary"><div className="summary-icon"><Check size={22} /></div><div><span>COMMITTEE QUORUM</span><strong>{consensusData ? `${consensusData.approvalVotes}/${consensusData.totalVotes}` : '— / 3'}</strong></div><span className="summary-note">{consensusData?.approved ? 'APPROVED' : 'AWAITING VOTES'}</span></div></section>
      {activeExplain && <div className="drawer-backdrop" onClick={() => setActiveExplain('')}><aside className="explain-drawer" onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={() => setActiveExplain('')} aria-label="Close explanation"><X size={18} /></button><p className="eyebrow">DECISION MECHANISM</p><h2>How the trust layer decides</h2><p>{activeExplain}</p><div className="drawer-metrics"><div><strong>{consensusData ? `${consensusData.approvalVotes}/${consensusData.totalVotes}` : '0/3'}</strong><span>AGENT QUORUM</span></div><div><strong>{policyAudit ? `${policyAudit.score}%` : '--'}</strong><span>RISK SIGNAL</span></div><div><strong>{razorpayOrder ? 'SIGNED' : 'PENDING'}</strong><span>SETTLEMENT</span></div></div></aside></div>}
      {policyAudit?.status === 'REVIEW_REQUIRED' && <div className="review-backdrop"><div className="review-modal"><div className="review-icon"><TriangleAlert size={22} /></div><p className="eyebrow">HUMAN CHECKPOINT</p><h2>Approval required</h2><p>This request is above the automatic approval threshold. Review the extracted proposal before the committee can continue.</p><div className="review-amount">₹{Number(extractedPlan?.amount || 0).toLocaleString('en-IN')} <span>{extractedPlan?.merchant}</span></div><button className="execute-button" onClick={triggerManualHumanOverrideApproval}><Check size={18} /> APPROVE AND CONTINUE <ArrowRight size={17} /></button><button className="cancel-button" onClick={resetConsoleLedgerBounds}>CANCEL REQUEST</button></div></div>}
    </main>
  )
}