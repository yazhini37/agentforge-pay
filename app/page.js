'use client';
import { useState, useEffect } from 'react';
import { Play, RotateCcw, ShieldCheck, Activity, Database, CheckCircle2, XCircle } from 'lucide-react';

export default function AgentForgePay() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState([]);
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState(1500);
  const [requirements, setRequirements] = useState("Write a clean JavaScript function to validate corporate email formats.");
  const [codePayload, setCodePayload] = useState(`function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim().toLowerCase());
}`);
  const [escrowVpa, setEscrowVpa] = useState('');
  const [payoutStatus, setPayoutStatus] = useState('IDLE');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const generateCryptoHash = () => {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 8; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  };

  const addLog = (agent, message, status) => {
    const cryptoHash = generateCryptoHash();
    setLogs((prev) => [...prev, {
      time: new Date().toLocaleTimeString(),
      agent,
      message,
      status,
      cryptoHash
    }]);
  };

  const getCodeSnippetAndBudget = (keywords) => {
    const lower = keywords.toLowerCase();

    if (lower.includes('python') || lower.includes('scraper') || lower.includes('soup') || lower.includes('crawl') || lower.includes('web')) {
      const snippet = `import requests
from bs4 import BeautifulSoup

def web_scraper(url):
    """Advanced web scraping with BeautifulSoup"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    data = []
    for item in soup.find_all('div', class_='item'):
        title = item.find('h2').text
        price = item.find('span', class_='price').text
        data.append({'title': title, 'price': price})
    
    return data

results = web_scraper('https://example.com')
for item in results:
    print(f"Title: {item['title']}, Price: {item['price']}")`;
      return { snippet, budgetAmount: 1800 };
    }

    if (lower.includes('defi') || lower.includes('yield') || lower.includes('calculator') || lower.includes('interest') || lower.includes('apr')) {
      const snippet = `function calculateDeFiYield(principal, aprPercentage, compoundFrequency) {
  /**
   * Calculate compound yield for DeFi investments
   * @param principal - Initial investment amount
   * @param aprPercentage - Annual percentage rate
   * @param compoundFrequency - Times per year (12 for monthly, 365 for daily)
   */
  const rate = aprPercentage / 100 / compoundFrequency;
  const years = 1;
  const periods = compoundFrequency * years;
  const futureValue = principal * Math.pow(1 + rate, periods);
  const yield_ = futureValue - principal;
  
  return {
    futureValue: futureValue.toFixed(2),
    yieldAmount: yield_.toFixed(2),
    percentageGain: ((yield_ / principal) * 100).toFixed(2)
  };
}

const result = calculateDeFiYield(10000, 15.5, 365);
console.log("DeFi Yield Calculation:", result);`;
      return { snippet, budgetAmount: 1650 };
    }

    if (lower.includes('auth') || lower.includes('login') || lower.includes('jwt') || lower.includes('token') || lower.includes('secure')) {
      const snippet = `import jwt from 'jsonwebtoken';

function verifyJWTMiddleware(token, secretKey) {
  /**
   * JWT verification middleware for secure authentication
   */
  try {
    const decoded = jwt.verify(token, secretKey);
    return {
      valid: true,
      payload: decoded,
      message: 'Token verification successful'
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      message: 'Invalid or expired token'
    };
  }
}

function generateJWT(payload, secretKey, expiresIn = '24h') {
  const token = jwt.sign(payload, secretKey, { expiresIn });
  return token;
}

const token = generateJWT({ userId: 123, role: 'admin' }, 'your-secret-key');
const verification = verifyJWTMiddleware(token, 'your-secret-key');
console.log("JWT Verification Result:", verification);`;
      return { snippet, budgetAmount: 1900 };
    }

    if (lower.includes('db') || lower.includes('sql') || lower.includes('query') || lower.includes('postgres') || lower.includes('database')) {
      const snippet = `const { Client } = require('pg');

async function queryDatabase() {
  const client = new Client({
    user: 'postgres',
    password: 'password',
    host: 'localhost',
    port: 5432,
    database: 'agentforge_db'
  });

  try {
    await client.connect();
    
    const result = await client.query(
      'SELECT id, name, email, created_at FROM users WHERE status = $1 ORDER BY created_at DESC LIMIT 100',
      ['active']
    );

    const insertResult = await client.query(
      'INSERT INTO audit_logs (action, timestamp) VALUES ($1, NOW()) RETURNING *',
      ['query_executed']
    );

    return {
      users: result.rows,
      logEntry: insertResult.rows[0]
    };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

queryDatabase().then(data => console.log('Query Result:', data));`;
      return { snippet, budgetAmount: 2200 };
    }

    if (lower.includes('api') || lower.includes('fetch') || lower.includes('axios') || lower.includes('get') || lower.includes('post')) {
      const snippet = `async function fetchDataHandler() {
  /**
   * Asynchronous API request handler with error management
   */
  try {
    const response = await fetch('https://api.example.com/data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token_xyz'
      }
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

async function postDataHandler(payload) {
  const response = await fetch('https://api.example.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await response.json();
}

fetchDataHandler().then(result => console.log('Data:', result));`;
      return { snippet, budgetAmount: 1600 };
    }

    const defaultSnippet = `function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim().toLowerCase());
}`;
    return { snippet: defaultSnippet, budgetAmount: 1500 };
  };

  const handleRequirementsChange = (value) => {
    setRequirements(value);
    const { snippet, budgetAmount } = getCodeSnippetAndBudget(value);
    setCodePayload(snippet);
    setBudget(budgetAmount);
  };

  const startAgenticWorkflow = async () => {
    setLogs([]);
    setStep(1);
    setPayoutStatus('PROCESSING');
    addLog("SYSTEM", "Initializing Multi-Agent Framework core sequence...", "INFO");
    addLog("ORCHESTRATOR", `Task initialized. Adaptive pricing budget set to INR ${budget}.00 based on task complexity.`, "INFO");

    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'INIT', taskId: 'TASK-892', budget })
      });
      const data = await res.json();
      
      if (!res.ok) {
        addLog("GUARDRAIL", data.log, "ERROR");
        setPayoutStatus('POLICY_BREACH');
        setStep(0);
        return;
      }

      addLog("RAZORPAY_ENGINE", data.log, "SUCCESS");
      setEscrowVpa(data.vpa);
      setPayoutStatus('ESCROW_LOCKED');
      setStep(2);
      addLog("DEV_AGENT", "Assembling technical solution payload according to specifications...", "INFO");
    } catch (error) {
      addLog("SYSTEM_ERROR", `Workflow initialization failed: ${error.message}`, "ERROR");
      setPayoutStatus('IDLE');
      setStep(0);
    }
  };

  const submitAndVerify = async () => {
    addLog("SYSTEM", "Developer agent submitted build artifact to pipeline.", "INFO");
    addLog("QA_EVALUATOR", "Initiating Multi-Agent consensus compliance audit chain...", "INFO");

    const codePayloadLower = codePayload.toLowerCase();
    const hasMaliciousTrigger = codePayloadLower.includes('malicious_trigger') || codePayloadLower.includes('crash');

    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'VERIFY', 
          taskId: 'TASK-892', 
          budget, 
          taskRequirements: requirements,
          submittedWork: codePayload, 
          subAgent: 'OmegaBot' 
        })
      });
      const data = await res.json();

      if (hasMaliciousTrigger && data.decision === 'APPROVED_THEN_REVERSED') {
        addLog("QA_EVALUATOR", `Multi-Signature Consensus: 3 agents reviewed code - APPROVED by majority vote. [HASH: ${generateCryptoHash()}]`, "SUCCESS");
        addLog("RAZORPAYX_ENGINE", `Payout dispatched: INR ${budget} transferred to OmegaBot. Status: PAID. [HASH: ${generateCryptoHash()}]`, "SUCCESS");
        setPayoutStatus('FUNDS_DISPATCHED');
        setStep(3);

        setTimeout(() => {
          addLog("SECURITY_AUDITOR_BOT", `CRITICAL_POST_PAYOUT_BREACH: Malicious code injection detected. MALICIOUS_TRIGGER/CRASH payload identified. [HASH: ${generateCryptoHash()}]`, "ERROR");
          addLog("COMPLIANCE_ENGINE", `Automatic chargeback protocol activated. Initiating clawback operation... [HASH: ${generateCryptoHash()}]`, "INFO");
          addLog("RAZORPAYX_REVERSAL", `Automated chargeback executed. Full amount INR ${budget} clawed back from agent routing node OmegaBot. Funds redeposited to Smart Collect escrow. Reversal Status: PROCESSED. [HASH: ${generateCryptoHash()}]`, "INFO");
          setPayoutStatus('REVERSED_CHARGEBACK');
        }, 2000);
      } else if (data.decision === 'APPROVED') {
        if (data.consensus && data.consensus.votes) {
          data.consensus.votes.forEach((vote) => {
            const voteMessage = `${vote.agent}: ${vote.vote} - ${vote.reasoning} [HASH: ${generateCryptoHash()}]`;
            const status = vote.vote === 'APPROVED' ? 'SUCCESS' : 'ERROR';
            addLog("MULTI_AGENT_CONSENSUS", voteMessage, status);
          });
        }

        addLog("QA_EVALUATOR", `${data.log} [HASH: ${generateCryptoHash()}]`, "SUCCESS");
        if (data.payoutLog) {
          addLog("RAZORPAYX_ENGINE", `${data.payoutLog} [HASH: ${generateCryptoHash()}]`, "SUCCESS");
        }
        setPayoutStatus('FUNDS_DISPATCHED');
        setStep(3);
      } else {
        addLog("QA_EVALUATOR", `${data.log} [HASH: ${generateCryptoHash()}]`, "ERROR");
        if (data.consensus && data.consensus.votes) {
          data.consensus.votes.forEach((vote) => {
            const voteMessage = `${vote.agent}: ${vote.vote} - ${vote.reasoning} [HASH: ${generateCryptoHash()}]`;
            const status = vote.vote === 'APPROVED' ? 'SUCCESS' : 'ERROR';
            addLog("MULTI_AGENT_CONSENSUS", voteMessage, status);
          });
        }
        setPayoutStatus('ESCROW_FROZEN');
        setStep(0);
      }
    } catch (error) {
      addLog("SYSTEM_ERROR", `Verification process failed: ${error.message} [HASH: ${generateCryptoHash()}]`, "ERROR");
      setPayoutStatus('ESCROW_FROZEN');
    }
  };

  const resetPipeline = () => {
    setLogs([]);
    setStep(0);
    setPayoutStatus('IDLE');
    setEscrowVpa('');
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ERROR':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'INFO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'ERROR':
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getPayoutStatusColor = (status) => {
    switch (status) {
      case 'FUNDS_DISPATCHED':
        return 'bg-emerald-500';
      case 'REVERSED_CHARGEBACK':
        return 'bg-orange-500';
      case 'ESCROW_LOCKED':
        return 'bg-amber-500';
      case 'POLICY_BREACH':
      case 'ESCROW_FROZEN':
        return 'bg-rose-500';
      case 'PROCESSING':
        return 'bg-slate-400';
      default:
        return 'bg-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded tracking-wide">CORE v6.0</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">AgentForge Payment Gateway</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">Immutable Ledger UI & Multi-Agent Consensus Console</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <button 
            onClick={resetPipeline} 
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-sm px-4 py-2 rounded flex items-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" /> Reset Console
          </button>
          <button 
            onClick={startAgenticWorkflow} 
            disabled={step > 0} 
            className={`font-semibold text-sm px-5 py-2 rounded flex items-center gap-2 transition shadow-sm ${step > 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
          >
            <Play className="w-4 h-4" /> Initialize Agent Pipeline
          </button>
        </div>
      </div>

      <div suppressHydrationWarning className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Database className="w-4 h-4 text-slate-500" /> Pipeline Parameters
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Adaptive Pricing Budget Allocation (INR)</label>
                <input 
                  type="number" 
                  value={budget} 
                  disabled={step > 0} 
                  onChange={(e) => setBudget(Number(e.target.value))} 
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 font-bold"
                />
                <p className="text-xs text-slate-400 mt-1.5">Dynamic pricing: Web=₹1800 | DeFi=₹1650 | Auth=₹1900 | DB=₹2200 | API=₹1600 | Default=₹1500</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Task Specifications (Adaptive Pricing Trigger)</label>
                <textarea 
                  value={requirements} 
                  disabled={step > 0} 
                  onChange={(e) => handleRequirementsChange(e.target.value)} 
                  className="w-full h-20 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 resize-none"
                  placeholder="Type: python/web, defi/yield, auth/jwt, db/sql, or api/fetch to trigger adaptive pricing and code generation..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex-1 flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-slate-500" /> Adaptively Priced Code Artifact
            </h2>
            <p className="text-xs text-slate-400 mb-3">Auto-generated code and budget adjusted by Adaptive Pricing Engine based on task type.</p>
            <textarea 
              value={codePayload} 
              onChange={(e) => setCodePayload(e.target.value)} 
              className="w-full flex-1 min-h-[220px] bg-slate-900 border border-slate-950 rounded p-4 font-mono text-xs text-emerald-400 focus:outline-none leading-relaxed"
            />
            {step === 2 && (
              <button 
                onClick={submitAndVerify} 
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 rounded transition shadow-sm"
              >
                Submit Artifact to Multi-Agent Audit
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-r border-slate-100 pr-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Escrow Ledger Status</div>
              <div className="text-base font-mono font-bold mt-1.5 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${getPayoutStatusColor(payoutStatus)}`}></span>
                <span className="tracking-tight">{payoutStatus}</span>
              </div>
            </div>
            <div className="pl-0 md:pl-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Virtual Settlement Node</div>
              <div className="text-sm font-mono text-slate-700 mt-2 font-semibold break-all">
                {escrowVpa ? escrowVpa : <span className="text-slate-300 italic">No Active Session</span>}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col flex-1 min-h-[400px]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" /> Immutable Ledger Audit Stream
              </span>
              <span className="text-xs text-slate-400 font-mono">Row Count: {logs.length}</span>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold font-mono">
                    <th className="py-2.5 px-4 w-24">Timestamp</th>
                    <th className="py-2.5 px-4 w-40">Subsystem Component</th>
                    <th className="py-2.5 px-4">Log Execution Message</th>
                    <th className="py-2.5 px-4 w-28 text-center">Crypto Signature</th>
                    <th className="py-2.5 px-4 w-20 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 italic">No operations logged. Awaiting agent lifecycle initiation.</td>
                    </tr>
                  ) : (
                    logs.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 text-slate-400">{log.time}</td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">{log.agent}</td>
                        <td className="py-3 px-4 text-slate-700 break-words">{log.message}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-300 text-[10px] font-bold font-mono tracking-widest">
                            {log.cryptoHash}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeColor(log.status)}`}>
                            {getStatusIcon(log.status)}
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
