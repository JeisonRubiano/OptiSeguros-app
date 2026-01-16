import { useState, useEffect } from 'react';

import { fetchWithAuth } from '../utils/api';

const ESTADOS_CANCELACION = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Anulada', label: 'Anulada' },
    { value: 'Rehabilitada', label: 'Rehabilitada' },
    { value: 'Cambio de Poliza', label: 'Cambio de Poliza' }
];

export default function CancelacionesView() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/cancelaciones');
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            } else {
                setError("Error loading data");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (policyId, field, value) => {
        // Optimistic update
        setData(prevData => prevData.map(row => {
            if (String(row.NUMERO_POLIZA) === String(policyId)) {
                return { ...row, [field === 'estado_actual' ? 'ESTADO_ACTUAL' : 'CAUSAL SAGES MANAGEMENT']: value };
            }
            return row;
        }));

        try {
            await fetchWithAuth('/api/cancelaciones/update', {
                method: 'POST',
                body: JSON.stringify({
                    policy_id: String(policyId),
                    field: field,
                    value: value
                })
            });
        } catch (err) {
            console.error("Error updating:", err);
            // Revert on error? For now, just log.
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        // Placeholder for Google Sheets Sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert("Sincronización con Google Sheets próximamente");
        setSyncing(false);
    };

    // Filter data
    const filteredData = data.filter(row =>
        Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const getRowColor = (estado) => {
        if (estado === 'Anulada') return 'bg-red-200 hover:bg-red-300 border-l-4 border-l-red-600';
        if (estado === 'Rehabilitada' || estado === 'Cambio de Poliza') return 'bg-emerald-200 hover:bg-emerald-300 border-l-4 border-l-emerald-600';
        return 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent';
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando cancelaciones...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    // Determine columns to show (excluding internal keys if any, prioritizing specific order)
    // Based on user request: NUMERO_POLIZA, TIPO DE NEGOCIO, ...
    // We want ESTADO_ACTUAL first.
    const baseColumns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'ESTADO_ACTUAL' && k !== 'CAUSAL SAGES MANAGEMENT') : [];
    // User requested order: ESTADO_ACTUAL, NUMERO_POLIZA, ... CAUSAL SAGES MANAGEMENT ...

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Seguimiento Cancelaciones</h1>
                    <p className="text-slate-500">Gestión y verificación de pólizas canceladas</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {syncing ? (
                            <svg className="animate-spin w-5 h-5 text-bolivar-green" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        )}
                        {syncing ? 'Sincronizando...' : 'Descargar hoja'}
                    </button>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bolivar-green focus:border-transparent w-full md:w-64"
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden flex flex-col">
                <div className="overflow-auto max-h-[calc(100vh-220px)]">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap min-w-[220px] border border-slate-300 bg-slate-100 sticky left-0 z-30">Estado Actual</th>
                                <th className="px-4 py-3 whitespace-nowrap min-w-[300px] border border-slate-300 bg-slate-100">Causal Sages Management</th>
                                {baseColumns.map(col => (
                                    <th key={col} className="px-4 py-3 whitespace-nowrap border border-slate-300 bg-slate-100 min-w-[120px]">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {filteredData.map((row, idx) => (
                                <tr key={idx} className={`transition-colors ${getRowColor(row['ESTADO_ACTUAL'])}`}>
                                    <td className="px-4 py-2 whitespace-nowrap sticky left-0 z-10 border-r border-b border-slate-300 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <select
                                            value={row['ESTADO_ACTUAL'] || 'Pendiente'}
                                            onChange={(e) => handleUpdate(row['NUMERO_POLIZA'], 'estado_actual', e.target.value)}
                                            className={`
                                                block w-full px-3 py-1.5 rounded border border-slate-300 text-slate-800 font-bold text-xs ring-0 focus:ring-2 focus:ring-bolivar-green
                                                ${row['ESTADO_ACTUAL'] === 'Anulada' ? 'bg-red-200 text-red-900 border-red-300' : ''}
                                                ${row['ESTADO_ACTUAL'] === 'Rehabilitada' ? 'bg-emerald-200 text-emerald-900 border-emerald-300' : ''}
                                                ${row['ESTADO_ACTUAL'] === 'Cambio de Poliza' ? 'bg-emerald-200 text-emerald-900 border-emerald-300' : ''}
                                            `}
                                        >
                                            {ESTADOS_CANCELACION.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2 min-w-[300px] border border-slate-300">
                                        <input
                                            type="text"
                                            defaultValue={row['CAUSAL SAGES MANAGEMENT'] || ''}
                                            onBlur={(e) => handleUpdate(row['NUMERO_POLIZA'], 'causal_sages', e.target.value)}
                                            className="w-full bg-transparent border-0 hover:bg-white/50 focus:bg-white focus:ring-1 focus:ring-bolivar-green rounded px-2 py-1 transition-colors text-slate-700"
                                            placeholder="Agregar comentario..."
                                        />
                                    </td>
                                    {baseColumns.map(col => (
                                        <td key={col} className="px-4 py-2 whitespace-nowrap text-slate-600 border border-slate-300">
                                            {row[col]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
