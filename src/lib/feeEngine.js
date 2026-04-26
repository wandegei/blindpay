/**
 * BlindPay Fee Engine
 * Calculates service fees dynamically based on order volume and provider tier.
 *
 * Provider tiers (stored on Wallet as provider_type or derived from volume):
 *   - standard : orders < 1,000,000 UGX → 2.5% fee
 *   - growth   : orders 1M–10M UGX     → 1.8% fee
 *   - premium  : orders > 10M UGX       → 1.2% fee
 *
 * Escrow master always charges an additional 0.3% platform fee on top.
 */

export const PLATFORM_FEE_RATE = 0.003; // 0.3% always

export const TIER_THRESHOLDS = [
  { name: "standard", maxAmount: 1_000_000,  rate: 0.025 },
  { name: "growth",   maxAmount: 10_000_000, rate: 0.018 },
  { name: "premium",  maxAmount: Infinity,   rate: 0.012 },
];

export function getTier(amount) {
  return TIER_THRESHOLDS.find(t => amount <= t.maxAmount) || TIER_THRESHOLDS.at(-1);
}

/**
 * Calculate fee breakdown for a transfer amount.
 * @param {number} amount — gross transfer amount
 * @param {string} [forceTier] — override tier name
 * @returns {{ tier, tierRate, tierFee, platformFee, totalFee, netAmount }}
 */
export function calculateFees(amount, forceTier) {
  const tier = forceTier
    ? TIER_THRESHOLDS.find(t => t.name === forceTier) || getTier(amount)
    : getTier(amount);

  const tierFee     = Math.round(amount * tier.rate);
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE);
  const totalFee    = tierFee + platformFee;
  const netAmount   = amount - totalFee;

  return {
    tier:        tier.name,
    tierRate:    tier.rate,
    tierFee,
    platformFee,
    totalFee,
    netAmount,
  };
}

/**
 * Human-readable summary string.
 */
export function feeLabel(breakdown) {
  const pct = ((breakdown.tierRate + PLATFORM_FEE_RATE) * 100).toFixed(2);
  return `${pct}% (${breakdown.tier} tier + 0.30% platform)`;
}