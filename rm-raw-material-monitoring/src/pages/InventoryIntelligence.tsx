import React, { useState, useMemo } from 'react';
import { Brain, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';
import type {
  ClassifiedMaterialItem,
  StockHealthCategory
} from '../utils/inventoryIntelligenceUtils';
import {
  classifyMaterialItem,
  calculateHealthCategoryCounts
} from '../utils/inventoryIntelligenceUtils';

import { IntelligenceSummaryBar } from '../components/inventory-intelligence/IntelligenceSummaryBar';
import { IntelligenceControlsBar } from '../components/inventory-intelligence/IntelligenceControlsBar';
import type { SortOption } from '../components/inventory-intelligence/IntelligenceControlsBar';
import { IntelligenceCategorySection } from '../components/inventory-intelligence/IntelligenceCategorySection';

const InventoryIntelligence: React.FC = () => {
  const { materials, loading, refreshData } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState<StockHealthCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('urgency');

  
  const classifiedMaterials = useMemo(() => {
    return (materials || []).map(classifyMaterialItem);
  }, [materials]);

  
  const categoryCounts = useMemo(() => {
    return calculateHealthCategoryCounts(classifiedMaterials);
  }, [classifiedMaterials]);

  
  const filteredMaterials = useMemo(() => {
    return classifiedMaterials.filter((item) => {
      
      if (selectedCategory !== 'all' && item.healthCategory !== selectedCategory) {
        return false;
      }
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.barcode.toLowerCase().includes(q);
        const matchRack = item.location.toLowerCase().includes(q);
        return matchName || matchCode || matchRack;
      }
      return true;
    });
  }, [classifiedMaterials, selectedCategory, searchQuery]);

  
  const sortedMaterials = useMemo(() => {
    const list = [...filteredMaterials];
    return list.sort((a, b) => {
      if (sortOption === 'urgency') {
        return a.urgencyRank - b.urgencyRank;
      }
      if (sortOption === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortOption === 'qty-asc') {
        return a.stock - b.stock;
      }
      if (sortOption === 'qty-desc') {
        return b.stock - a.stock;
      }
      return 0;
    });
  }, [filteredMaterials, sortOption]);

  
  const criticalItems = useMemo(
    () => sortedMaterials.filter((m) => m.healthCategory === 'critical'),
    [sortedMaterials]
  );
  const lowItems = useMemo(
    () => sortedMaterials.filter((m) => m.healthCategory === 'low'),
    [sortedMaterials]
  );
  const overstockItems = useMemo(
    () => sortedMaterials.filter((m) => m.healthCategory === 'overstock'),
    [sortedMaterials]
  );
  const healthyItems = useMemo(
    () => sortedMaterials.filter((m) => m.healthCategory === 'healthy'),
    [sortedMaterials]
  );

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Brain className="text-cyan-500" />
            Inventory Intelligence Unit
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Automated stock health classification, safety threshold monitoring, and action recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => refreshData()}
            className="bg-white border border-slate-200 text-xs font-semibold"
          >
            <RefreshCw size={14} className="mr-2 text-cyan-500" />
            Recalculate Health
          </Button>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-mono font-bold text-cyan-500 border border-cyan-500/20 flex items-center gap-1.5">
            <Sparkles size={12} className="animate-pulse" /> Live Analysis Active
          </span>
        </div>
      </div>

      
      <IntelligenceSummaryBar
        counts={categoryCounts}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      
      <IntelligenceControlsBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortOption={sortOption}
        onSortChange={setSortOption}
      />

      
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Classifying inventory stock health...</p>
        </div>
      )}

      
      {!loading && sortedMaterials.length === 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 text-center backdrop-blur-md">
          <ShieldAlert className="mx-auto h-10 w-10 text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-slate-200">No Matching Materials Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or switching category filter tabs.
          </p>
        </div>
      )}

      
      {!loading && sortedMaterials.length > 0 && (
        <div className="space-y-6">
          
          <IntelligenceCategorySection
            category="critical"
            title="Critical Stock Tiers"
            description="Materials at or below 50% safety limit requiring immediate replenishment"
            items={criticalItems}
          />

          
          <IntelligenceCategorySection
            category="low"
            title="Low Stock Warnings"
            description="Materials approaching minimum threshold requiring scheduled reorder"
            items={lowItems}
          />

          
          <IntelligenceCategorySection
            category="overstock"
            title="Overstock Detections"
            description="Materials exceeding maximum recommended storage limits"
            items={overstockItems}
          />

          
          <IntelligenceCategorySection
            category="healthy"
            title="Healthy Stock Tiers"
            description="Materials operating within optimal threshold ranges"
            items={healthyItems}
          />
        </div>
      )}
    </div>
  );
};

export default InventoryIntelligence;
