import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';

import { fetchWithAuth } from '../utils/api';

export default function ReporteView() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 100;

    useEffect(() => {
        loadReporteData();
    }, [page]);

    const loadReporteData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(`/api/reporte/all?page=${page}&page_size=${pageSize}`);
            const result = await res.json();

            if (result.success && result.data && Array.isArray(result.data)) {
                setData(result.data);
                setTotal(result.total);
                setTotalPages(result.total_pages);
            } else {
                setError(result.error || 'No se pudieron cargar los datos del reporte');
            }
        } catch (err) {
            console.error('Error loading reporte:', err);
            setError('Error al cargar los datos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Reporte Principal</h1>
                    <p className="text-slate-600 mt-1">
                        Vista general de todos los negocios
                        {total > 0 && ` - ${total.toLocaleString()} registros totales`}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 rounded bg-bolivar-green text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
                            >
                                ← Anterior
                            </button>
                            <span className="text-sm font-medium text-slate-700">
                                Página {page} de {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 rounded bg-bolivar-green text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 bg-bolivar-green text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al Dashboard
                    </Link>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bolivar-green"></div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Data Table */}
            {!loading && !error && (
                <DataTable
                    data={data}
                    title="REPORTE - Todos los Negocios"
                />
            )}
        </div>
    );
}
