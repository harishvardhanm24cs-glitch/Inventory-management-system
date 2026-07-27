import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import BackendStatus from './components/ui/BackendStatus';

// Dynamic Lazy Imports for Code Splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const Inventory = lazy(() => import('./pages/Inventory'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const WarehouseTwin = lazy(() => import('./pages/WarehouseTwin'));
const RackView = lazy(() => import('./pages/RackView'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Analytics = lazy(() => import('./pages/Analytics'));
const BatchInventory = lazy(() => import('./pages/BatchInventory'));
const CreateBarcode = lazy(() => import('./pages/CreateBarcode').then(m => ({ default: m.CreateBarcode })));
const IoTConsole = lazy(() => import('./pages/IoTConsole'));
const ProductionCheck = lazy(() => import('./pages/ProductionCheck'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const SubstitutionManager = lazy(() => import('./pages/SubstitutionManager'));
const Transactions = lazy(() => import('./pages/Transactions'));
const UserGuide = lazy(() => import('./pages/UserGuide'));
const Scanner = lazy(() => import('./pages/Scanner'));
const OutwardScanner = lazy(() => import('./pages/OutwardScanner'));
const BulkQRGenerator = lazy(() => import('./pages/BulkQRGenerator'));
const QRRegistry = lazy(() => import('./pages/QRRegistry'));
const QRHistory = lazy(() => import('./pages/QRHistory'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const Reports = lazy(() => import('./pages/Reports'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const QRTraceability = lazy(() => import('./pages/QRTraceability'));
const HealthDashboard = lazy(() => import('./pages/HealthDashboard'));
const TestCenter = lazy(() => import('./pages/TestCenter'));
const InventoryIntelligence = lazy(() => import('./pages/InventoryIntelligence'));
const WarehouseUtilizationDashboard = lazy(() => import('./pages/WarehouseUtilizationDashboard'));
const MaterialConsumptionAnalytics = lazy(() => import('./pages/MaterialConsumptionAnalytics'));
const OperationalRecommendationsPage = lazy(() => import('./pages/OperationalRecommendationsPage'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const TrainingPlatformConsole = lazy(() => import('./pages/TrainingPlatformConsole'));

const PageLoadingFallback = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 rounded-2xl bg-slate-900/40 p-12 border border-slate-800" role="status" aria-label="Loading page module">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent text-cyan-500" />
    <p className="animate-pulse text-xs font-semibold text-slate-400">Loading module...</p>
  </div>
);

function App() {
  console.log('App rendering');
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
            <Toaster position="top-right" />
            <BackendStatus />
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={
                  <AuthLayout 
                    title="Paint RM Monitor" 
                    subtitle="Sign in to your dashboard"
                  >
                    <Login />
                  </AuthLayout>
                } />
                <Route path="/signup" element={
                  <AuthLayout 
                    title="Paint RM Monitor" 
                    subtitle="Create your account"
                  >
                    <Signup />
                  </AuthLayout>
                } />

                {/* Dashboard Layout Routes */}
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/inventory-intelligence" element={<InventoryIntelligence />} />
                  <Route path="/warehouse-utilization" element={<WarehouseUtilizationDashboard />} />
                  <Route path="/batches" element={<BatchInventory />} />
                  <Route path="/scan" element={<ScanPage />} />
                  <Route path="/scanner" element={<Scanner />} />
                  <Route path="/outward-scanner" element={<OutwardScanner />} />
                  <Route path="/bulk-qr" element={<BulkQRGenerator />} />
                  <Route path="/qr-registry" element={<QRRegistry />} />
                  <Route path="/qr-history" element={<QRHistory />} />
                  <Route path="/create-barcode" element={<CreateBarcode />} />
                  <Route path="/twin" element={<WarehouseTwin />} />
                  <Route path="/warehouse" element={<WarehouseTwin />} />
                  <Route path="/rack-view" element={<RackView />} />
                  <Route path="/map" element={<RackView />} />
                  <Route path="/iot-console" element={<IoTConsole />} />
                  <Route path="/production-check" element={<ProductionCheck />} />
                  <Route path="/substitution" element={<SubstitutionManager />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/consumption-analytics" element={<MaterialConsumptionAnalytics />} />
                  <Route path="/recommendations" element={<OperationalRecommendationsPage />} />
                  <Route path="/ai-insights" element={<AIInsights />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/manager-dashboard" element={<ManagerDashboard />} />
                  <Route path="/qr-traceability" element={<QRTraceability />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/notifications" element={<Alerts />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/audit" element={<AuditLog />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/guide" element={<UserGuide />} />
                  <Route path="/health" element={<HealthDashboard />} />
                  <Route path="/tests" element={<TestCenter />} />
                  <Route path="/training-platform" element={<TrainingPlatformConsole />} />
                  
                  {/* Fallback Route inside Layout */}
                  <Route path="*" element={
                    <div className="flex h-[80vh] items-center justify-center text-xl font-semibold text-gray-500">
                      Page Not Found
                    </div>
                  } />
                </Route>
              </Routes>
            </Suspense>
          </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
