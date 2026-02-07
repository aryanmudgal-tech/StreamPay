import { PricingConfig, DEFAULT_PRICING } from '../types';

/**
 * Dynamic pricing capped at ±25% of the base rate.
 *
 * If avg watch ratio > target (50%), price goes UP (people like it → costs more).
 * If avg watch ratio < target, price goes DOWN.
 * But never more than ±maxShiftPct from the base.
 *
 * P = clamp(base * (1 + k * (R - Rt)), base * 0.75, base * 1.25)
 */
export function computePrice(
  avgWatchRatio: number,
  overridePrice: number | null,
  config: PricingConfig = DEFAULT_PRICING
): number {
  const base = (overridePrice !== null && overridePrice !== undefined)
    ? overridePrice
    : config.basePriceCents;

  const { maxShiftPct, demandWeight, targetRatio } = config;
  const minPrice = base * (1 - maxShiftPct);
  const maxPrice = base * (1 + maxShiftPct);

  const raw = base * (1 + demandWeight * (avgWatchRatio - targetRatio));
  return Math.round(Math.max(minPrice, Math.min(maxPrice, raw)));
}
