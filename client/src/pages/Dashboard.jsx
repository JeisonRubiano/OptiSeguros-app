import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useCache } from '../context/CacheContext';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [syncing, setSyncing] = useState(false);
    const { getCache, setCache, clearAllCache } = useCache();

    useEffect(() => {
        loadStats();
    }, [selectedDate]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/admin/sync-google`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Error en sincronización');

            // Clear all cache to reflect new data everywhere
            clearAllCache();

            alert("¡Datos actualizados desde Google Sheets correctamente!");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Error al sincronizar: " + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const loadStats = async () => {
        setLoading(true);
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;

        // Check cache first
        const cacheKey = `dashboard-stats-${year}-${month}`;
        const cached = getCache(cacheKey);
        if (cached) {
            setStats(cached.data);
            setLoading(false);
            return;
        }

        try {
            const res = await fetchWithAuth(`/api/dashboard/stats?year=${year}&month=${month}`);
            const data = await res.json();
            if (data.success) {
                setStats(data);
                // Cache the result
                setCache(cacheKey, data);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (e) => {
        const [year, month] = e.target.value.split('-');
        setSelectedDate(new Date(year, month - 1));
    };

    return (
        <div className="space-y-8">
            {/* Header with Month Selector */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Resumen general y alertas operativas
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${syncing
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white text-bolivar-green border border-bolivar-green hover:bg-bolivar-green hover:text-white shadow-sm'
                            }`}
                    >
                        {syncing ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sincronizando...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Actualizar
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                        <span className="text-sm font-medium text-slate-600 pl-2">Periodo:</span>
                        <input
                            type="month"
                            value={selectedDate.toISOString().slice(0, 7)}
                            onChange={handleMonthChange}
                            className="border-none focus:ring-0 text-slate-700 font-bold bg-transparent cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bolivar-green"></div>
                </div>
            ) : stats ? (
                <>
                    {/* Stats Recap (Top Level KPIs) - New Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        {/* KPI 1: Efectividad Recaudo */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-bolivar-green transition-colors">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Efectividad Recaudo</p>
                                <h3 className="text-2xl font-extrabold text-slate-800">{stats.summary.efectividad_recaudo}%</h3>
                            </div>
                            <div className={`text-xs font-bold mt-2 ${stats.summary.efectividad_recaudo > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {stats.summary.efectividad_recaudo > 70 ? '▲ Meta: Sobre 70%' : '▼ Meta: Mejorar'}
                            </div>
                        </div>

                        {/* KPI 2: Total Gestionado (Sum of pending + collected) */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-bolivar-green transition-colors">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Monto Total</p>
                                <h3 className="text-2xl font-extrabold text-slate-800">
                                    ${(stats.summary.total_usd_recaudadas + stats.summary.total_usd_pendientes + stats.summary.total_usd_anuladas).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </h3>
                            </div>
                            <div className="text-xs text-slate-400 font-medium mt-2">
                                {stats.summary.total} Pólizas procesadas
                            </div>
                        </div>

                        {/* KPI 3: Pendiente por Recuadar */}
                        <Link to="/sheets/consecutivos" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-amber-400 cursor-pointer transition-colors group">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 group-hover:text-amber-600">Por Recaudar</p>
                                <h3 className="text-2xl font-extrabold text-slate-800">
                                    ${(stats.summary.total_usd_pendientes).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </h3>
                            </div>
                            <div className="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1">
                                ⚠️ {stats.summary.pendientes} pólizas
                            </div>
                        </Link>

                        {/* KPI 4: Forecast (Mocked for now or use available data) */}
                        <Link to="/sheets/forecast" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-blue-400 cursor-pointer transition-colors group">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 group-hover:text-blue-600">Proyección (Forecast)</p>
                                <h3 className="text-2xl font-extrabold text-slate-800">Ver Proyección</h3>
                            </div>
                            <div className="text-xs text-blue-500 font-bold mt-2">
                                Ir al módulo →
                            </div>
                        </Link>
                    </div>

                    {/* Charts & Alerts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Policy Status Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                            <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                                <span className="w-2 h-6 bg-bolivar-green rounded-full"></span>
                                Estado de Pólizas ({stats.month}/{stats.year})
                            </h3>

                            <div className="flex flex-col md:flex-row items-center gap-8 flex-1 justify-center">
                                {/* Pie Chart Visualization using CSS Conic Gradient */}
                                <div className="relative w-48 h-48 rounded-full flex-shrink-0"
                                    style={{
                                        background: `conic-gradient(
                                            #10b981 0% ${stats.summary.recaudo_percentage_count}%, 
                                            #f59e0b ${stats.summary.recaudo_percentage_count}% ${(stats.summary.recaudo_percentage_count + (stats.summary.pendientes / stats.summary.total * 100))}%,
                                            #ef4444 ${(stats.summary.recaudo_percentage_count + (stats.summary.pendientes / stats.summary.total * 100))}% 100%
                                        )`
                                    }}>
                                    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center flex-col shadow-inner">
                                        <span className="text-2xl font-extrabold text-slate-800">{stats.summary.total}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pólizas</span>
                                    </div>
                                </div>

                                {/* Legend with Financials */}
                                <div className="flex-1 space-y-3 w-full">
                                    <div className="flex items-center justify-between p-2 pl-3 rounded-lg hover:bg-emerald-50 transition-colors border-l-4 border-emerald-500">
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Recaudadas</div>
                                            <div className="text-lg font-bold text-slate-800">${(stats.summary.total_usd_recaudadas).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-emerald-600">{stats.summary.recaudadas}</div>
                                            <div className="text-[10px] font-bold text-emerald-800/60 bg-emerald-100 px-1.5 py-0.5 rounded-full inline-block">
                                                {stats.summary.recaudo_percentage_count}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-2 pl-3 rounded-lg hover:bg-amber-50 transition-colors border-l-4 border-amber-500">
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pendientes</div>
                                            <div className="text-lg font-bold text-slate-800">${(stats.summary.total_usd_pendientes).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-amber-600">{stats.summary.pendientes}</div>
                                            <div className="text-[10px] font-bold text-amber-800/60 bg-amber-100 px-1.5 py-0.5 rounded-full inline-block">Prioridad</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-2 pl-3 rounded-lg hover:bg-red-50 transition-colors border-l-4 border-red-500">
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Anuladas</div>
                                            <div className="text-lg font-bold text-slate-800">${(stats.summary.total_usd_anuladas).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-red-600">{stats.summary.anuladas}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Alerts Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-red-500 rounded-full"></span>
                                    Gestionar Cobros ({'>'}20 días)
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                                        {stats.alerts.pendientes_20_dias_count} Pendientes
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-3 custom-scrollbar">
                                {stats.alerts.pendientes_20_dias_list.length > 0 ? (
                                    stats.alerts.pendientes_20_dias_list.map((poliza, idx) => (
                                        <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 hover:border-red-300 hover:shadow-md transition-all group flex justify-between items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-800 text-sm">#{poliza.CONSECUTIVO}</span>
                                                    <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">
                                                        +{poliza.dias_pendiente} días
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 truncate font-medium">
                                                    {poliza.ASEGURADO || 'Sin Asegurado'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    {poliza['SUCURSAL'] || 'Sin Sucursal'} • {poliza['FECHA EXPEDICION NEGOCIO DIA-MES-AÑO']}
                                                </div>
                                            </div>

                                            {/* WhatsApp Button */}
                                            <a
                                                href={`https://wa.me/?text=${encodeURIComponent(`Hola, favor gestionar cobro de póliza #${poliza['NUMERO POLIZA'] || poliza['NUMERO_POLIZA'] || poliza.CONSECUTIVO} de ${poliza.ASEGURADO || 'cliente'} (${poliza.SUCURSAL || ''}). Está pendiente hace ${poliza.dias_pendiente} días.`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-sm transition-transform active:scale-95 flex-shrink-0"
                                                title="Enviar recordatorio por WhatsApp"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                            </a>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                                        <span className="text-4xl mb-2 opacity-50">🎉</span>
                                        <p className="text-sm font-medium">Todo al día</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    No hay datos disponibles para el periodo seleccionado.
                </div>
            )}
        </div>
    );
}
