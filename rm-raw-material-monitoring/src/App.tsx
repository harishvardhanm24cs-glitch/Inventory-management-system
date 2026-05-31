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
import { BarcodeRegistry } from './pages/BarcodeRegistry';
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
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';
import { InventoryProvider } from './context/InventoryContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import BackendStatus from './components/ui/BackendStatus';

function App() {
  console.log('App rendering');
  return (
    <AuthProvider>
      <ThemeProvider>
        <InventoryProvider>
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
                <Route path="/warehouse" element={<WarehouseTwin />} />
                <Route path="/map" element={<RackView />} />
                <Route path="/batches" element={<BatchInventory />} />
                <Route path="/production-check" element={<ProductionCheck />} />
                <Route path="/iot-console" element={<IoTConsole />} />
                <Route path="/iota-console" element={<Navigate to="/iot-console" replace />} />
                <Route path="/substitutes" element={<SubstitutionManager />} />
                <Route path="/create-barcode" element={<CreateBarcode />} />
                <Route path="/barcode-registry" element={<BarcodeRegistry />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<UserGuide />} />
                
                {/* Fallback Route inside Layout */}
                <Route path="*" element={
                  <div className="flex h-[80vh] items-center justify-center text-xl font-semibold text-gray-500">
                    Page Not Found
                  </div>
                } />
              </Route>
            </Routes>
          </Router>
        </InventoryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
