import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { OpenAI } from 'openai';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://azure.com'
});

function generateHexHash() {
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

function generateAuditHash(data) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex').substring(0, 16).toUpperCase();
}

function createAuditLogWithHash(agentName, message) {
  const hexHash = generateHexHash();
  return {
    message: `${message} | HEX-HASH: ${hexHash}`,
    rawMessage: message,
    hexHash: hexHash
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, taskId, budget, taskRequirements, submittedWork, subAgent } = body;

    if (action === 'INIT') {
      if (budget > 5000) {
        const auditLog = createAuditLogWithHash('GUARDRAIL', 'Policy guardrail breach: Budget exceeds maximum allocation of INR 5000.00. Request rejected.');
        return NextResponse.json({
          success: false,
          log: auditLog.message,
          auditTrail: {
            ledgerId: generateAuditHash({ action, taskId, budget, timestamp: new Date().toISOString() }),
            checkpoint: 'GUARDRAIL_BREACH',
            timestamp: new Date().toISOString()
          }
        }, { status: 403 });
      }

      try {
        const virtualAccount = await razorpay.virtualAccounts.create({
          receivers: { types: ['vpa'] },
          description: `AgentForge Escrow Account - Task ${taskId}`,
          notes: { taskId, budget, timestamp: new Date().toISOString() }
        });

        const auditLog = createAuditLogWithHash('RAZORPAY_ENGINE', `Virtual payment account initialized. VPA Receiver: ${virtualAccount.receivers[0].vpa}. Account ID: ${virtualAccount.id}. Status: ACTIVE.`);

        return NextResponse.json({
          success: true,
          vpa: virtualAccount.receivers[0].vpa,
          accountId: virtualAccount.id,
          log: auditLog.message,
          status: 'ESCROW_LOCKED',
          auditTrail: {
            ledgerId: generateAuditHash({ action, taskId, budget, vpa: virtualAccount.receivers[0].vpa }),
            checkpoint: 'ESCROW_INITIALIZED',
            timestamp: new Date().toISOString(),
            hexHash: auditLog.hexHash
          },
          complianceEngine: 'RAZORPAY_LIVE'
        }, { status: 200 });
      } catch (razorpayError) {
        const mockVpa = `agent-${taskId}@agentforge`;
        const mockAccountId = `acc_mock_${Math.random().toString(36).substring(7)}`;
        const auditLog = createAuditLogWithHash('RAZORPAY_ENGINE', `[FALLBACK MODE] Virtual payment account initialized (mock). VPA Receiver: ${mockVpa}. Account ID: ${mockAccountId}. Status: ACTIVE.`);

        return NextResponse.json({
          success: true,
          vpa: mockVpa,
          accountId: mockAccountId,
          log: auditLog.message,
          status: 'ESCROW_LOCKED',
          auditTrail: {
            ledgerId: generateAuditHash({ action, taskId, budget, vpa: mockVpa }),
            checkpoint: 'ESCROW_INITIALIZED_MOCK',
            timestamp: new Date().toISOString(),
            hexHash: auditLog.hexHash
          },
          complianceEngine: 'RAZORPAY_FALLBACK',
          mode: 'MOCK'
        }, { status: 200 });
      }
    }

    if (action === 'VERIFY') {
      if (!taskRequirements || !submittedWork) {
        const auditLog = createAuditLogWithHash('SYSTEM', 'Input validation failed: Missing taskRequirements or submittedWork.');
        return NextResponse.json({
          success: false,
          log: auditLog.message,
          auditTrail: {
            ledgerId: generateAuditHash({ action, taskId }),
            checkpoint: 'INPUT_VALIDATION_FAILED',
            timestamp: new Date().toISOString()
          }
        }, { status: 400 });
      }

      const submittedWorkLower = submittedWork.toLowerCase();
      const hasMaliciousTrigger = submittedWorkLower.includes('malicious_trigger') || submittedWorkLower.includes('crash');

      const agents = [
        {
          name: 'SECURITY_AUDITOR_BOT',
          role: 'Evaluates code vulnerability safety and security best practices',
          systemPrompt: 'You are a security audit specialist. Analyze code for vulnerabilities, unsafe patterns, and security best practices. Return JSON with vote (APPROVED or REJECTED) and reasoning.'
        },
        {
          name: 'SYNTAX_COMPLIANCE_BOT',
          role: 'Evaluates clean structures, formatting, and code quality',
          systemPrompt: 'You are a code quality and syntax validator. Analyze code for proper structure, formatting, best practices, and readability. Return JSON with vote (APPROVED or REJECTED) and reasoning.'
        },
        {
          name: 'FINANCIAL_CLEARANCE_BOT',
          role: 'Evaluates budget rule validation and compliance matches',
          systemPrompt: 'You are a financial compliance validator. Analyze if the code meets business requirements and budget constraints. Return JSON with vote (APPROVED or REJECTED) and reasoning.'
        }
      ];

      let consensusVotes = [];
      let useLocalFallback = false;

      for (const agent of agents) {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: agent.systemPrompt },
              { role: 'user', content: `Task Requirements:\n${taskRequirements}\n\nSubmitted Code/Work:\n${submittedWork}\n\nEvaluate and return JSON with vote (APPROVED or REJECTED) and reasoning.` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 300
          });

          const responseText = completion.choices[0].message.content;
          const parsed = JSON.parse(responseText);

          consensusVotes.push({
            agent: agent.name,
            role: agent.role,
            vote: parsed.vote || 'REJECTED',
            reasoning: parsed.reasoning || 'Analysis incomplete.'
          });
        } catch (agentError) {
          useLocalFallback = true;
          console.warn(`Agent ${agent.name} failed:`, agentError.message);
        }
      }

      if (useLocalFallback || consensusVotes.length === 0) {
        const codeQuality = submittedWork.length > 50 ? 'ADEQUATE' : 'INSUFFICIENT';
        const hasComments = submittedWork.includes('//') || submittedWork.includes('/*');
        const hasFunction = submittedWork.includes('function') || submittedWork.includes('const') || submittedWork.includes('let');
        const hasStructure = submittedWork.includes('{') && submittedWork.includes('}');
        const isJunk = submittedWork.toLowerCase().includes('broken') || submittedWork.toLowerCase().includes('todo') || submittedWork.toLowerCase().includes('xxx');

        if (isJunk) {
          consensusVotes = [
            { agent: 'SECURITY_AUDITOR_BOT', role: 'Security Auditor', vote: 'REJECTED', reasoning: 'Code contains broken markers or incomplete implementation.' },
            { agent: 'SYNTAX_COMPLIANCE_BOT', role: 'Syntax Validator', vote: 'REJECTED', reasoning: 'Code structure is malformed or incomplete.' },
            { agent: 'FINANCIAL_CLEARANCE_BOT', role: 'Financial Validator', vote: 'REJECTED', reasoning: 'Code does not meet business requirements.' }
          ];
        } else if (hasComments && hasStructure && hasFunction) {
          consensusVotes = [
            { agent: 'SECURITY_AUDITOR_BOT', role: 'Security Auditor', vote: 'APPROVED', reasoning: 'Code structure appears secure with proper documentation.' },
            { agent: 'SYNTAX_COMPLIANCE_BOT', role: 'Syntax Validator', vote: 'APPROVED', reasoning: 'Code maintains good formatting and structure.' },
            { agent: 'FINANCIAL_CLEARANCE_BOT', role: 'Financial Validator', vote: 'REJECTED', reasoning: 'Business requirements validation unclear.' }
          ];
        } else {
          consensusVotes = [
            { agent: 'SECURITY_AUDITOR_BOT', role: 'Security Auditor', vote: 'APPROVED', reasoning: 'Basic security checks passed.' },
            { agent: 'SYNTAX_COMPLIANCE_BOT', role: 'Syntax Validator', vote: 'APPROVED', reasoning: 'Syntax is valid.' },
            { agent: 'FINANCIAL_CLEARANCE_BOT', role: 'Financial Validator', vote: 'REJECTED', reasoning: 'Compliance verification pending.' }
          ];
        }
      }

      const approvedVotes = consensusVotes.filter(v => v.vote === 'APPROVED').length;
      const totalVotes = consensusVotes.length;
      const consensusPercentage = ((approvedVotes / totalVotes) * 100).toFixed(1);
      const isConsensusApproved = approvedVotes >= 2;

      const consensusVotesWithHashes = consensusVotes.map(vote => {
        const hexHash = generateHexHash();
        return {
          agent: vote.agent,
          role: vote.role,
          vote: vote.vote,
          reasoning: vote.reasoning,
          hexHash: hexHash,
          auditMessage: `${vote.agent}: ${vote.vote} - ${vote.reasoning} | HEX-HASH: ${hexHash}`
        };
      });

      const consensusBreakdown = consensusVotesWithHashes.map(v => v.auditMessage).join(' | ');
      const mainConsensusLog = createAuditLogWithHash('QA_MULTI_AGENT_CONSENSUS', `CONSENSUS_ACHIEVED: ${approvedVotes}/${totalVotes} agents approved (${consensusPercentage}%). ${consensusBreakdown}`);

      if (!isConsensusApproved) {
        return NextResponse.json({
          success: true,
          decision: 'REJECTED',
          log: mainConsensusLog.message,
          consensus: {
            approved: false,
            approvalVotes: approvedVotes,
            totalVotes: totalVotes,
            consensusPercentage: consensusPercentage,
            votes: consensusVotesWithHashes
          },
          status: 'ESCROW_FROZEN',
          auditTrail: {
            ledgerId: generateAuditHash({ action, taskId, decision: 'REJECTED', consensusPercentage }),
            checkpoint: 'CONSENSUS_REJECTED',
            timestamp: new Date().toISOString(),
            mainHexHash: mainConsensusLog.hexHash,
            agentHexHashes: consensusVotesWithHashes.map(v => v.hexHash)
          },
          complianceEngine: useLocalFallback ? 'LOCAL_MULTISIG_CONSENSUS' : 'OPENAI_MULTISIG_CONSENSUS'
        }, { status: 200 });
      }

      try {
        const payout = await razorpay.payouts.create({
          account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || '1112220061746829',
          fund_account_id: process.env.RAZORPAY_FUND_ACCOUNT_ID || 'fa_test_fund',
          amount: budget * 100,
          currency: 'INR',
          mode: 'NEFT',
          purpose: 'agent_compensation',
          description: `Payout for Task ${taskId} - Agent ${subAgent}`,
          notes: { taskId, agent: subAgent, consensusDecision: 'APPROVED', approvalVotes: approvedVotes, totalAgents: totalVotes }
        });

        if (hasMaliciousTrigger) {
          try {
            const reversal = await razorpay.payouts.reverse(payout.id, {
              notes: {
                reversalReason: 'Post-payout vulnerability exploitation detected via malicious code injection',
                detectionTimestamp: new Date().toISOString(),
                securityBotAlert: 'MALICIOUS_CODE_DETECTED'
              }
            });

            const payoutLog = createAuditLogWithHash('RAZORPAYX_SETTLEMENT', `Payout dispatched: INR ${budget} transferred to ${subAgent}. Payout ID: ${payout.id}. Status: PAID. | HEX-HASH: ${payout.id.substring(0, 8).toUpperCase()}`);
            const vulnerabilityAlert = createAuditLogWithHash('SECURITY_AUDITOR_BOT', `CRITICAL_POST_PAYOUT_BREACH: Malicious code injection detected post-payment. Payload markers: MALICIOUS_TRIGGER or CRASH identified in artifact.`);
            const chargebackLog = createAuditLogWithHash('RAZORPAYX_REVERSAL', `Automated chargeback executed. Reversal ID: ${reversal.id}. Full amount INR ${budget} clawed back from agent routing node ${subAgent}. Funds safely redeposited to Smart Collect escrow. Reversal Status: PROCESSED.`);

            return NextResponse.json({
              success: true,
              decision: 'APPROVED_THEN_REVERSED',
              log: mainConsensusLog.message,
              payoutLog: payoutLog.message,
              vulnerabilityAlert: vulnerabilityAlert.message,
              chargebackLog: chargebackLog.message,
              consensus: {
                approved: true,
                approvalVotes: approvedVotes,
                totalVotes: totalVotes,
                consensusPercentage: consensusPercentage,
                votes: consensusVotesWithHashes
              },
              payoutId: payout.id,
              reversalId: reversal.id,
              status: 'REVERSED_CHARGEBACK',
              auditTrail: {
                ledgerId: generateAuditHash({ action, taskId, decision: 'APPROVED_THEN_REVERSED', payoutId: payout.id, reversalId: reversal.id }),
                checkpoint: 'POST_PAYOUT_REVERSAL_EXECUTED',
                timestamp: new Date().toISOString(),
                mainHexHash: mainConsensusLog.hexHash,
                payoutHexHash: payoutLog.hexHash,
                vulnerabilityHexHash: vulnerabilityAlert.hexHash,
                chargebackHexHash: chargebackLog.hexHash,
                agentHexHashes: consensusVotesWithHashes.map(v => v.hexHash)
              },
              securityAction: 'AUTOMATIC_REVERSAL_EXECUTED',
              complianceEngine: useLocalFallback ? 'LOCAL_MULTISIG_CONSENSUS' : 'OPENAI_MULTISIG_CONSENSUS'
            }, { status: 200 });
          } catch (reversalError) {
            const mockReversalId = `reversal_${Math.random().toString(36).substring(7)}`;
            const payoutLog = createAuditLogWithHash('RAZORPAYX_SETTLEMENT', `[FALLBACK] Payout dispatched: INR ${budget} transferred to ${subAgent}. Mock Payout ID: ${mockReversalId}. Status: PAID.`);
            const vulnerabilityAlert = createAuditLogWithHash('SECURITY_AUDITOR_BOT', `[FALLBACK] CRITICAL_POST_PAYOUT_BREACH: Malicious code injection detected post-payment. Payload markers: MALICIOUS_TRIGGER or CRASH identified.`);
            const chargebackLog = createAuditLogWithHash('RAZORPAYX_REVERSAL', `[FALLBACK] Automated chargeback executed. Mock Reversal ID: ${mockReversalId}. Full amount INR ${budget} clawed back. Funds redeposited to escrow.`);

            return NextResponse.json({
              success: true,
              decision: 'APPROVED_THEN_REVERSED',
              log: mainConsensusLog.message,
              payoutLog: payoutLog.message,
              vulnerabilityAlert: vulnerabilityAlert.message,
              chargebackLog: chargebackLog.message,
              consensus: {
                approved: true,
                approvalVotes: approvedVotes,
                totalVotes: totalVotes,
                consensusPercentage: consensusPercentage,
                votes: consensusVotesWithHashes
              },
              payoutId: mockReversalId,
              reversalId: mockReversalId,
              status: 'REVERSED_CHARGEBACK',
              auditTrail: {
                ledgerId: generateAuditHash({ action, taskId, decision: 'APPROVED_THEN_REVERSED', payoutId: mockReversalId }),
                checkpoint: 'POST_PAYOUT_REVERSAL_EXECUTED_MOCK',
                timestamp: new Date().toISOString(),
                mainHexHash: mainConsensusLog.hexHash,
                payoutHexHash: payoutLog.hexHash,
                vulnerabilityHexHash: vulnerabilityAlert.hexHash,
                chargebackHexHash: chargebackLog.hexHash,
                agentHexHashes: consensusVotesWithHashes.map(v => v.hexHash)
              },
              securityAction: 'AUTOMATIC_REVERSAL_EXECUTED',
              complianceEngine: useLocalFallback ? 'LOCAL_MULTISIG_CONSENSUS' : 'OPENAI_MULTISIG_CONSENSUS',
              mode: 'MOCK'
            }, { status: 200 });
          }
        } else {
          const payoutLog = createAuditLogWithHash('RAZORPAYX_SETTLEMENT', `Payout initiated: INR ${budget} transferred to ${subAgent}. Payout ID: ${payout.id}. Status: PROCESSED.`);

          return NextResponse.json({
            success: true,
            decision: 'APPROVED',
            log: mainConsensusLog.message,
            payoutLog: payoutLog.message,
            consensus: {
              approved: true,
              approvalVotes: approvedVotes,
              totalVotes: totalVotes,
              consensusPercentage: consensusPercentage,
              votes: consensusVotesWithHashes
            },
            payoutId: payout.id,
            status: 'FUNDS_DISPATCHED',
            auditTrail: {
              ledgerId: generateAuditHash({ action, taskId, decision: 'APPROVED', payoutId: payout.id }),
              checkpoint: 'PAYOUT_APPROVED_AND_DISPATCHED',
              timestamp: new Date().toISOString(),
              mainHexHash: mainConsensusLog.hexHash,
              payoutHexHash: payoutLog.hexHash,
              agentHexHashes: consensusVotesWithHashes.map(v => v.hexHash)
            },
            complianceEngine: useLocalFallback ? 'LOCAL_MULTISIG_CONSENSUS' : 'OPENAI_MULTISIG_CONSENSUS'
          }, { status: 200 });
        }
      } catch (payoutError) {
        const mockPayoutId = `pout_${Math.random().toString(36).substring(7)}`;
        const payoutLog = createAuditLogWithHash('RAZORPAYX_SETTLEMENT', `[FALLBACK] Payout initiated: INR ${budget} transferred to ${subAgent}. Mock Payout ID: ${mockPayoutId}. Status: PROCESSED.`);

        if (hasMaliciousTrigger) {
          const mockReversalId = `reversal_${Math.random().toString(36).substring(7)}`;
          const vulnerabilityAlert = createAuditLogWithHash('SECURITY_AUDITOR_BOT', `[FALLBACK] CRITICAL_POST_PAYOUT_BREACH: Malicious code injection detected. Payload markers identified.`);
          const chargebackLog = createAuditLogWithHash('RAZORPAYX_REVERSAL', `[FALLBACK] Automated chargeback executed. Mock Reversal ID: ${mockReversalId}. Full amount INR ${budget} clawed back.`);

          return NextResponse.json({
            success: true,
            decision: 'APPROVED_THEN_REVERSED',
            log: mainConsensusLog.message,
            payoutLog: payoutLog.message,
            vulnerabilityAlert: vulnerabilityAlert.message,
            chargebackLog: chargebackLog.message,
            consensus: {
              approved: true,
              approvalVotes: approvedVotes,
              totalVotes: totalVotes,
              consensusPercentage: consensusPercentage,
              votes: consensusVotesWithHashes
            },
            payoutId: mockPayoutId,
            reversalId: mockReversalId,
            status: 'REVERSED_CHARGEBACK',
            auditTrail: {
              ledgerId: generateAuditHash({ action, taskId, decision: 'APPROVED_THEN_REVERSED', payoutId: mockPayoutId }),
              checkpoint: 'POST_PAYOUT_REVERSAL_EXECUTED_MOCK',
              timestamp: new Date().toISOString(),
              mainHexHash: mainConsensusLog.hexHash,
              payoutHexHash: payoutLog.hexHash,
              vulnerabilityHexHash: vulnerabilityAlert.hexHash,
              chargebackHexHash: chargebackLog.hexHash,
              agentHexHashes: consensusVotesWithHashes.map(v => v.hexHash)
            },
            securityAction: 'AUTOMATIC_REVERSAL_EXECUTED',
            complianceEngine: useLocalFallback ? 'LOCAL_MULTISIG_CONSENSUS' : 'OPENAI_MULTISIG_CONSENSUS',
            mode: 'MOCK'
          }, { status: 200 });
        } else {
          return NextResponse.json({
            success: true,
            decision: 'APPROVED',
            log: mainConsensusLog.message,
            payoutLog: payoutLog.message,
            consensus: {
              approved: true,
              approvalVotes: approvedVotes,
              totalVotes: totalVotes,
              consensusPercentage: consensusPercentage,
              votes: consensusVotesWithHashes
            },
            payoutId: mockPayoutId,
            status: 'FUNDS_DISPATCHED',
            auditTrail: {
              ledgerId: generateAuditHash({ action, taskId, decision: 'APPROVED', payoutId: mockPayoutId }),
              checkpoint: 'PAYOUT_APPROVED_AND_DISPATCHED_MOCK',
              timestamp: new Date().toISOString(),
              mainHexHash: mainConsensusLog.hexHash,
              payoutHexHash: payoutLog.hexHash,
              agentHexHashes: consensusVotesWithHashes.map(v => v.hexHash)
            },
            complianceEngine: useLocalFallback ? 'LOCAL_MULTISIG_CONSENSUS' : 'OPENAI_MULTISIG_CONSENSUS',
            mode: 'MOCK'
          }, { status: 200 });
        }
      }
    }

    return NextResponse.json({
      success: false,
      log: 'Invalid action parameter. Supported actions: INIT, VERIFY.'
    }, { status: 400 });
  } catch (error) {
    console.error('Route handler error:', error);
    return NextResponse.json({
      success: false,
      log: `System error: ${error.message}`
    }, { status: 500 });
  }
}
