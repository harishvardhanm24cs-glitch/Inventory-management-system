import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Inventory from './pages/Inventory';
import ScanPage from './pages/ScanPage';
import WarehouseTwin from './pages/WarehouseTwin';
import RackView from './pages/RackView';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import BatchInventory from './pages/BatchInventory';
import { CreateBarcode } from './pages/CreateBarcode';
import IoTConsole from './pages/IoTConsole';
import ProductionCheck from './pages/ProductionCheck';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SubstitutionManager from './pages/SubstitutionManager';
import Transactions from './pages/Transactions';
import UserGuide from './pages/UserGuide';
import Scanner from './pages/Scanner';
import OutwardScanner from './pages/OutwardScanner';
import BulkQRGenerator from './pages/BulkQRGenerator';
import QRRegistry from './pages/QRRegistry';
import QRHistory from './pages/QRHistory';
import AIInsights from './pages/AIInsights';
import Reports from './pages/Reports';
import ManagerDashboard from './pages/ManagerDashboard';
import QRTraceability from './pages/QRTraceability';
import HealthDashboard from './pages/HealthDashboard';
import TestCenter from './pages/TestCenter';
import AuditLog from './pages/AuditLog';
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import BackendStatus from './components/ui/BackendStatus';

function App() {
  console.log('App rendering');
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
            <Toaster position="top-right" />
            <BackendStatus />
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
                  title="Create an account" 
                  subtitle="Join the RM Monitoring system"
                >
                  <Signup />
                </AuthLayout>
              } />

              {/* Protected Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/remove-rm" element={<ScanPage />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/outward-scanner" element={<OutwardScanner />} />
                <Route path="/bulk-qr" element={<BulkQRGenerator />} />
                <Route path="/qr-registry" element={<QRRegistry />} />
                <Route path="/qr-history" element={<QRHistory />} />
                <Route path="/warehouse" element={<WarehouseTwin />} />
                <Route path="/map" element={<RackView />} />
                <Route path="/batches" element={<BatchInventory />} />
                <Route path="/production-check" element={<ProductionCheck />} />
                <Route path="/iot-console" element={<IoTConsole />} />
                <Route path="/iota-console" element={<Navigate to="/iot-console" replace />} />
                <Route path="/substitutes" element={<SubstitutionManager />} />
                <Route path="/create-barcode" element={<CreateBarcode />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/ai-insights" element={<AIInsights />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/manager-dashboard" element={<ManagerDashboard />} />
                <Route path="/qr-traceability" element={<QRTraceability />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<UserGuide />} />
                <Route path="/health" element={<HealthDashboard />} />
                <Route path="/tests" element={<TestCenter />} />
                
                {/* Fallback Route inside Layout */}
                <Route path="*" element={
                  <div className="flex h-[80vh] items-center justify-center text-xl font-semibold text-gray-500">
                    Page Not Found
                  </div>
                } />
              </Route>
            </Routes>
          </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
