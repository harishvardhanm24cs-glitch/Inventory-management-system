import React from 'react';
import { LayoutDashboard, Package, Settings, BarChart2 } from 'lucide-react';

function App() {
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">RM Monitor</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)', fontWeight: 600 }}>
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
            <Package size={20} /> Inventory
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
            <BarChart2 size={20} /> Analytics
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', marginTop: 'auto' }}>
            <Settings size={20} /> Settings
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <h1>Raw Material Overview</h1>
          <p>Enterprise manufacturing controls and limits tracking</p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div className="glass-card">
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase' }}>Total Active Materials</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0, color: 'var(--primary)' }}>1,482</p>
          </div>
          
          <div className="glass-card">
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase' }}>Critical Alerts</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0, color: '#ef4444' }}>3</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
