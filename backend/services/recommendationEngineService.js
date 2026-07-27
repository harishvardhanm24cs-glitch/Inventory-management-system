import featureEngineeringService from './featureEngineeringService.js';
import aiPredictionEngine from './aiPredictionEngine.js';

/**
 * recommendationEngineService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 5: AI Recommendation Engine
 *
 * Synthesizes dynamic, prioritized warehouse recommendations across 6 categories:
 * 1. LOW_STOCK
 * 2. DEAD_STOCK
 * 3. WAREHOUSE_HEALTH
 * 4. RACK_OPTIMIZATION
 * 5. CONSUMPTION_TREND
 * 6. INVENTORY_EFFICIENCY
 *
 * Every recommendation strictly contains 7 attributes:
 * - title, priority, reason, confidence_score, suggested_action, timestamp, category.
 *
 * Design Pattern: Strategy Pattern (IRecommendationStrategy)
 * Allows future ML models (Deep RL, Multi-Armed Bandit) to plug in & re-rank recommendations.
 */

export class IRecommendationStrategy {
  constructor(name = 'AbstractRecommendationStrategy') {
    this.name = name;
  }

  async generateRecommendations(contextData) {
    throw new Error('generateRecommendations() must be implemented by strategy');
  }
}

/**
 * Default Rule & Heuristic Recommendation Strategy
 */
export class DefaultRuleHeuristicRecommendationStrategy extends IRecommendationStrategy {
  constructor() {
    super('DefaultRuleHeuristicRecommendationStrategy');
  }

  async generateRecommendations(contextData) {
    const { materialFeatures, rackFeatures, warehouseFeatures, predictions } = contextData;
    const recommendations = [];
    const nowISO = new Date().toISOString();

    // --- Category 1: LOW_STOCK Recommendations ---
    (materialFeatures || []).forEach(m => {
      const stock = m.current_stock || 0;
      const threshold = m.threshold_limit || 0;
      const unit = m.unit || 'KG';

      if (stock === 0) {
        recommendations.push({
          id: `rec-low-depleted-${m.material_id}`,
          title: `CRITICAL: ${m.material_name} Stock Depleted`,
          priority: 'CRITICAL',
          reason: `Current stock level is 0.0 ${unit} (Threshold: ${threshold} ${unit}). Production line at risk of immediate shutdown.`,
          confidence_score: 98,
          suggested_action: `Issue emergency purchase order for at least ${(threshold * 2) || 50} ${unit} of ${m.material_name} immediately.`,
          timestamp: nowISO,
          category: 'LOW_STOCK',
          target_id: String(m.material_id)
        });
      } else if (stock <= threshold) {
        const deficit = parseFloat((threshold - stock).toFixed(2));
        recommendations.push({
          id: `rec-low-threshold-${m.material_id}`,
          title: `Reorder Required: ${m.material_name}`,
          priority: 'HIGH',
          reason: `Current stock (${stock} ${unit}) is below safety threshold (${threshold} ${unit}) by ${deficit} ${unit}.`,
          confidence_score: 92,
          suggested_action: `Reorder safety batch of ${(threshold * 1.5).toFixed(0)} ${unit} of ${m.material_name} to restore safety buffer.`,
          timestamp: nowISO,
          category: 'LOW_STOCK',
          target_id: String(m.material_id)
        });
      }
    });

    // Add predicted depletion warnings from AI Prediction Engine
    const depletionPreds = predictions?.depletion || [];
    depletionPreds.forEach(p => {
      if (p.days_until_depletion !== null && p.days_until_depletion > 0 && p.days_until_depletion <= 14 && p.current_stock > p.threshold_limit) {
        recommendations.push({
          id: `rec-low-pred-${p.material_id}`,
          title: `Depletion Risk Warning: ${p.material_name}`,
          priority: p.days_until_depletion <= 7 ? 'HIGH' : 'MEDIUM',
          reason: `AI predicts complete stock depletion in ~${p.days_until_depletion} days (by ${p.predicted_depletion_date}) based on daily usage rate of ${p.avg_daily_usage} ${p.unit}/day.`,
          confidence_score: p.confidence_score || 86,
          suggested_action: `Schedule replenishment purchase order for ${p.material_name} before ${p.predicted_depletion_date}.`,
          timestamp: nowISO,
          category: 'LOW_STOCK',
          target_id: String(p.material_id)
        });
      }
    });

    // --- Category 2: DEAD_STOCK Recommendations ---
    (materialFeatures || []).forEach(m => {
      const stock = m.current_stock || 0;
      const events30d = m.movement_events_30d || 0;
      const monthlyOutward = m.monthly_consumption || 0;

      if (stock > 0 && events30d === 0 && monthlyOutward === 0) {
        recommendations.push({
          id: `rec-dead-stock-${m.material_id}`,
          title: `Dead Stock Alert: ${m.material_name}`,
          priority: 'MEDIUM',
          reason: `${m.material_name} has 0 transactions over the past 30 days while occupying stock space (${stock} ${m.unit}).`,
          confidence_score: 90,
          suggested_action: `Review material batch for expiration or reallocate inventory to active production projects.`,
          timestamp: nowISO,
          category: 'DEAD_STOCK',
          target_id: String(m.material_id)
        });
      }
    });

    // --- Category 3: WAREHOUSE_HEALTH Recommendations ---
    const healthScore = warehouseFeatures?.healthScore ?? 85;
    const racksList = Array.isArray(rackFeatures) ? rackFeatures : (rackFeatures?.racks || []);
    const overloadedRacksCount = racksList.filter(r => (r.occupancy_percentage || 0) >= 85).length;
    const depletedCount = (materialFeatures || []).filter(m => (m.current_stock || 0) === 0).length;

    if (healthScore < 75 || depletedCount > 2 || overloadedRacksCount > 1) {
      recommendations.push({
        id: `rec-health-system-${Date.now()}`,
        title: `Warehouse Health Optimization Required`,
        priority: healthScore < 60 ? 'CRITICAL' : 'HIGH',
        reason: `Overall warehouse health score is ${healthScore}/100 with ${depletedCount} depleted materials and ${overloadedRacksCount} overloaded racks.`,
        confidence_score: 94,
        suggested_action: `Execute warehouse audit: rebalance overloaded racks and clear pending stock alerts.`,
        timestamp: nowISO,
        category: 'WAREHOUSE_HEALTH',
        target_id: 'SYSTEM_HEALTH'
      });
    }

    // --- Category 4: RACK_OPTIMIZATION Recommendations ---
    const racks = Array.isArray(rackFeatures) ? rackFeatures : (rackFeatures?.racks || []);
    const overloadedRacks = racks.filter(r => (r.occupancy_percentage || 0) >= 85);
    const underutilizedRacks = racks.filter(r => (r.occupancy_percentage || 0) <= 15);

    overloadedRacks.forEach((r, idx) => {
      const targetRack = underutilizedRacks.length > 0 ? underutilizedRacks[idx % underutilizedRacks.length].rack_code : 'underutilized rack';
      recommendations.push({
        id: `rec-rack-overload-${r.rack_code}`,
        title: `Rack Overload Warning: ${r.rack_code}`,
        priority: r.occupancy_percentage >= 90 ? 'CRITICAL' : 'HIGH',
        reason: `Rack ${r.rack_code} capacity is at ${r.occupancy_percentage}% (${r.current_capacity}/${r.max_capacity} units). Risk of spatial bottleneck.`,
        confidence_score: 95,
        suggested_action: `Relocate surplus inventory from ${r.rack_code} to ${targetRack} to balance warehouse spatial load.`,
        timestamp: nowISO,
        category: 'RACK_OPTIMIZATION',
        target_id: r.rack_code
      });
    });

    underutilizedRacks.forEach(r => {
      recommendations.push({
        id: `rec-rack-underutilized-${r.rack_code}`,
        title: `Underutilized Space: Rack ${r.rack_code}`,
        priority: 'LOW',
        reason: `Rack ${r.rack_code} is only ${r.occupancy_percentage}% occupied (${r.current_capacity}/${r.max_capacity} units).`,
        confidence_score: 85,
        suggested_action: `Assign new inward material batches or transferred stock to Rack ${r.rack_code}.`,
        timestamp: nowISO,
        category: 'RACK_OPTIMIZATION',
        target_id: r.rack_code
      });
    });

    // --- Category 5: CONSUMPTION_TREND Recommendations ---
    const trendPreds = predictions?.consumption_trend || [];
    trendPreds.forEach(t => {
      if (t.anomaly_detected || t.trend_slope_pct > 20.0) {
        recommendations.push({
          id: `rec-trend-surge-${t.material_id}`,
          title: `Consumption Surge: ${t.material_name}`,
          priority: 'HIGH',
          reason: `Abnormal withdrawal rate surge (+${t.trend_slope_pct}%) detected for ${t.material_name} (avg rate ${t.avg_daily_usage}/day).`,
          confidence_score: 89,
          suggested_action: `Verify active production work orders for ${t.material_name} to prevent unexpected depletion.`,
          timestamp: nowISO,
          category: 'CONSUMPTION_TREND',
          target_id: String(t.material_id)
        });
      }
    });

    // --- Category 6: INVENTORY_EFFICIENCY Recommendations ---
    (materialFeatures || []).forEach(m => {
      const turnover = m.turnover_ratio || 0;
      const stock = m.current_stock || 0;

      if (stock > 0 && turnover < 0.3 && m.movement_events_30d > 0) {
        recommendations.push({
          id: `rec-efficiency-turnover-${m.material_id}`,
          title: `Low Inventory Turnover: ${m.material_name}`,
          priority: 'MEDIUM',
          reason: `${m.material_name} has a low turnover velocity ratio of ${turnover}x. Holding cost buffer is inefficient.`,
          confidence_score: 87,
          suggested_action: `Reduce safety stock buffer limit for ${m.material_name} to optimize warehouse capital efficiency.`,
          timestamp: nowISO,
          category: 'INVENTORY_EFFICIENCY',
          target_id: String(m.material_id)
        });
      }
    });

    return recommendations;
  }
}

/**
 * Recommendation Strategy Registry for Dynamic ML Model Integration
 */
export class RecommendationRegistry {
  constructor() {
    this.strategies = new Map();
    const defaultStrategy = new DefaultRuleHeuristicRecommendationStrategy();
    this.registerStrategy('default', defaultStrategy);
    this.activeStrategyName = 'default';
  }

  registerStrategy(name, strategyInstance) {
    if (!(strategyInstance instanceof IRecommendationStrategy)) {
      throw new Error('Strategy must inherit from IRecommendationStrategy');
    }
    this.strategies.set(name, strategyInstance);
    console.log(`[RecommendationRegistry] Registered strategy '${name}' (${strategyInstance.name})`);
  }

  setActiveStrategy(name) {
    if (!this.strategies.has(name)) {
      console.warn(`[RecommendationRegistry] Strategy '${name}' not found. Falling back to default.`);
      this.activeStrategyName = 'default';
      return false;
    }
    this.activeStrategyName = name;
    console.log(`[RecommendationRegistry] Switched active recommendation strategy to '${name}'`);
    return true;
  }

  getActiveStrategy() {
    return this.strategies.get(this.activeStrategyName) || this.strategies.get('default');
  }
}

export const recommendationRegistry = new RecommendationRegistry();

export const recommendationEngineService = {
  /**
   * Complete multi-source recommendation synthesis
   */
  async generateRecommendations() {
    const [features, predictions] = await Promise.all([
      featureEngineeringService.generateAllFeatures(),
      aiPredictionEngine.getOverviewPredictions()
    ]);

    const contextData = {
      materialFeatures: features.material_features,
      rackFeatures: features.rack_features,
      warehouseFeatures: features.warehouse_features,
      predictions: predictions.predictions
    };

    const strategy = recommendationRegistry.getActiveStrategy();
    const rawRecommendations = await strategy.generateRecommendations(contextData);

    // Group recommendations by the 6 mandatory categories
    const categoriesMap = {
      LOW_STOCK: [],
      DEAD_STOCK: [],
      WAREHOUSE_HEALTH: [],
      RACK_OPTIMIZATION: [],
      CONSUMPTION_TREND: [],
      INVENTORY_EFFICIENCY: []
    };

    (rawRecommendations || []).forEach(item => {
      const cat = item.category || 'LOW_STOCK';
      if (categoriesMap[cat]) {
        categoriesMap[cat].push(item);
      }
    });

    return {
      timestamp: new Date().toISOString(),
      active_strategy: strategy.name,
      total_count: rawRecommendations.length,
      categories: {
        LOW_STOCK: categoriesMap.LOW_STOCK.length,
        DEAD_STOCK: categoriesMap.DEAD_STOCK.length,
        WAREHOUSE_HEALTH: categoriesMap.WAREHOUSE_HEALTH.length,
        RACK_OPTIMIZATION: categoriesMap.RACK_OPTIMIZATION.length,
        CONSUMPTION_TREND: categoriesMap.CONSUMPTION_TREND.length,
        INVENTORY_EFFICIENCY: categoriesMap.INVENTORY_EFFICIENCY.length
      },
      recommendations: rawRecommendations
    };
  }
};

export default recommendationEngineService;
