
import React from 'react'
import { fetchWithAuth } from '../utils/api';

const ForecastTable = ({ data, title, sheetName }) => {
    // Local state for editable Metas
    const [editableMetas, setEditableMetas] = React.useState({});
    // Track which fields have pending changes
    const [pendingChanges, setPendingChanges] = React.useState({});
    // Track original values from backend
    const [originalMetas, setOriginalMetas] = React.useState({});

    // Load saved metas from backend when sheetName changes
    React.useEffect(() => {
        if (sheetName) {
            const loadMetas = async () => {
                try {
                    const res = await fetchWithAuth(`/api/forecast-metas/${encodeURIComponent(sheetName)}`);
                    const result = await res.json();
                    if (result.success && result.data) {
                        setEditableMetas(result.data);
                        setOriginalMetas(result.data);
                        setPendingChanges({});
                    } else {
                        setEditableMetas({});
                        setOriginalMetas({});
                        setPendingChanges({});
                    }
                } catch (error) {
                    console.error('Error loading forecast metas:', error);
                    setEditableMetas({});
                    setOriginalMetas({});
                    setPendingChanges({});
                }
            };
            loadMetas();
        }
    }, [sheetName]);

    // Update Meta value (mark as pending, don't save yet)
    const handleMetaChange = (rowName, val) => {
        const numVal = val === "" ? 0 : parseFloat(val);
        setEditableMetas(prev => ({
            ...prev,
            [rowName]: numVal
        }));

        // Mark as pending if different from original
        const originalVal = originalMetas[rowName] || 0;
        if (numVal !== originalVal) {
            setPendingChanges(prev => ({ ...prev, [rowName]: true }));
        } else {
            setPendingChanges(prev => {
                const newPending = { ...prev };
                delete newPending[rowName];
                return newPending;
            });
        }
    };

    // Save specific meta value to backend
    const saveMetaValue = async (rowName) => {
        try {
            const newMetas = { ...editableMetas };
            await fetchWithAuth(`/api/forecast-metas/save`, {
                method: 'POST',
                body: JSON.stringify({
                    sheetName: sheetName,
                    metas: newMetas
                })
            });

            // Update original values and clear pending
            setOriginalMetas(newMetas);
            setPendingChanges(prev => {
                const newPending = { ...prev };
                delete newPending[rowName];
                return newPending;
            });
        } catch (error) {
            console.error('Error saving forecast meta:', error);
        }
    };


    if (!data || data.length === 0) return <div className="p-8 text-center text-slate-500">No hay datos para mostrar</div>

    // Helper to format numbers
    const fmt = (val) => {
        if (val === null || val === undefined || val === "") return "-";
        const num = typeof val === 'number' ? val : parseFloat(val);
        if (isNaN(num)) return "-";
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    const fmtPct = (val) => {
        if (val === null || val === undefined || val === "") return "-";
        const num = typeof val === 'number' ? val : parseFloat(val);
        if (isNaN(num)) return "-";
        return `${(num * 100).toFixed(0)}%`;
    };

    // Merge editable metas into data
    const mergedData = data.map(row => ({
        ...row,
        Meta: editableMetas[row.Nombre] !== undefined ? editableMetas[row.Nombre] : row.Meta
    }));

    // Calculate cumplimiento, forecast, etc. based on merged data
    const processedData = mergedData.map(row => {
        const meta = row.Meta || 0;
        const real = row.Real || 0;
        const cumplimiento = meta > 0 ? real / meta : 0;

        const casos = row.Casos || 0;
        const primasEst = row.Primas_Est || 0;
        const forecast = real + primasEst;
        const forecastPct = meta > 0 ? forecast / meta : 0;
        const faltante = meta - forecast;

        return {
            ...row,
            Cumplimiento: cumplimiento,
            Forecast: forecast,
            Forecast_Pct: forecastPct,
            Faltante: faltante > 0 ? faltante : 0
        };
    });

    // Filter out rows with no data
    const filteredData = processedData.filter(row => {
        return row.Nombre || row.Meta || row.Real || row.Casos;
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-bolivar-green to-emerald-600 p-4">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {title}
                </h2>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300">
                            <th className="p-2 text-left uppercase font-bold">Nombre</th>
                            <th className="p-2 text-right uppercase">Meta USD</th>
                            <th className="p-2 text-right uppercase">Real USD</th>
                            <th className="p-2 text-center uppercase">%</th>
                            <th className="p-2 text-center uppercase"># Casos</th>
                            <th className="p-2 text-right uppercase">Primas Est.</th>
                            <th className="p-2 text-right uppercase">Forecast</th>
                            <th className="p-2 text-center uppercase">% Cierre</th>
                            <th className="p-2 text-righ text-red-600 uppercase">Faltante</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, idx) => {
                            const isTotal = row.Nombre && (String(row.Nombre).toUpperCase().includes("TOTAL") || String(row.Nombre).toUpperCase().includes("GENERAL"));
                            const isHeader = !isTotal && (!row.Meta || row.Meta === 0) && row.Nombre && String(row.Nombre) === String(row.Nombre).toUpperCase() && row.Real === 0;

                            let rowClass = "border-b border-slate-100 hover:bg-slate-50 transition-colors"
                            if (isTotal) rowClass = "bg-slate-200/50 font-bold text-slate-900 border-t-2 border-slate-300"
                            // Changed from dark green to lighter slate for better readability
                            if (String(row.Nombre).toUpperCase() === "TOTAL GENERAL") rowClass = "bg-slate-300 text-slate-900 font-bold text-sm"

                            // Make Meta editable for ALL rows except totals
                            const isEditable = !isTotal;
                            const hasPendingChange = pendingChanges[row.Nombre];

                            return (
                                <tr key={idx} className={rowClass}>
                                    <td className={`p-2 pl-4 ${isHeader ? 'font-bold text-slate-800 pt-4' : ''}`}>
                                        {row.Nombre || "-"}
                                    </td>
                                    <td className="p-0 text-right font-medium relative group">
                                        {isEditable ? (
                                            <div className="relative w-full h-full flex items-center justify-end">
                                                {hasPendingChange && (
                                                    <button
                                                        onClick={() => saveMetaValue(row.Nombre)}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white rounded p-1 z-10 transition-colors"
                                                        title="Guardar cambio"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <input
                                                    type="number"
                                                    value={row.Meta || ""}
                                                    onChange={(e) => handleMetaChange(row.Nombre, e.target.value)}
                                                    placeholder="0"
                                                    className={`w-full h-full p-2 text-right bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-bolivar-green ${isTotal ? 'font-bold' : ''} ${hasPendingChange ? 'pl-10' : ''}`}
                                                />
                                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] opacity-0 group-hover:opacity-100 pointer-events-none">Edit</span>
                                            </div>
                                        ) : fmt(row.Meta)}
                                    </td>
                                    <td className="p-2 text-right font-mono text-slate-600">{fmt(row.Real)}</td>
                                    <td className="p-2 text-center font-bold">
                                        <span className={`${row.Cumplimiento >= 1 ? 'text-green-600' : row.Cumplimiento < 0.5 ? 'text-red-500' : 'text-amber-500'}`}>
                                            {fmtPct(row.Cumplimiento)}
                                        </span>
                                    </td>
                                    <td className="p-2 text-center">{row.Casos || "-"}</td>
                                    <td className="p-2 text-right text-slate-500">{fmt(row.Primas_Est)}</td>
                                    <td className="p-2 text-right font-bold text-slate-800">{fmt(row.Forecast)}</td>
                                    <td className="p-2 text-center font-bold text-slate-700">{fmtPct(row.Forecast_Pct)}</td>
                                    <td className="p-2 text-right font-bold text-red-500 pl-4 pr-2">
                                        {row.Faltante > 0 ? (
                                            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">
                                                {fmt(row.Faltante)}
                                            </span>
                                        ) : (
                                            <span className="text-green-600">Cumplido</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ForecastTable;
