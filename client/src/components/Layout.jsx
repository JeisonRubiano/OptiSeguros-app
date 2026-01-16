import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';

export default function Layout() {
    const [serverStatus, setServerStatus] = useState("Checking...");
    const [appMode, setAppMode] = useState("Unknown");
    const location = useLocation();
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/health`)
            .then(res => res.json())
            .then(data => {
                setServerStatus('Online');
                setAppMode(data.mode);
            })
            .catch(() => {
                setServerStatus('Offline');
                setAppMode("Offline");
            });
    }, []);

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${isActive
            ? 'bg-bolivar-yellow text-slate-800'
            : 'text-white/80 hover:bg-white/10'
        }`;

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Sidebar */}
            <div className="w-64 bg-bolivar-green flex flex-col shadow-2xl relative z-20">
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bolivar-yellow rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-bolivar-green" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">Seguros</h1>
                            <h2 className="text-bolivar-yellow font-bold text-lg leading-tight">Bolívar</h2>
                        </div>
                    </div>
                    <p className="text-emerald-100/80 text-xs mt-3 uppercase tracking-wider font-medium">
                        GERENCIA INTERNACIONAL<br />de Salud
                    </p>
                </div>

                {/* Navigation */}
                {/* Navigation - Scrollable Area */}
                <style>
                    {`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 5px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: rgba(255, 255, 255, 0.05); 
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.2); 
                            border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: rgba(255, 255, 255, 0.3); 
                        }
                    `}
                </style>
                <nav className="flex-1 p-4 space-y-8 overflow-y-auto custom-scrollbar">

                    {/* Grupo: Principal */}
                    <div>
                        <p className="px-4 text-[10px] font-bold text-emerald-100/50 uppercase tracking-widest mb-3">
                            Principal
                        </p>
                        <NavLink to="/dashboard" className={navLinkClass}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="truncate">Dashboard</span>
                        </NavLink>
                    </div>

                    {/* Grupo: Gestión Comercial */}
                    <div>
                        <p className="px-4 text-[10px] font-bold text-emerald-100/50 uppercase tracking-widest mb-3">
                            Gestión Comercial
                        </p>
                        <div className="space-y-1">
                            <NavLink to="/sheets/reporte" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">Reporte Principal</span>
                            </NavLink>

                            <NavLink to="/sheets/detalle" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">Negocios Nuevos</span>
                            </NavLink>

                            <NavLink to="/sheets/renewals" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="truncate">Renovaciones</span>
                            </NavLink>

                            <NavLink to="/sheets/consecutivos" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span className="truncate">Consecutivos</span>
                            </NavLink>
                        </div>
                    </div>

                    {/* Grupo: Financiero */}
                    <div>
                        <p className="px-4 text-[10px] font-bold text-emerald-100/50 uppercase tracking-widest mb-3">
                            Financiero
                        </p>
                        <div className="space-y-1">
                            <NavLink to="/cobros" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="truncate">Gestión Cobros</span>
                            </NavLink>

                            <NavLink to="/sheets/forecast" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span className="truncate">Forecast Cierre</span>
                            </NavLink>
                        </div>
                    </div>

                    {/* Grupo: Operativo */}
                    <div>
                        <p className="px-4 text-[10px] font-bold text-emerald-100/50 uppercase tracking-widest mb-3">
                            Operativo
                        </p>
                        <div className="space-y-1">
                            <NavLink to="/sheets/cancelaciones" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="truncate">Cancelaciones</span>
                            </NavLink>

                            <NavLink to="/oracle" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                <span className="truncate">Oracle Consultas</span>
                            </NavLink>

                            <NavLink to="/help" className={navLinkClass}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="truncate">Ayuda</span>
                            </NavLink>
                        </div>
                    </div>
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bolivar-yellow rounded-full flex items-center justify-center text-bolivar-green font-bold">
                            JR
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">{user?.name || 'Usuario'}</p>
                            <p className="text-emerald-200 text-xs">Analista</p>
                        </div>
                    </div>
                </div>

                {/* Logout Section */}
                <div className="p-4 border-t border-white/10 mx-2 mb-2">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all group"
                    >
                        <svg className="w-5 h-5 text-red-300 group-hover:text-red-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <NavLink to="/dashboard" className="hover:text-bolivar-green">Inicio</NavLink>
                        <span>/</span>
                        <span className="text-slate-700 capitalize">
                            {location.pathname.split('/').filter(Boolean).pop() || 'Dashboard'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${serverStatus === 'Online'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${serverStatus === 'Online' ? 'bg-emerald-500' : 'bg-red-500'
                                }`}></span>
                            Servidor: {serverStatus}
                        </div>
                        <div className="bg-bolivar-yellow text-bolivar-green px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {appMode}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
