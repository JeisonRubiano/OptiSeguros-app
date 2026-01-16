import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ConsecutivosPendientesTable from '../components/ConsecutivosPendientesTable';

import { fetchWithAuth } from '../utils/api';
import { useCache } from '../context/CacheContext';

export default function ConsecutivosView() {
    const { sheet } = useParams();

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [availableSheets, setAvailableSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState(sheet || '');
    const [apiMode, setApiMode] = useState('mock');
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(false);
    const { getCache, setCache, clearCache } = useCache();

    useEffect(() => {
        loadSheets();
    }, []);

    useEffect(() => {
        if (selectedSheet) {
            loadData(selectedSheet);
        }
    }, [selectedSheet]);

    const loadSheets = async () => {
        // Check cache first
        const cached = getCache('consecutivos-metadata');
        if (cached) {
            setAvailableSheets(cached.data.sheets);
            setApiMode(cached.data.mode || 'mock');
            if (!selectedSheet && cached.data.default) {
                setSelectedSheet(cached.data.default);
            }
            return;
        }

        try {
            const res = await fetchWithAuth('/api/consecutivos-pendientes');
            const result = await res.json();

            if (result.success && result.data?.type === 'multi_sheet_metadata') {
                setAvailableSheets(result.data.sheets);
                setApiMode(result.mode || 'mock');

                // Cache the result
                setCache('consecutivos-metadata', {
                    sheets: result.data.sheets,
                    mode: result.mode,
                    default: result.data.default
                });

                if (!selectedSheet && result.data.default) {
                    setSelectedSheet(result.data.default);
                }
            } else {
                setError('Error cargando meses disponibles');
            }
        } catch (error) {
            console.error('Error loading sheets:', error);
            setError('Error de conexión con el servidor');
        }
    };

    const loadData = async (sheetName) => {
        setLoading(true);
        setError(null);

        // Check cache first
        const cacheKey = `consecutivos-data-${sheetName}`;
        const cached = getCache(cacheKey);
        if (cached) {
            setData(cached.data.data);
            setApiMode(cached.data.mode);
            setLoading(false);
            return;
        }

        try {
            const res = await fetchWithAuth(`/api/consecutivos-pendientes/${encodeURIComponent(sheetName)}`);
            const result = await res.json();

            if (result.success) {
                setData(result.data);
                setApiMode(result.mode);
                // Cache the result
                setCache(cacheKey, {
                    data: result.data,
                    mode: result.mode
                });
            } else {
                setError('Error cargando datos del mes');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        if (selectedSheet) {
            // Invalidate cache for current view
            const cacheKey = `consecutivos-data-${selectedSheet}`;
            clearCache(cacheKey);
            loadData(selectedSheet);
        }
    };

    const toggleApiMode = async () => {
        try {
            const newMode = apiMode === 'mock' ? 'real' : 'mock';
            const res = await fetchWithAuth(`/api/consecutivos/set-mode?mode=${newMode}`, {
                method: 'POST'
            });
            const result = await res.json();

            if (result.success) {
                setApiMode(result.mode);
            }
        } catch (error) {
            console.error('Error changing mode:', error);
        }
    };

    const handleUpdateMonthEstados = async () => {
        if (!selectedSheet) return;

        setUpdating(true);
        try {
            // Parsear el mes seleccionado (ej: "DIC 2024")
            const [month, year] = selectedSheet.split(' ');

            const res = await fetchWithAuth('/api/consecutivos/update-month-estados', {
                method: 'POST',
                body: JSON.stringify({ month, year: parseInt(year) })
            });

            const result = await res.json();

            if (result.success) {
                alert(`Actualización iniciada para ${selectedSheet}. Los estados se actualizarán en segundo plano.`);

                // Invalidate cache immediately so new data is fetched next time
                const cacheKey = `consecutivos-data-${selectedSheet}`;
                clearCache(cacheKey);

                // Recargar datos después de un momento
                setTimeout(() => {
                    handleRefresh();
                }, 2000);
            }
        } catch (error) {
            console.error('Error updating estados:', error);
            alert('Error al iniciar actualización de estados');
        } finally {
            setUpdating(false);
        }
    };

    // Determinar si el mes seleccionado es de 2024 (para mostrar botón de actualización manual)
    const is2024Month = selectedSheet && selectedSheet.includes('2024');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <Link to="/dashboard" className="hover:text-bolivar-green">Inicio</Link>
                        <span>/</span>
                        <span className="text-slate-700">Consecutivos Pendientes</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Consecutivos Pendientes</h1>
                    <p className="text-sm text-slate-500 mt-1">Negocios sin fecha de expedición - Por mes</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* API Mode Toggle */}
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                        <span className="text-xs font-medium text-slate-600">Modo API:</span>
                        <button
                            onClick={toggleApiMode}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${apiMode === 'mock'
                                ? 'bg-amber-500 text-white'
                                : 'bg-green-600 text-white'
                                }`}
                        >
                            {apiMode === 'mock' ? 'Simulación' : 'Real'}
                        </button>
                    </div>

                    {/* Update Month Button (General) */}
                    <button
                        onClick={handleUpdateMonthEstados}
                        disabled={updating}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${updating
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-bolivar-green text-white hover:bg-green-700'
                            }`}
                    >
                        {updating ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Actualizando...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                                Actualizar estado Consecutivos
                            </>
                        )}
                    </button>

                    <Link to="/dashboard" className="text-sm text-bolivar-green hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Volver al Dashboard
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Sheet Selector */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
                    {availableSheets.map((sheetName) => (
                        <button
                            key={sheetName}
                            onClick={() => setSelectedSheet(sheetName)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${selectedSheet === sheetName
                                ? 'bg-bolivar-green text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {sheetName}
                        </button>
                    ))}
                </div>

                {/* Data Display */}
                <div className="p-4">
                    {error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-red-800">{error}</h3>
                            <p className="text-red-600 text-sm mt-1">Verifica que el servidor esté ejecutándose</p>
                            <button
                                onClick={handleRefresh}
                                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bolivar-green"></div>
                            <span className="ml-3 text-slate-600">Cargando datos...</span>
                        </div>
                    ) : data.length > 0 ? (
                        <ConsecutivosPendientesTable
                            data={data}
                            title={`Consecutivos: ${selectedSheet}`}
                            onRefresh={handleRefresh}
                        />
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <p className="font-medium">Selecciona un mes para ver los consecutivos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Card */}
            {!loading && !error && selectedSheet && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-blue-900 mb-1">Información importante</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                                <li>• Los valores de <strong>Prima</strong> son editables y se guardan automáticamente en tu navegador</li>
                                <li>• Haz clic en <strong>Consultar</strong> para obtener el estado actualizado de cada consecutivo</li>
                                {is2024Month ? (
                                    <li>• <strong>Mes de 2024</strong>: Usa el botón "Actualizar Estados" para consultar todos los estados del mes</li>
                                ) : (
                                    <li>• <strong>Mes de 2025</strong>: Los estados se actualizan automáticamente cada 2 horas</li>
                                )}
                                <li>• El modo <strong>{apiMode === 'mock' ? 'Simulación' : 'Real'}</strong> está activo para las consultas de estado</li>
                                <li>• Los filtros por Regional y Sucursal te ayudan a encontrar registros específicos</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
