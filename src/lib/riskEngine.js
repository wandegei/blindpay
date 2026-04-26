/**
 * BlindPay Risk Assessment Engine
 * Calculates a 0-100 risk score for an order based on multiple signals.
 * Scores > 70 trigger auto-flag for admin review.
 */

import { base44 } from "@/api/base44Client";

const HIGH_VALUE_THRESHOLD = 5_000_000; // UGX equivalent
const MEDIUM_VALUE_THRESHOLD = 1_000_000;

/**
 * Calculates risk factors and a composite score for an order.
 * @param {object} order - The order entity
 * @param {object[]} transactions - All transactions for this order
 * @param {object[]} auditLogs - Audit logs for this order
 * @param {object[]} allOrders - All orders (for historical context)
 * @returns {{ score: number, flags: string[], breakdown: object }}
 */
export function calculateRiskScore(order, transactions, auditLogs, allOrders = []) {
  const flags = [];
  const breakdown = {};

  // 1. Transaction Volume (0-30 pts)
  let volumeScore = 0;
  const amount = order.total_amount || 0;
  if (amount >= HIGH_VALUE_THRESHOLD) {
    volumeScore = 30;
    flags.push("HIGH_VALUE_TRANSACTION");
  } else if (amount >= MEDIUM_VALUE_THRESHOLD) {
    volumeScore = 15;
  } else if (amount >= 500_000) {
    volumeScore = 7;
  }
  breakdown.volume = volumeScore;

  // 2. Missing verification info (0-25 pts)
  let verificationScore = 0;
  if (!order.customer_email) {
    verificationScore += 10;
    flags.push("MISSING_CUSTOMER_EMAIL");
  }
  if (!order.customer_phone) {
    verificationScore += 8;
    flags.push("MISSING_CUSTOMER_PHONE");
  }
  if (!order.deposit_reference) {
    verificationScore += 7;
    flags.push("UNVERIFIED_DEPOSIT");
  }
  breakdown.verification = verificationScore;

  // 3. Transaction anomalies (0-25 pts)
  let txScore = 0;
  const rejectedTxs = transactions.filter(t => t.status === "rejected" || t.status === "failed");
  const reversedTxs = transactions.filter(t => t.status === "reversed");
  if (rejectedTxs.length > 0) {
    txScore += Math.min(rejectedTxs.length * 8, 16);
    flags.push("REJECTED_TRANSACTIONS");
  }
  if (reversedTxs.length > 0) {
    txScore += Math.min(reversedTxs.length * 9, 18);
    flags.push("REVERSED_TRANSACTIONS");
  }
  // Long-stalled order (pending_deposit or in_transit for >24h)
  const createdAt = new Date(order.created_date);
  const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  if (["pending_deposit", "in_transit"].includes(order.status) && hoursOld > 24) {
    txScore += 10;
    flags.push("STALLED_ORDER");
  }
  breakdown.transactions = Math.min(txScore, 25);

  // 4. Historical audit anomalies (0-20 pts)
  let auditScore = 0;
  const riskLogs = auditLogs.filter(l => l.action === "risk_flag_raised");
  const freezeLogs = auditLogs.filter(l => l.action === "order_frozen");
  const disputeLogs = auditLogs.filter(l => l.action === "dispute_opened");
  if (riskLogs.length > 0) { auditScore += 10; }
  if (freezeLogs.length > 0) { auditScore += 8; flags.push("PREVIOUSLY_FROZEN"); }
  if (disputeLogs.length > 0) { auditScore += 12; flags.push("DISPUTE_HISTORY"); }

  // Repeat customer with prior disputes
  const customerOrders = allOrders.filter(o =>
    o.id !== order.id &&
    o.customer_email &&
    o.customer_email === order.customer_email
  );
  const priorDisputed = customerOrders.filter(o => o.status === "disputed" || (o.risk_flags || []).length > 0);
  if (priorDisputed.length > 0) {
    auditScore += 10;
    flags.push("REPEAT_FLAGGED_CUSTOMER");
  }
  breakdown.audit = Math.min(auditScore, 20);

  const totalScore = Math.min(
    breakdown.volume + breakdown.verification + breakdown.transactions + breakdown.audit,
    100
  );

  return { score: totalScore, flags, breakdown };
}

/**
 * Runs the risk engine for an order and persists results.
 * If score > 70, creates an audit log entry for admin review.
 */
export async function runRiskAssessment(order, transactions, auditLogs, allOrders) {
  const { score, flags, breakdown } = calculateRiskScore(order, transactions, auditLogs, allOrders);

  // Persist risk score + flags back to the order
  await base44.entities.Order.update(order.id, {
    risk_score: score,
    risk_flags: flags,
  });

  // Auto-flag for admin review if score exceeds threshold
  if (score > 70) {
    // Avoid duplicate flags in the same session
    const existingFlags = (auditLogs || []).filter(
      l => l.action === "risk_flag_raised" && l.entity_id === order.id
    );
    // Only create a new flag if the score changed significantly or no recent flag
    const shouldCreate = existingFlags.length === 0 ||
      Math.abs((order.risk_score || 0) - score) >= 10;

    if (shouldCreate) {
      await base44.entities.AuditLog.create({
        action: "risk_flag_raised",
        entity_type: "order",
        entity_id: order.id,
        actor_email: "system",
        actor_role: "system",
        details: JSON.stringify({ score, flags, breakdown }),
        previous_state: String(order.risk_score || 0),
        new_state: String(score),
      });
    }
  }

  return { score, flags, breakdown };
}