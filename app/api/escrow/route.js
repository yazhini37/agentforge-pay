import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import OpenAI from 'openai';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://azure.com',
});

const processedRequests = globalThis.processedRequests || (globalThis.processedRequests = new Set());
const policyProfiles = {
  shopping_agent: {
    perTransactionLimit: 5000,
    allowedCategories: ['saas', 'electronics', 'utilities'],
  },
};

function createVerificationHash(value) {
  return crypto
    .createHash('sha256')
    .update(`${JSON.stringify(value)}:${crypto.randomUUID()}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

function createTransactionId() {
  return `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function normalizeCategory(category) {
  const value = String(category || '').toLowerCase().trim();
  if (value.includes('software') || value.includes('subscription') || value.includes('saas')) return 'saas';
  if (value.includes('electronic') || value.includes('device') || value.includes('hardware')) return 'electronics';
  if (value.includes('utility') || value.includes('utilities')) return 'utilities';
  return value || 'unknown';
}

function parseAmount(rawPrompt) {
  const amountMatch = String(rawPrompt || '').match(/(?:₹|inr\s*)?([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return 0;
  return Number(amountMatch[1].replace(/,/g, ''));
}

function fallbackProposal(rawPrompt) {
  const amount = parseAmount(rawPrompt) || 3000;
  return {
    intent: 'Purchase software subscription',
    category: 'saas',
    amount,
    merchant: 'Unspecified software merchant',
    riskFactor: amount > 5000 ? 'HIGH' : amount > 2500 ? 'MEDIUM' : 'LOW',
  };
}

function sanitizeProposal(proposal, rawPrompt) {
  const fallback = fallbackProposal(rawPrompt);
  const amount = Number(proposal?.amount);
  const riskFactor = String(proposal?.riskFactor || fallback.riskFactor).toUpperCase();
  return {
    intent: String(proposal?.intent || fallback.intent),
    category: normalizeCategory(proposal?.category || fallback.category),
    amount: Number.isFinite(amount) && amount >= 0 ? amount : fallback.amount,
    merchant: String(proposal?.merchant || fallback.merchant),
    riskFactor: ['LOW', 'MEDIUM', 'HIGH'].includes(riskFactor) ? riskFactor : fallback.riskFactor,
  };
}

function evaluatePolicy(proposal, profile) {
  const categoryAllowed = profile.allowedCategories.includes(proposal.category);
  let state = 'PASSED';
  let reason = 'Proposal is within the shopping agent policy profile.';

  if (!categoryAllowed) {
    state = 'BLOCKED';
    reason = `Category ${proposal.category} is not allowed by the shopping agent profile.`;
  } else if (proposal.amount > profile.perTransactionLimit) {
    state = 'REVIEW_REQUIRED';
    reason = `Amount exceeds the automatic limit of INR ${profile.perTransactionLimit}.`;
  }

  return {
    state,
    reason,
    categoryAllowed,
    perTransactionLimit: profile.perTransactionLimit,
    allowedCategories: profile.allowedCategories,
    verificationHash: createVerificationHash({ proposal, state, reason }),
  };
}

function makeAgentVote(agent, proposal, policyAudit) {
  const rejected = policyAudit.state === 'BLOCKED' || proposal.riskFactor === 'HIGH';
  let vote = rejected ? 'REJECT' : 'APPROVE';
  let reasoning = 'Independent metric check passed.';

  if (agent === 'Intent Agent') {
    reasoning = proposal.intent ? 'Intent is structured and actionable.' : 'Intent could not be established.';
    if (!proposal.intent) vote = 'REJECT';
  }
  if (agent === 'Risk Agent') {
    reasoning = proposal.riskFactor === 'HIGH' ? 'Risk factor is above the approval threshold.' : 'Risk factor is within tolerance.';
  }
  if (agent === 'Finance Agent') {
    reasoning = proposal.amount <= policyAudit.perTransactionLimit ? 'Amount is within the configured transaction limit.' : 'Amount requires additional financial review.';
  }

  return {
    agent,
    vote,
    reasoning,
    metrics: {
      amount: proposal.amount,
      category: proposal.category,
      riskFactor: proposal.riskFactor,
      policyState: policyAudit.state,
    },
    verificationHash: createVerificationHash({ agent, vote, proposal, policyAudit }),
  };
}

function jsonResponse(payload, status = 200) {
  return NextResponse.json({ ...payload, generatedAt: new Date().toISOString() }, { status });
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch (error) {
    return jsonResponse({ success: false, error: 'Request body must be valid JSON.' }, 400);
  }

  const {
    action,
    transactionId,
    rawPrompt,
    mode = 'SIMULATION',
    proposal: submittedProposal,
    policyProfile = 'shopping_agent',
  } = body || {};
  const profile = policyProfiles[policyProfile] || policyProfiles.shopping_agent;

  if (!action) {
    return jsonResponse({ success: false, error: 'The action field is required.' }, 400);
  }

  const requestTransactionId = transactionId || createTransactionId();
  const requestKey = `${action}:${requestTransactionId}`;
  if (processedRequests.has(requestKey)) {
    return jsonResponse({
      success: false,
      error: 'Duplicate execution prevention block: this transaction stage was already processed.',
      transactionId: requestTransactionId,
    }, 400);
  }
  processedRequests.add(requestKey);

  try {
    if (action === 'PLAN') {
      let proposal;
      let plannerSource = 'OPENAI';

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a transaction planner. Analyze the natural language purchase prompt. Return only a JSON object with intent, category, amount, merchant, and riskFactor. category must be saas, electronics, or utilities when applicable. riskFactor must be LOW, MEDIUM, or HIGH. amount must be a number in INR.',
            },
            { role: 'user', content: String(rawPrompt || '') },
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
        });
        proposal = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
      } catch (error) {
        plannerSource = 'LOCAL_FALLBACK';
        proposal = fallbackProposal(rawPrompt);
      }

      const sanitizedProposal = sanitizeProposal(proposal, rawPrompt);
      const policyAudit = evaluatePolicy(sanitizedProposal, profile);
      return jsonResponse({
        success: true,
        action: 'PLAN',
        transactionId: requestTransactionId,
        proposal: sanitizedProposal,
        extractedPlan: sanitizedProposal,
        policyAudit,
        state: policyAudit.state,
        plannerSource,
        verificationHash: createVerificationHash({ requestTransactionId, sanitizedProposal, policyAudit }),
      });
    }

    if (action === 'CONSENSUS') {
      const proposal = sanitizeProposal(submittedProposal, rawPrompt);
      const policyAudit = evaluatePolicy(proposal, profile);
      const votes = ['Intent Agent', 'Risk Agent', 'Finance Agent'].map((agent) => makeAgentVote(agent, proposal, policyAudit));
      const approvalVotes = votes.filter((vote) => vote.vote === 'APPROVE').length;
      const rejectionVotes = votes.length - approvalVotes;
      const approved = approvalVotes >= 2 && policyAudit.state !== 'BLOCKED' && proposal.riskFactor !== 'HIGH';
      const consensus = {
        approved,
        approvalVotes,
        rejectionVotes,
        totalVotes: votes.length,
        majorityScore: `${Math.round((Math.max(approvalVotes, rejectionVotes) / votes.length) * 100)}%`,
        votes,
        verificationHash: createVerificationHash({ proposal, policyAudit, votes, approved }),
      };

      return jsonResponse({
        success: true,
        action: 'CONSENSUS',
        transactionId: requestTransactionId,
        consensus,
        policyAudit,
        state: approved ? 'CONSENSUS_APPROVED' : 'CONSENSUS_REJECTED',
      });
    }

    if (action === 'EXECUTE' || action === 'SETTLE') {
      const proposal = sanitizeProposal(submittedProposal, rawPrompt);
      const policyAudit = evaluatePolicy(proposal, profile);
      if (policyAudit.state === 'BLOCKED') {
        return jsonResponse({ success: false, action, transactionId: requestTransactionId, state: 'BLOCKED', policyAudit }, 403);
      }

      if (mode !== 'LIVE') {
        const mockReference = `sim_${requestTransactionId}_${crypto.randomBytes(3).toString('hex')}`;
        return jsonResponse({
          success: true,
          action,
          mode: 'SIMULATION',
          transactionId: requestTransactionId,
          state: 'COMPLETED',
          order: { id: mockReference, amount: proposal.amount, currency: 'INR', source: 'SIMULATION_LEDGER' },
          confirmedReferenceToken: mockReference,
          verificationHash: createVerificationHash({ proposal, mockReference }),
        });
      }

      const amountInPaisa = Math.round(proposal.amount * 100);
      if (!Number.isSafeInteger(amountInPaisa) || amountInPaisa <= 0) {
        return jsonResponse({ success: false, action, state: 'INVALID_AMOUNT', error: 'Validated amount must be a positive safe integer in INR.' }, 400);
      }

      try {
        const order = await razorpay.orders.create({ amount: amountInPaisa, currency: 'INR', receipt: requestTransactionId.slice(0, 40), notes: { policyProfile, category: proposal.category } });
        return jsonResponse({
          success: true,
          action,
          mode: 'LIVE',
          transactionId: requestTransactionId,
          state: 'COMPLETED',
          order,
          confirmedReferenceToken: order.id,
          verificationHash: createVerificationHash({ proposal, orderId: order.id }),
        });
      } catch (error) {
        return jsonResponse({ success: false, action, transactionId: requestTransactionId, state: 'SETTLEMENT_FAILED', error: 'Razorpay order creation failed.' }, 502);
      }
    }

    return jsonResponse({ success: false, error: 'Unsupported action. Use PLAN, CONSENSUS, EXECUTE, or SETTLE.' }, 400);
  } catch (error) {
    return jsonResponse({ success: false, transactionId: requestTransactionId, error: 'Escrow handler failed while processing the transaction.' }, 500);
  }
}
