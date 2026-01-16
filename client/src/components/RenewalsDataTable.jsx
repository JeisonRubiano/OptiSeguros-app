import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';

// Estados de renovación disponibles
const ESTADOS_RENOVACION = [
    { value: 'PENDIENTE DE RECAUDO', label: 'PENDIENTE', color: 'amber' },
    { value: 'RECAUDADA', label: 'RECAUDADA', color: 'green' },
    { value: 'ANULADA', label: 'ANULADA', color: 'red' }
];

export default function RenewalsDataTable({ data, title, onRowClick }) {
    // Estado local para manejar los cambios de ESTADO por fila
    const [rowStates, setRowStates] = useState({});

    // Cargar estados guardados desde el backend
    useEffect(() => {
        const loadStates = async () => {
            try {
                const res = await fetchWithAuth(`/api/renewal-states`);
                const result = await res.json();
                if (result.success && result.data) {
                    // Convertir formato del backend a formato local
                    const states = {};
                    Object.keys(result.data).forEach(poliza => {
                        states[poliza] = result.data[poliza].estado;
                    });
                    setRowStates(states);
                }
            } catch (error) {
                console.error('Error loading renewal states:', error);
            }
        };
        loadStates();
    }, []);

    // Guardar estado en el backend cuando cambie
    const saveStateToBackend = async (poliza, estado) => {
        try {
            await fetchWithAuth(`/api/renewal-states/save`, {
                method: 'POST',
                body: JSON.stringify({
                    poliza: String(poliza),
                    estado: estado,
                    usuario: 'Usuario'
                })
            });
        } catch (error) {
            console.error('Error saving renewal state:', error);
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-lg font-medium text-slate-700">Sin datos disponibles</h3>
                <p className="text-slate-500 mt-1">Seleccione un mes diferente.</p>
            </div>
        );
    }

    const columns = Object.keys(data[0]);

    // Filtering Logic
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});

    const toTitleCase = (str) => {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    const uniqueValues = columns.reduce((acc, col) => {
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

    // Manejar cambio de estado de una fila
    const handleEstadoChange = (rowIndex, poliza, newEstado) => {
        const key = poliza || `row_${rowIndex}`;
        setRowStates(prev => ({
            ...prev,
            [key]: newEstado
        }));

        // Guardar en backend inmediatamente
        if (poliza) {
            saveStateToBackend(poliza, newEstado);
        }
    };

    // Obtener el estado actual de una fila
    const getRowEstado = (row, index) => {
        const poliza = row['N° PÓLIZA'] || row['N� P�LIZA'];
        const key = poliza || `row_${index}`;

        // Primero buscar en estados guardados
        if (rowStates[key]) {
            return rowStates[key];
        }

        // Sino, usar el valor del Excel (normalizado)
        const excelEstado = row['Gestión De Renovación-Recaudo'] || row['Gesti�n De Renovaci�n-Recaudo'] || '';
        const estadoUpper = String(excelEstado).toUpperCase().trim();

        if (estadoUpper.includes('RECAUD')) return 'RECAUDADA';
        if (estadoUpper.includes('ANULAD')) return 'ANULADA';
        if (estadoUpper.includes('PENDIENTE')) return 'PENDIENTE DE RECAUDO';

        return 'PENDIENTE DE RECAUDO';
    };

    // Obtener clases de color para la fila según el estado
    const getRowColorClass = (estado) => {
        const estadoUpper = String(estado).toUpperCase();
        if (estadoUpper.includes('RECAUDADA')) {
            return 'bg-emerald-100 hover:bg-emerald-150 border-l-4 border-l-emerald-500';
        }
        if (estadoUpper.includes('ANULADA')) {
            return 'bg-red-100 hover:bg-red-150 border-l-4 border-l-red-500';
        }
        return 'hover:bg-amber-50/50 border-l-4 border-l-amber-400';
    };

    // Calculate Total
    const totalAmount = filteredData.reduce((sum, row) => {
        let primaCol = columns.find(c => String(c).toUpperCase().includes("PRIMA"));
        if (primaCol) {
            let val = row[primaCol];
            if (typeof val === 'string') {
                val = parseFloat(val.replace(/[$,]/g, '')) || 0;
            } else if (typeof val !== 'number') {
                val = 0;
            }
            return sum + val;
        }
        return sum;
    }, 0);

    const formattedTotal = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(totalAmount);

    // Contar estados
    const estadoCounts = filteredData.reduce((acc, row, idx) => {
        const estado = getRowEstado(row, idx);
        const estadoUpper = String(estado).toUpperCase();
        if (estadoUpper.includes('RECAUDADA')) acc.recaudadas++;
        else if (estadoUpper.includes('ANULADA')) acc.anuladas++;
        else acc.pendientes++;
        return acc;
    }, { pendientes: 0, recaudadas: 0, anuladas: 0 });

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
                            placeholder="Buscar en todo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-4 py-1.5 rounded-full border border-slate-300 text-sm focus:outline-none focus:border-bolivar-green focus:ring-1 focus:ring-bolivar-green w-48"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    {/* Estado badges */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full font-bold">
                            Pendientes: {estadoCounts.pendientes}
                        </span>
                        <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full font-bold">
                            Recaudadas: {estadoCounts.recaudadas}
                        </span>
                        <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-full font-bold">
                            Anuladas: {estadoCounts.anuladas}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full font-bold whitespace-nowrap">
                            Total: {formattedTotal}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full font-bold whitespace-nowrap">
                            {filteredData.length} registros
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-xs border-b-2 border-slate-300 sticky top-0 z-10">
                        <tr>
                            {/* Columna de numeración */}
                            <th className="px-4 py-4 whitespace-nowrap border-r border-slate-300 bg-slate-100">
                                #
                            </th>
                            {columns.map((col) => {
                                // Columnas que tienen filtro
                                const filterableColumns = ['PERIODICIDAD', 'NOMBRE OFICINA', 'RAMO'];
                                const hasFilter = filterableColumns.includes(col);
                                const isEstadoCol = col === 'Gestión De Renovación-Recaudo' || col === 'Gesti�n De Renovaci�n-Recaudo';

                                return (
                                    <th key={col} className="px-6 py-4 whitespace-nowrap min-w-[150px] border-r border-slate-300 last:border-r-0">
                                        <div className="flex flex-col gap-2">
                                            <span>{col}</span>
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
                                            {isEstadoCol && (
                                                <span className="text-xs text-slate-400 font-normal normal-case">Editable ↓</span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredData.map((row, index) => {
                            const currentEstado = getRowEstado(row, index);
                            const rowColorClass = getRowColorClass(currentEstado);
                            const poliza = row['N° PÓLIZA'] || row['N� P�LIZA'];

                            return (
                                <tr
                                    key={index}
                                    className={`transition-colors cursor-pointer group border-b border-slate-200 ${rowColorClass}`}
                                >
                                    {/* Columna de numeración */}
                                    <td className="px-4 py-3 text-slate-500 font-semibold text-sm border-r border-slate-200 bg-slate-50">
                                        {index + 1}
                                    </td>
                                    {columns.map((col) => {
                                        const isEstadoCol = col === 'Gestión De Renovación-Recaudo' || col === 'Gesti�n De Renovaci�n-Recaudo';

                                        return (
                                            <td key={col} className="px-6 py-3 text-slate-600 font-medium whitespace-nowrap group-hover:text-slate-900 border-r border-slate-200 last:border-r-0">
                                                {isEstadoCol ? (
                                                    <select
                                                        value={currentEstado}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleEstadoChange(index, poliza, e.target.value);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 cursor-pointer transition-all
                                                            ${currentEstado.toUpperCase().includes('RECAUDADA')
                                                                ? 'bg-emerald-200 text-emerald-800 border-emerald-400'
                                                                : currentEstado.toUpperCase().includes('ANULADA')
                                                                    ? 'bg-red-200 text-red-800 border-red-400'
                                                                    : 'bg-amber-100 text-amber-700 border-amber-300'
                                                            }
                                                        `}
                                                    >
                                                        {ESTADOS_RENOVACION.map(estado => (
                                                            <option key={estado.value} value={estado.value}>
                                                                {estado.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span onClick={() => onRowClick && onRowClick(row)}>
                                                        {row[col]}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-emerald-200 rounded"></span> Recaudada
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-red-200 rounded"></span> Anulada
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></span> Pendiente
                    </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Mostrando 1-{filteredData.length} de {data.length}</span>
            </div>
        </div>
    );
}
