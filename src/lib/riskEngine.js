/**
 * BlindPay Risk Assessment Engine (Supabase version)
 */

import { supabase } from "@/lib/supabaseClient";

const HIGH_VALUE_THRESHOLD = 5_000_000;
const MEDIUM_VALUE_THRESHOLD = 1_000_000;

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

  const rejectedTxs = transactions.filter(
    (t) => t.status === "rejected" || t.status === "failed"
  );

  const reversedTxs = transactions.filter(
    (t) => t.status === "reversed"
  );

  if (rejectedTxs.length > 0) {
    txScore += Math.min(rejectedTxs.length * 8, 16);
    flags.push("REJECTED_TRANSACTIONS");
  }

  if (reversedTxs.length > 0) {
    txScore += Math.min(reversedTxs.length * 9, 18);
    flags.push("REVERSED_TRANSACTIONS");
  }

  const createdAt = new Date(order.created_date);
  const hoursOld =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  if (
    ["pending_deposit", "in_transit"].includes(order.status) &&
    hoursOld > 24
  ) {
    txScore += 10;
    flags.push("STALLED_ORDER");
  }

  breakdown.transactions = Math.min(txScore, 25);

  // 4. Historical audit anomalies (0-20 pts)
  let auditScore = 0;

  const riskLogs = auditLogs.filter((l) => l.action === "risk_flag_raised");
  const freezeLogs = auditLogs.filter((l) => l.action === "order_frozen");
  const disputeLogs = auditLogs.filter((l) => l.action === "dispute_opened");

  if (riskLogs.length > 0) auditScore += 10;
  if (freezeLogs.length > 0) {
    auditScore += 8;
    flags.push("PREVIOUSLY_FROZEN");
  }
  if (disputeLogs.length > 0) {
    auditScore += 12;
    flags.push("DISPUTE_HISTORY");
  }

  const customerOrders = allOrders.filter(
    (o) =>
      o.id !== order.id &&
      o.customer_email &&
      o.customer_email === order.customer_email
  );

  const priorDisputed = customerOrders.filter(
    (o) =>
      o.status === "disputed" ||
      (o.risk_flags || []).length > 0
  );

  if (priorDisputed.length > 0) {
    auditScore += 10;
    flags.push("REPEAT_FLAGGED_CUSTOMER");
  }

  breakdown.audit = Math.min(auditScore, 20);

  const totalScore = Math.min(
    breakdown.volume +
      breakdown.verification +
      breakdown.transactions +
      breakdown.audit,
    100
  );

  return { score: totalScore, flags, breakdown };
}

/**
 * Runs the risk engine + persists via Supabase
 */
export async function runRiskAssessment(
  order,
  transactions,
  auditLogs,
  allOrders
) {
  const { score, flags, breakdown } = calculateRiskScore(
    order,
    transactions,
    auditLogs,
    allOrders
  );

  // ✅ Update order in Supabase
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      risk_score: score,
      risk_flags: flags,
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("Error updating order:", updateError);
  }

  // ✅ Auto-flag if high risk
  if (score > 70) {
    const existingFlags = (auditLogs || []).filter(
      (l) =>
        l.action === "risk_flag_raised" &&
        l.entity_id === order.id
    );

    const shouldCreate =
      existingFlags.length === 0 ||
      Math.abs((order.risk_score || 0) - score) >= 10;

    if (shouldCreate) {
      const { error: insertError } = await supabase
        .from("audit_logs")
        .insert([
          {
            action: "risk_flag_raised",
            entity_type: "order",
            entity_id: order.id,
            actor_email: "system",
            actor_role: "system",
            details: { score, flags, breakdown }, // JSON column
            previous_state: String(order.risk_score || 0),
            new_state: String(score),
          },
        ]);

      if (insertError) {
        console.error("Error inserting audit log:", insertError);
      }
    }
  }

  return { score, flags, breakdown };
}