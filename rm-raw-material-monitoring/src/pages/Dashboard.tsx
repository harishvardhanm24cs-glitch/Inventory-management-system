import React from 'react';
import ExecutiveHeader from '../components/dashboard/ExecutiveHeader';
import ExecutiveQuickActionsPanel from '../components/dashboard/ExecutiveQuickActionsPanel';
import ExecutiveKpiGrid from '../components/dashboard/ExecutiveKpiGrid';
import ExecutiveAnalyticsArea from '../components/dashboard/ExecutiveAnalyticsArea';
import ExecutiveRecentActivityPanel from '../components/dashboard/ExecutiveRecentActivityPanel';

// Module 8: AI Dashboard Dedicated 8 Live Widgets
import WarehouseRiskScoreWidget from '../components/dashboard/WarehouseRiskScoreWidget';
import PredictionConfidenceWidget from '../components/dashboard/PredictionConfidenceWidget';
import AiHealthWidget from '../components/dashboard/AiHealthWidget';
import ModelStatusWidget from '../components/dashboard/ModelStatusWidget';
import ConsumptionForecastWidget from '../components/dashboard/ConsumptionForecastWidget';
import InventoryForecastWidget from '../components/dashboard/InventoryForecastWidget';
import TrendAnalysisWidget from '../components/dashboard/TrendAnalysisWidget';
import AiRecommendationsWidget from '../components/dashboard/AiRecommendationsWidget';

// Existing Specialized Cards & Widgets
import WarehouseHealthCard from '../components/dashboard/WarehouseHealthCard';
import CriticalMaterialsCard from '../components/dashboard/CriticalMaterialsCard';
import DeadStockCard from '../components/dashboard/DeadStockCard';
import RackUtilizationCard from '../components/dashboard/RackUtilizationCard';
import PendingActionsCard from '../components/dashboard/PendingActionsCard';
import PredictionEngineDashboardWidget from '../components/PredictionEngineDashboardWidget';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-saas-fade pb-16">
      {/* 1. Dashboard Executive Header */}
      <ExecutiveHeader userName="Executive Manager" />

      {/* 2. Quick Actions Panel */}
      <ExecutiveQuickActionsPanel />

      {/* 3. Real-Time Operational KPI Cards Grid */}
      <ExecutiveKpiGrid />

      {/* Module 1: Centralized AI Prediction Engine Summary */}
      <PredictionEngineDashboardWidget />

      {/* ── MODULE 8: AI DASHBOARD - LIVE WIDGETS SECTION 1 (Core Diagnostics) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            AI Intelligence Diagnostics
          </h2>
          <span className="text-xs text-slate-400 font-mono">Module 8 Core Widgets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <WarehouseRiskScoreWidget />
          <PredictionConfidenceWidget />
          <AiHealthWidget />
          <ModelStatusWidget />
        </div>
      </div>

      {/* ── MODULE 8: AI DASHBOARD - LIVE WIDGETS SECTION 2 (Forecasts & Actions) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            Forecasts & Operational Insights
          </h2>
          <span className="text-xs text-slate-400 font-mono">Module 8 Analytics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ConsumptionForecastWidget />
          <InventoryForecastWidget />
          <TrendAnalysisWidget />
          <AiRecommendationsWidget />
        </div>
      </div>

      {/* 4. Specialized Warehouse & Stock Action Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WarehouseHealthCard />
        <CriticalMaterialsCard />
        <PendingActionsCard />
      </div>

      {/* 5. Executive Analytics & Recharts Area */}
      <ExecutiveAnalyticsArea />

      {/* 6. Secondary Intelligence Cards (Rack Utilization & Dead Stock) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RackUtilizationCard />
        <DeadStockCard />
      </div>

      {/* 7. Recent Warehouse Activity */}
      <ExecutiveRecentActivityPanel />
    </div>
  );
};

export default Dashboard;
