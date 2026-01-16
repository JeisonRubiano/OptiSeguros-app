import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DetalleView from './pages/DetalleView';
import ConsecutivosView from './pages/ConsecutivosView';
import ForecastView from './pages/ForecastView';
import ReporteView from './pages/ReporteView';
import RenewalsView from './pages/RenewalsView';
import OracleView from './pages/OracleView';
import HelpView from './pages/HelpView';
import CancelacionesView from './pages/CancelacionesView';
import CobrosView from './pages/CobrosView';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { CacheProvider } from './context/CacheContext';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <CacheProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />

                            <Route element={<PrivateRoute />}>
                                <Route path="/" element={<Layout />}>
                                    {/* Redirect root to dashboard */}
                                    <Route index element={<Navigate to="/dashboard" replace />} />

                                    {/* Main routes */}
                                    <Route path="dashboard" element={<Dashboard />} />

                                    {/* Sheets routes */}
                                    <Route path="sheets">
                                        <Route path="reporte" element={<ReporteView />} />
                                        <Route path="detalle" element={<DetalleView />} />
                                        <Route path="consecutivos" element={<ConsecutivosView />} />
                                        <Route path="consecutivos/:sheet" element={<ConsecutivosView />} />
                                        <Route path="renewals" element={<RenewalsView />} />
                                        <Route path="forecast" element={<ForecastView />} />
                                        <Route path="forecast/:sheet" element={<ForecastView />} />
                                        <Route path="cancelaciones" element={<CancelacionesView />} />
                                    </Route>

                                    {/* Other routes */}
                                    <Route path="cobros" element={<CobrosView />} />
                                    <Route path="oracle" element={<OracleView />} />
                                    <Route path="help" element={<HelpView />} />

                                    {/* Catch-all redirect */}
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Route>
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </CacheProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}

export default App;
