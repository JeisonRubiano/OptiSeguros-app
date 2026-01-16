import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ForecastTable from '../components/ForecastTable';

import { fetchWithAuth } from '../utils/api';

export default function ForecastView() {
    const { sheet } = useParams();

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [availableSheets, setAvailableSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState(sheet || '');

    useEffect(() => {
        loadSheets();
    }, []);

    useEffect(() => {
        if (selectedSheet) {
            loadData(selectedSheet);
        }
    }, [selectedSheet]);

    const loadSheets = async () => {
        try {
            // Fetch available months from backend (auto-detected from data)
            const res = await fetchWithAuth('/api/forecast-available-months');
            const result = await res.json();

            if (result.success && Array.isArray(result.months)) {
                setAvailableSheets(result.months);
                if (!selectedSheet && result.months.length > 0) {
                    // Default to the last month (most recent)
                    setSelectedSheet(result.months[result.months.length - 1]);
                }
            }
        } catch (error) {
            console.error('Error loading sheets:', error);
        }
    };

    const loadData = async (sheetName) => {
        setLoading(true);
        try {
            // Parsear mes y año: "DIC 2025" -> month="DIC", year="2025"
            // O "NOVIEMBRE 2024"
            const parts = sheetName.trim().split(' ');
            if (parts.length >= 2) {
                const month = parts[0];
                const yearStr = parts[parts.length - 1]; // Año usualmente al final

                // Validar que yearStr sea numérico (2 o 4 dígitos)
                if (!/^\d{2,4}$/.test(yearStr)) {
                    console.warn('Año no válido en nombre de hoja:', sheetName);
                    setData([]);
                    setLoading(false);
                    return;
                }

                const res = await fetchWithAuth(`/api/forecast-calculated/${yearStr}/${month}`);
                const result = await res.json();

                if (result.success && Array.isArray(result.data)) {
                    setData(result.data);
                } else {
                    console.error('Error in response:', result);
                    setData([]);
                }
            } else {
                // Si el nombre no tiene formato MES AÑO, no hacemos fetch al forecast calculado
                console.warn('Formato de nombre de hoja no reconocido para Forecast:', sheetName);
                setData([]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <Link to="/dashboard" className="hover:text-bolivar-green">Inicio</Link>
                        <span>/</span>
                        <span className="text-slate-700">Forecast</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Forecast Cierre Mes</h1>
                </div>
                <Link to="/dashboard" className="text-sm text-bolivar-green hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Volver al Diagrama
                </Link>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Sheet Selector */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
                    {availableSheets.map((sheetName) => (
                        <button
                            key={sheetName}
                            onClick={() => setSelectedSheet(sheetName)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${selectedSheet === sheetName ? 'bg-bolivar-green text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            {sheetName}
                        </button>
                    ))}
                </div>

                {/* Data Display */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bolivar-green"></div>
                            <span className="ml-3 text-slate-600">Cargando datos...</span>
                        </div>
                    ) : data.length > 0 ? (
                        <ForecastTable
                            data={data}
                            title={`Forecast: ${selectedSheet}`}
                            sheetName={selectedSheet}
                        />
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <p className="font-medium">Selecciona un mes para ver el forecast</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
