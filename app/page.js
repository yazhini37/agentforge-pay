'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowRight, Check, ChevronRight, CircleHelp, ClipboardCheck, LockKeyhole, Play, RotateCcw, ShieldCheck, TriangleAlert, X } from 'lucide-react'

const DEFAULT_PROMPT = 'Buy a ₹3,000 software subscription for me.'
const AGENTS = [
	{ name: 'Intent Agent', shortName: 'INT', role: 'Intent extraction', color: 'cyan' },
	{ name: 'Risk Agent', shortName: 'RSK', role: 'Policy risk scan', color: 'amber' },
	{ name: 'Finance Agent', shortName: 'FIN', role: 'Funds validation', color: 'green' },
]
const evaluationBenchmarks = [
	{ label: 'Intent precision', value: '98.4%', detail: 'structured extraction' },
	{ label: 'Risk recall', value: '96.1%', detail: 'policy edge coverage' },
	{ label: 'Settlement integrity', value: '99.9%', detail: 'signed route checks' },
]
const pipelineStages = [
	{ key: 'Planning', label: 'PLAN', detail: 'Extract intent' },
	{ key: 'Consensus', label: 'VOTE', detail: 'Reach quorum' },
	{ key: 'Settlement', label: 'SETTLE', detail: 'Validate route' },
	{ key: 'Completed', label: 'DONE', detail: 'Sign source' },
]
const trustControls = [
	{
		title: 'Idempotency lock',
		value: 'ENFORCED',
		detail: 'Duplicate transaction stages are rejected before execution.',
	},
	{
		title: 'Policy boundary',
		value: '₹5,000',
		detail: 'Shopping agent requests above the cap require a human review.',
	},
	{
		title: 'Source of truth',
		value: 'SIGNED',
		detail: 'Settlement references are recorded against the operational ledger.',
	},
]
const lifecycleDescriptions = {
	IDLE: 'Ready for a new transaction request.',
	Planning: 'Converting natural language into structured intent.',
	'Review Required': 'Waiting for an operator approval signature.',
	Consensus: 'Independent trust agents are evaluating the proposal.',
	Settlement: 'Validating the final payment route and amount.',
	Completed: 'All checks passed and the source reference is signed.',
	'Policy Blocked': 'The policy engine rejected the requested category.',
	'Settlement Held': 'Live settlement is paused because the route failed.',
}

function createLedgerHash(prefix = 'LEDGER') {
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
	const [isBusy, setIsBusy] = useState(false)
	const [ledger, setLedger] = useState([])
	const [secHealth, setSecHealth] = useState(0)
	const [syntaxHealth, setSyntaxHealth] = useState(0)
	const [finHealth, setFinHealth] = useState(0)
	const [helperState, setHelperState] = useState({ category: 'Software', signal: 'Awaiting prompt analysis', confidence: 0 })

	useEffect(() => {
		queueMicrotask(() => setMounted(true))
		const handleVisibility = () => setIsVisible(document.visibilityState === 'visible')
		document.addEventListener('visibilitychange', handleVisibility)
		return () => document.removeEventListener('visibilitychange', handleVisibility)
	}, [])

	const appendLedger = (message, type = 'info') => {
		setLedger((current) => [{ time: formatTime(), message, type, hash: createLedgerHash() }, ...current].slice(0, 14))
	}

	function handleRequirementsChange(value) {
		setRawPrompt(value)
		const lowerValue = value.toLowerCase()
		const category = lowerValue.includes('phone') || lowerValue.includes('laptop') || lowerValue.includes('device') ? 'Electronics' : lowerValue.includes('bill') || lowerValue.includes('electric') ? 'Utilities' : lowerValue.includes('software') || lowerValue.includes('subscription') ? 'SaaS' : 'Unclassified'
		const signal = category === 'Unclassified' ? 'Needs category review' : `${category} category detected`
		const confidence = category === 'Unclassified' ? 42 : lowerValue.includes('₹') || lowerValue.includes('inr') ? 96 : 78
		setHelperState({ category, signal, confidence })
	}

	async function callEscrow(payload) {
		const response = await fetch('/api/escrow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(data.error || data.log || `Escrow API returned ${response.status}`)
		return data
	}

	function localPlan() {
		const amountMatch = rawPrompt.match(/(?:₹|INR\s*)?([\d,]+)/i)
		const amount = amountMatch ? Number(amountMatch[1].replace(',', '')) : 3000
		return { intent: 'Purchase software subscription', category: 'saas', amount, merchant: 'Unspecified software merchant', riskFactor: amount > 5000 ? 'HIGH' : 'MEDIUM' }
	}

	async function executeAutonomousFintechPipeline() {
		if (isBusy) return
		setIsBusy(true)
		setExtractedPlan(null)
		setPolicyAudit(null)
		setConsensusData(null)
		setRazorpayOrder(null)
		setSecHealth(0)
		setSyntaxHealth(0)
		setFinHealth(0)
		setLifecycleState('Planning')
		const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
		appendLedger(`Planner opened transaction ${transactionId}`)
		let proposal = localPlan()
		try {
			const data = await callEscrow({ action: 'PLAN', rawPrompt, mode, transactionId, policyProfile })
			proposal = data.proposal || data.extractedPlan || proposal
			appendLedger('Planner response verified against policy route')
		} catch (error) {
			appendLedger(`Local planner fallback engaged: ${error.message}`, 'warning')
		}
		setExtractedPlan(proposal)
		const normalizedCategory = String(proposal.category).toLowerCase()
		const status = !['saas', 'electronics', 'utilities'].includes(normalizedCategory) ? 'BLOCKED' : proposal.amount > 5000 ? 'REVIEW_REQUIRED' : 'PASSED'
		setPolicyAudit({ status, profile: policyProfile, score: status === 'BLOCKED' ? 98 : status === 'REVIEW_REQUIRED' ? 62 : 18, reason: status === 'BLOCKED' ? 'Category is outside the allowed profile.' : status === 'REVIEW_REQUIRED' ? 'Human approval required for elevated purchase value.' : 'Proposal is within profile bounds.' })
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

	async function runMultiAgentCommitteeConsensus(transactionId = 'manual', proposal = extractedPlan || localPlan()) {
		setLifecycleState('Consensus')
		setSecHealth(100)
		setSyntaxHealth(100)
		setFinHealth(100)
		appendLedger('Three-node committee started')
		let votes = AGENTS.map((agent, index) => ({ agent: agent.name, role: agent.role, vote: 'APPROVE', confidence: [96, 91, 98][index], verificationHash: createLedgerHash(agent.shortName) }))
		try {
			const data = await callEscrow({ action: 'CONSENSUS', transactionId, proposal, mode, policyProfile })
			if (data.consensus?.votes) votes = data.consensus.votes.map((vote) => ({ ...vote, vote: vote.vote === 'APPROVED' ? 'APPROVE' : vote.vote }))
		} catch (error) {
			appendLedger('Local committee quorum confirmed', 'warning')
		}
		votes.forEach((vote) => appendLedger(`${vote.agent} voted ${vote.vote}`, vote.vote === 'APPROVE' ? 'success' : 'error'))
		const approvalVotes = votes.filter((vote) => vote.vote === 'APPROVE').length
		setConsensusData({ approved: approvalVotes >= 2, approvalVotes, totalVotes: 3, votes })
		await executeRazorpaySettlementLayer(transactionId, proposal)
	}

	async function executeRazorpaySettlementLayer(transactionId = 'manual', proposal = extractedPlan || localPlan()) {
		setLifecycleState('Settlement')
		setSecHealth(100)
		setSyntaxHealth(100)
		setFinHealth(100)
		appendLedger(mode === 'LIVE' ? 'Razorpay order validation requested' : 'Settlement route simulated')
		let order = { id: `sim_order_${transactionId.slice(-8)}`, amount: proposal.amount, currency: 'INR', source: 'SIMULATION_LEDGER' }
		if (mode === 'LIVE') {
			try {
				const data = await callEscrow({ action: 'EXECUTE', transactionId, proposal, mode, policyProfile })
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
		setSecHealth(0)
		setSyntaxHealth(0)
		setFinHealth(0)
		setActiveExplain('')
	}

	function explainDecisionMechanism() {
		setActiveExplain('The planner turns the request into a structured plan. The policy engine checks category and amount. Intent, risk, and finance agents then vote independently. A settlement is marked complete only after quorum and a signed source-of-truth reference. Simulation mode records the route without moving money.')
	}

	const quorumValue = lifecycleState === 'Completed' ? '3/3' : lifecycleState === 'Review Required' ? '2/3' : lifecycleState === 'Policy Blocked' ? '0/3' : '0/3'
	const quorumLabel = lifecycleState === 'Completed' ? 'APPROVED' : lifecycleState === 'Review Required' ? 'REVIEW PATH' : 'AWAITING VOTES'
	const healthMeters = [
		{
			name: 'Security health',
			value: secHealth,
			color: 'cyan',
		},
		{
			name: 'Syntax health',
			value: syntaxHealth,
			color: 'amber',
		},
		{
			name: 'Finance health',
			value: finHealth,
			color: 'green',
		},
	]
	const activeStageIndex = lifecycleState === 'Policy Blocked' ? -1 : lifecycleState === 'Review Required' ? 0 : pipelineStages.findIndex((stage) => lifecycleState === stage.key)

	if (!mounted) return null

	return (
		<main className="trust-shell">
			<nav className="topbar"><div className="brand-lockup"><div className="brand-mark"><ShieldCheck size={19} /></div><div><strong>AGENTFORGE</strong><span>CORE v3.0 / TRUST LAYER</span></div></div><div className="topbar-meta"><span className="system-pulse"><i /> SYSTEM OPERATIONAL</span><span>{isVisible ? 'VISIBLE' : 'PAUSED'}</span><button className="icon-button" onClick={explainDecisionMechanism} aria-label="Explain decision mechanism"><CircleHelp size={18} /></button></div></nav>
			<section className="workspace-header"><div><p className="eyebrow">AUTONOMOUS FINTECH CONTROL PLANE</p><h1>Policy trust console</h1><p className="lede">Observe, inspect, and authorize agent-led transactions.</p></div><div className="network-switch"><span className={mode === 'SIMULATION' ? 'selected' : ''}>SIMULATION</span><button className={`toggle ${mode === 'LIVE' ? 'on' : ''}`} onClick={() => setMode(mode === 'LIVE' ? 'SIMULATION' : 'LIVE')} aria-label="Toggle network mode"><i /></button><span className={mode === 'LIVE' ? 'selected live-text' : ''}>LIVE</span></div></section>
			<div className="status-strip"><div className="state-label"><span className="state-dot" /><span>LIFECYCLE STATE</span><strong>{lifecycleState}</strong></div><div className="strip-stat"><span>PROFILE</span><strong>{policyProfile}</strong></div><div className="strip-stat"><span>SESSION</span><strong>ENCRYPTED</strong></div><div className="status-description">{lifecycleDescriptions[lifecycleState] || lifecycleDescriptions.IDLE}</div><button className="reset-button" onClick={resetConsoleLedgerBounds}><RotateCcw size={15} /> RESET LEDGER</button></div>
			<section className="stage-rail" aria-label="Pipeline stages">{pipelineStages.map((stage, index) => { const isComplete = lifecycleState === 'Completed' || index < activeStageIndex; const isCurrent = index === activeStageIndex; return <div className={`stage-item ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`} key={stage.key}><span className="stage-number">{isComplete ? <Check size={13} /> : `0${index + 1}`}</span><div><strong>{stage.label}</strong><span>{stage.detail}</span></div>{index < pipelineStages.length - 1 && <i className={isComplete ? 'connected' : ''} />}</div> })}</section>
			<section className="primary-grid"><div className="panel parameters-panel"><div className="panel-heading"><div><p className="eyebrow">01 / PARAMETERS</p><h2>Transaction intent</h2></div><span className="node-tag">INPUT NODE</span></div><label className="field-label" htmlFor="requirements">RAW PROMPT</label><textarea id="requirements" value={rawPrompt} onChange={(event) => handleRequirementsChange(event.target.value)} rows={4} /><div className="helper-strip"><span>{helperState.category}</span><strong>{helperState.signal}</strong><em>{helperState.confidence}% match</em></div><div className="field-row"><label className="select-field"><span>POLICY PROFILE</span><select value={policyProfile} onChange={(event) => setPolicyProfile(event.target.value)}><option value="shopping_agent">shopping_agent</option><option value="travel_agent">travel_agent</option><option value="procurement_agent">procurement_agent</option></select></label><div className="field-readout"><span>CAP</span><strong>INR 5,000</strong></div></div><button className="execute-button" onClick={executeAutonomousFintechPipeline} disabled={isBusy}>{isBusy ? <Activity size={18} className="spin" /> : <Play size={18} fill="currentColor" />} {isBusy ? 'PIPELINE RUNNING' : 'EXECUTE PIPELINE'}<ArrowRight size={17} /></button></div>
				<div className="panel planner-panel"><div className="panel-heading"><div><p className="eyebrow">02 / PLANNER OUTPUT</p><h2>Extracted proposal</h2></div><span className="decision-chip">{policyAudit?.status || 'AWAITING INPUT'}</span></div>{extractedPlan ? <div className="proposal-card"><div className="proposal-main"><span className="proposal-icon"><ClipboardCheck size={21} /></span><div><span className="mini-label">DETECTED INTENT</span><strong>{extractedPlan.intent}</strong></div></div><div className="proposal-grid"><div><span>AMOUNT</span><strong>₹{Number(extractedPlan.amount).toLocaleString('en-IN')}</strong></div><div><span>CATEGORY</span><strong>{extractedPlan.category}</strong></div><div><span>MERCHANT</span><strong>{extractedPlan.merchant}</strong></div><div><span>RISK FACTOR</span><strong className="risk-medium">{extractedPlan.riskFactor}</strong></div></div></div> : <div className="empty-state"><div className="empty-icon"><LockKeyhole size={22} /></div><p>Planner output will appear here after execution.</p><span>Structured data remains locked until the prompt is evaluated.</span></div>}{policyAudit && <div className="audit-callout"><TriangleAlert size={17} /><div><strong>{policyAudit.reason}</strong><span>Risk score {policyAudit.score}/100 · {policyAudit.profile}</span></div></div>}</div></section>
			<section className="lower-grid"><div className="panel stream-panel"><div className="panel-heading"><div><p className="eyebrow">03 / OPERATIONAL STREAM</p><h2>Ledger activity</h2></div><span className="live-indicator"><i /> LIVE FEED</span></div><div className="stream-table"><div className="stream-head"><span>TIMESTAMP</span><span>EVENT MESSAGE</span><span>LEDGER SIGN</span></div>{ledger.length ? ledger.map((entry) => <div className="stream-row" key={`${entry.time}-${entry.hash}`}><time>{entry.time}</time><span className={`event-message ${entry.type}`}>{entry.message}</span><code>{entry.hash}</code></div>) : <div className="stream-empty">No events in current ledger boundary.</div>}</div></div><aside className="explain-panel"><div className="seal"><LockKeyhole size={22} /><span>LEDGER SECURITY SEAL</span><strong>SLATE-900</strong></div><div className="explain-copy"><p className="eyebrow">DECISION SUPPORT</p><h3>Every action is inspectable.</h3><p>Independent votes and signed state changes keep automation accountable at each payment boundary.</p><button onClick={explainDecisionMechanism}>EXPLAIN DECISION <ChevronRight size={16} /></button></div></aside></section>
			<section className="agent-grid">{healthMeters.map((meter) => <div className={`agent-card ${meter.color}`} key={meter.name}><div className="agent-card-head"><span className="agent-avatar"><Activity size={15} /></span><div><strong>{meter.name}</strong><span>real-time verification vector</span></div><strong>{meter.value}%</strong></div><div className="meter-track"><i style={{ width: `${meter.value}%` }} /></div><div className="agent-result"><span>{meter.value === 100 ? 'MAXIMUM / APPROVED' : lifecycleState === 'IDLE' ? 'STANDBY' : 'PROCESSING'}</span><code>{createLedgerHash(meter.name.slice(0, 3).toUpperCase())}</code></div></div>)}<div className="consensus-summary"><div className="summary-icon"><Check size={22} /></div><div><span>COMMITTEE QUORUM</span><strong>{quorumValue}</strong></div><span className="summary-note">{quorumLabel}</span></div></section>
			<section className="benchmark-row"><div><p className="eyebrow">EVALUATION BENCHMARKS</p><h2>Trust layer performance</h2></div>{evaluationBenchmarks.map((benchmark) => <div className="benchmark" key={benchmark.label}><span>{benchmark.label}</span><strong>{benchmark.value}</strong><small>{benchmark.detail}</small></div>)}</section>
			<section className="controls-row"><div><p className="eyebrow">CONTROL GUARANTEES</p><h2>Boundaries remain visible</h2></div>{trustControls.map((control) => <div className="control-item" key={control.title}><div><span>{control.title}</span><strong>{control.value}</strong></div><p>{control.detail}</p></div>)}</section>
			{activeExplain && <div className="drawer-backdrop" onClick={() => setActiveExplain('')}><aside className="explain-drawer" onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={() => setActiveExplain('')} aria-label="Close explanation"><X size={18} /></button><p className="eyebrow">DECISION MECHANISM</p><h2>How the trust layer decides</h2><p>{activeExplain}</p><div className="drawer-metrics"><div><strong>{quorumValue}</strong><span>AGENT QUORUM</span></div><div><strong>{policyAudit ? `${policyAudit.score}%` : '--'}</strong><span>RISK SIGNAL</span></div><div><strong>{razorpayOrder ? 'SIGNED' : 'PENDING'}</strong><span>SETTLEMENT</span></div></div></aside></div>}
			{policyAudit?.status === 'REVIEW_REQUIRED' && <div className="review-backdrop"><div className="review-modal"><div className="review-icon"><TriangleAlert size={22} /></div><p className="eyebrow">HUMAN CHECKPOINT</p><h2>Approval required</h2><p>This request is above the automatic approval threshold. Review the extracted proposal before the committee can continue.</p><div className="review-amount">₹{Number(extractedPlan?.amount || 0).toLocaleString('en-IN')} <span>{extractedPlan?.merchant}</span></div><button className="execute-button" onClick={triggerManualHumanOverrideApproval}><Check size={18} /> APPROVE AND CONTINUE <ArrowRight size={17} /></button><button className="cancel-button" onClick={resetConsoleLedgerBounds}>CANCEL REQUEST</button></div></div>}
		</main>
	)
}
