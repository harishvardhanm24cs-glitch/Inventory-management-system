/**
 * rackVisualizationRules.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Warehouse Visualization Rule Engine
 *
 * Encapsulates all color-coding, status label evaluation, and design tokens
 * for physical rack displays across Rack View and Digital Twin.
 *
 * Rule Specifications:
 * • GRAY   (EMPTY)                 → Quantity === 0 or Occupancy === 0%
 * • GREEN  (HEALTHY)               → Healthy inventory, safely loaded
 * • YELLOW (APPROACHING_THRESHOLD) → Quantity near safety threshold or medium load (41-80%)
 * • RED    (CRITICAL_STOCK)        → Critical stock level (<= threshold) or high load / overload (>80%)
 *
 * Extensibility:
 * • Supports registering custom rule evaluators (e.g. temperature alerts, batch expiry, custom client rules)
 * • Completely decouples UI styling & visualization logic from backend inventory domain logic.
 */

export type RackState = 'EMPTY' | 'HEALTHY' | 'APPROACHING_THRESHOLD' | 'CRITICAL_STOCK' | string;
export type ColorCode = 'GRAY' | 'GREEN' | 'YELLOW' | 'RED' | string;

export interface RackVisualDataInput {
  rack_code?: string;
  quantity?: number | string;
  current_capacity?: number | string;
  max_capacity?: number | string;
  occupancy_percentage?: number | string;
  threshold_limit?: number | string;
  status_color?: string;
  materials?: Array<{ quantity?: number | string; threshold_limit?: number | string; material_name?: string }>;
}

export interface RackVisualConfig {
  state: RackState;
  color: ColorCode;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBg: string;
  cardBorder: string;
  cardGlow: string;
  barColor: string;
  dotColor: string;
  ringColor: string;
  isPulse: boolean;
}

export type CustomRuleEvaluator = (input: RackVisualDataInput) => RackVisualConfig | null;

class VisualizationEngine {
  private customEvaluators: CustomRuleEvaluator[] = [];

  /**
   * Register custom visualization rules for future expansion (e.g. Cold storage, Expiry alerts)
   */
  public registerRule(evaluator: CustomRuleEvaluator): void {
    this.customEvaluators.unshift(evaluator);
  }

  /**
   * Evaluate input data against registered custom rules and standard warehouse rules.
   */
  public evaluate(input: RackVisualDataInput): RackVisualConfig {
    // 1. Try custom registered evaluators first
    for (const customEval of this.customEvaluators) {
      const customConfig = customEval(input);
      if (customConfig) {
        return customConfig;
      }
    }

    // 2. Fall back to Standard Warehouse Visualization Rules
    const qty = parseFloat(String(input.quantity ?? input.current_capacity ?? 0)) || 0;
    const maxCap = parseFloat(String(input.max_capacity ?? 100)) || 100;
    const limit = parseFloat(String(input.threshold_limit ?? 10)) || 10;
    
    let occ = 0;
    if (input.occupancy_percentage !== undefined && input.occupancy_percentage !== null) {
      occ = parseFloat(String(input.occupancy_percentage)) || 0;
    } else if (maxCap > 0) {
      occ = parseFloat(((qty / maxCap) * 100).toFixed(2));
    }

    // Check for critical material inside rack
    let hasCriticalMaterial = false;
    if (input.materials && Array.isArray(input.materials)) {
      hasCriticalMaterial = input.materials.some(m => {
        const mQty = parseFloat(String(m.quantity ?? 0));
        const mThresh = parseFloat(String(m.threshold_limit ?? 0));
        return mQty > 0 && mThresh > 0 && mQty <= mThresh;
      });
    }

    // ── GRAY: Empty Rack (Strictly check quantity === 0) ──
    if (qty === 0) {
      return {
        state: 'EMPTY',
        color: 'GRAY',
        label: 'Empty Rack',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-500',
        badgeBorder: 'border-slate-200',
        cardBg: 'bg-slate-50/50',
        cardBorder: 'border-dashed border-slate-300',
        cardGlow: 'hover:shadow-slate-500/10 hover:border-slate-400',
        barColor: 'bg-slate-300',
        dotColor: 'bg-slate-400',
        ringColor: 'ring-slate-300',
        isPulse: false,
      };
    }

    // ── RED: Critical Stock or Overload ──
    if ((qty > 0 && qty <= limit) || hasCriticalMaterial || occ > 80 || input.status_color === 'RED') {
      const isCriticalStock = (qty > 0 && qty <= limit) || hasCriticalMaterial;
      return {
        state: 'CRITICAL_STOCK',
        color: 'RED',
        label: isCriticalStock ? 'CRITICAL STOCK' : 'High Load',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-700',
        badgeBorder: 'border-rose-300',
        cardBg: 'bg-rose-50/15',
        cardBorder: 'border-rose-500',
        cardGlow: 'hover:shadow-rose-500/30 hover:border-rose-500',
        barColor: 'bg-rose-600',
        dotColor: 'bg-rose-500',
        ringColor: 'ring-rose-500',
        isPulse: true,
      };
    }

    // ── YELLOW: Approaching Threshold / Medium Load ──
    if ((qty > limit && qty <= limit * 1.25) || (occ > 40 && occ <= 80) || input.status_color === 'YELLOW') {
      const isApproaching = qty > limit && qty <= limit * 1.25;
      return {
        state: 'APPROACHING_THRESHOLD',
        color: 'YELLOW',
        label: isApproaching ? 'Approaching Limit' : 'Medium Load',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700',
        badgeBorder: 'border-amber-200',
        cardBg: 'bg-amber-50/10',
        cardBorder: 'border-amber-400',
        cardGlow: 'hover:shadow-amber-500/20 hover:border-amber-500',
        barColor: 'bg-amber-500',
        dotColor: 'bg-amber-500',
        ringColor: 'ring-amber-400',
        isPulse: false,
      };
    }

    // ── GREEN: Healthy Inventory ──
    return {
      state: 'HEALTHY',
      color: 'GREEN',
      label: 'Healthy Inventory',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-200',
      cardBg: 'bg-white',
      cardBorder: 'border-emerald-500',
      cardGlow: 'hover:shadow-emerald-500/20 hover:border-emerald-600',
      barColor: 'bg-emerald-500',
      dotColor: 'bg-emerald-500',
      ringColor: 'ring-emerald-500',
      isPulse: false,
    };
  }
}

// Global Singleton Instance
export const rackVisualizationRules = new VisualizationEngine();
