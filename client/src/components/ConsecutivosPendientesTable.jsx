import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../utils/api';

export default function ConsecutivosPendientesTable({ data, title, onRefresh }) {
    // Estado local para manejar valores editables de Prima y Estados consultados
    const [editedData, setEditedData] = useState({});
    const [originalData, setOriginalData] = useState({});
    const [pendingChanges, setPendingChanges] = useState({});
    const [consultingStatus, setConsultingStatus] = useState({});
    const [estados, setEstados] = useState({});

    // Cargar primas desde backend cuando cambia el título (mes)
    useEffect(() => {
        if (title) {
            const loadPrimas = async () => {
                try {
                    const res = await fetchWithAuth(`/api/consecutivos-primas/${encodeURIComponent(title)}`);
                    const result = await res.json();
                    if (result.success && result.data) {
                        setEditedData(result.data);
                        setOriginalData(result.data);
                        setPendingChanges({});
                    }
                } catch (error) {
                    console.error('Error loading consecutivos primas:', error);
                }
            };
            loadPrimas();
        }
    }, [title]);

    // Guardar cambios en localStorage
    useEffect(() => {
        if (Object.keys(editedData).length > 0) {
            localStorage.setItem('consecutivos_primas', JSON.stringify(editedData));
        }
    }, [editedData]);

    useEffect(() => {
        if (Object.keys(estados).length > 0) {
            localStorage.setItem('consecutivos_estados', JSON.stringify(estados));
        }
    }, [estados]);

    if (!data || data.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-lg font-medium text-slate-700">Sin consecutivos pendientes</h3>
                <p className="text-slate-500 mt-1">No hay negocios sin fecha de expedición.</p>
            </div>
        );
    }

    // Filtering Logic
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});

    const toTitleCase = (str) => {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    // Columnas visibles
    const visibleColumns = ['Localidad', 'Consecutivo', 'Prima', 'Estado'];

    const uniqueValues = visibleColumns.reduce((acc, col) => {
        if (col === 'Prima' || col === 'Estado') return acc; // No filtrar por estas columnas
        const rawValues = data.map(row => String(row[col] || "").trim()).filter(v => v !== "");
        const normalizedSet = new Set(rawValues.map(v => toTitleCase(v)));
        acc[col] = [...normalizedSet].sort();
        return acc;
    }, {});

    const filteredData = data.filter(row => {
        const matchesSearch = !searchTerm || Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesFilters = Object.entries(filters).every(([col, filterVal]) => {
            if (!filterVal) return true;
            const rowVal = String(row[col] || "").trim();
            return toTitleCase(rowVal) === filterVal;
        });
        return matchesSearch && matchesFilters;
    });

    const handleFilterChange = (col, val) => {
        setFilters(prev => ({
            ...prev,
            [col]: val
        }));
    };

    // Manejar cambio de Prima (marcar como pendiente, no guardar aún)
    const handlePrimaChange = (consecutivo, value) => {
        const numValue = parseFloat(value) || 0;
        setEditedData(prev => ({
            ...prev,
            [consecutivo]: numValue
        }));

        // Marcar como pendiente si es diferente del original
        const originalVal = originalData[consecutivo] || 0;
        if (numValue !== originalVal) {
            setPendingChanges(prev => ({ ...prev, [consecutivo]: true }));
        } else {
            setPendingChanges(prev => {
                const newPending = { ...prev };
                delete newPending[consecutivo];
                return newPending;
            });
        }
    };

    // Guardar prima específica al backend
    const savePrimaValue = async (consecutivo) => {
        try {
            const newPrimas = { ...editedData };
            await fetchWithAuth(`/api/consecutivos-primas/save`, {
                method: 'POST',
                body: JSON.stringify({
                    sheetName: title,
                    primas: newPrimas
                })
            });

            // Actualizar valores originales y limpiar pendiente
            setOriginalData(newPrimas);
            setPendingChanges(prev => {
                const newPending = { ...prev };
                delete newPending[consecutivo];
                return newPending;
            });
        } catch (error) {
            console.error('Error saving prima:', error);
        }
    };

    // Obtener valor de Prima (editado o original)
    const getPrimaValue = (row) => {
        const consecutivo = row.Consecutivo;
        return editedData[consecutivo] !== undefined ? editedData[consecutivo] : (row.Prima || 0);
    };

    // Consultar estado de un consecutivo
    const consultarEstado = async (consecutivo) => {
        setConsultingStatus(prev => ({ ...prev, [consecutivo]: true }));

        try {
            const response = await fetchWithAuth(`/api/consecutivos/consultar-estado`, {
                method: 'POST',
                body: JSON.stringify({ consecutivo: String(consecutivo) })
            });

            const result = await response.json();

            if (result.success) {
                // Recargar solo los datos del mes actual sin perder la selección
                if (onRefresh) {
                    onRefresh();
                }
            }
        } catch (error) {
            console.error('Error consultando estado:', error);
            alert('Error consultando estado. Intenta nuevamente.');
        } finally {
            setConsultingStatus(prev => ({ ...prev, [consecutivo]: false }));
        }
    };

    // Calcular total de primas
    const totalPrimas = filteredData.reduce((sum, row) => {
        return sum + getPrimaValue(row);
    }, 0);

    const formattedTotal = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(totalPrimas);

    // Contar estados consultados
    const estadosConsultados = filteredData.filter(row => row.Estado && row.Estado.trim() !== '').length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-wrap gap-4">
                <h3 className="font-bold text-bolivar-green text-lg flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-bolivar-yellow rounded-full"></span>
                    {title}
                </h3>

                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search Input */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-4 py-1.5 rounded-full border border-slate-300 text-sm focus:outline-none focus:border-bolivar-green focus:ring-1 focus:ring-bolivar-green w-48"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full font-bold whitespace-nowrap">
                            Total Primas: {formattedTotal}
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-bold whitespace-nowrap">
                            Estados: {estadosConsultados}/{filteredData.length}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full font-bold whitespace-nowrap">
                            {filteredData.length} registros
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                            {visibleColumns.map((col) => {
                                const filterableColumns = ['Localidad'];
                                const hasFilter = filterableColumns.includes(col);

                                return (
                                    <th key={col} className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                                        <div className="flex flex-col gap-2">
                                            <span>{col === 'Localidad' ? 'Sucursal' : col}</span>
                                            {hasFilter && (
                                                <select
                                                    className="w-full p-1 border border-slate-200 rounded text-xs font-normal normal-case focus:outline-none focus:border-bolivar-green"
                                                    value={filters[col] || ""}
                                                    onChange={(e) => handleFilterChange(col, e.target.value)}
                                                >
                                                    <option value="">Todos</option>
                                                    {uniqueValues[col].map(val => (
                                                        <option key={val} value={val}>{val}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {col === 'Prima' && (
                                                <span className="text-xs text-slate-400 font-normal normal-case">Editable ↓</span>
                                            )}
                                            {col === 'Estado' && (
                                                <span className="text-xs text-slate-400 font-normal normal-case">Consultar ↓</span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredData.map((row, index) => {
                            const consecutivo = row.Consecutivo;
                            const primaValue = getPrimaValue(row);
                            const isConsulting = consultingStatus[consecutivo];
                            const hasPendingChange = pendingChanges[consecutivo];

                            return (
                                <tr
                                    key={index}
                                    className="transition-colors hover:bg-emerald-50/50"
                                >
                                    {visibleColumns.map((col) => (
                                        <td key={col} className="px-6 py-3 text-slate-600 font-medium whitespace-nowrap">
                                            {col === 'Prima' ? (
                                                <div className="relative flex items-center gap-2">
                                                    {hasPendingChange && (
                                                        <button
                                                            onClick={() => savePrimaValue(consecutivo)}
                                                            className="bg-green-500 hover:bg-green-600 text-white rounded p-1 transition-colors flex-shrink-0"
                                                            title="Guardar cambio"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <input
                                                        type="number"
                                                        value={primaValue}
                                                        onChange={(e) => handlePrimaChange(consecutivo, e.target.value)}
                                                        className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-bolivar-green focus:ring-1 focus:ring-bolivar-green"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            ) : col === 'Estado' ? (
                                                row.Estado ? (
                                                    <span
                                                        className={`text-xs px-3 py-1.5 rounded border block max-w-md ${
                                                            // Si parece un número de póliza (solo dígitos o guiones y longitud < 20), verde. De lo contrario, neutro.
                                                            /^[\d-]{5,20}$/.test(row.Estado.trim())
                                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}
                                                        title={row.Estado}
                                                    >
                                                        {row.Estado}
                                                    </span>
                                                ) : (

                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            onClick={() => consultarEstado(consecutivo)}
                                                            className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1
                                                                ${isConsulting
                                                                    ? 'bg-slate-100 text-slate-500 cursor-wait'
                                                                    : 'text-bolivar-green hover:bg-emerald-50 hover:underline border border-transparent hover:border-emerald-200'
                                                                }`}
                                                        >
                                                            {isConsulting ? (
                                                                <>
                                                                    <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                                                    Consultando...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                    </svg>
                                                                    Consultar estado
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                )
                                            )
                                                : col === 'Localidad' ? (
                                                    <span>{row[col]}</span>
                                                ) : (
                                                    <span>{row[col]}</span>
                                                )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div >

            <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-green-100 border border-green-200 rounded"></span> Estado consultado
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-white border border-slate-200 rounded"></span> Pendiente de consulta
                    </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Mostrando 1-{filteredData.length} de {data.length}</span>
            </div>
        </div >
    );
}
