import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import DetailsModal from '../components/DetailsModal';
import { fetchWithAuth } from '../utils/api';
import { useCache } from '../context/CacheContext';

export default function DetalleView() {
    const { year, month } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [selectedYear, setSelectedYear] = useState(year || '');
    const [selectedMonth, setSelectedMonth] = useState(month || '');
    // subMode removed as per user request (single view now)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const { getCache, setCache } = useCache();

    // Load years on mount
    useEffect(() => {
        loadYears();
    }, []);

    // Load months when year changes
    useEffect(() => {
        if (selectedYear) {
            loadMonths(selectedYear);
        }
    }, [selectedYear]);

    // Load data when year and month are selected
    useEffect(() => {
        if (selectedYear && selectedMonth) {
            loadData(selectedYear, selectedMonth);
        }
    }, [selectedYear, selectedMonth]);

    const loadYears = async () => {
        // Check cache
        const cached = getCache('detalle-years');
        if (cached) {
            setAvailableYears(cached.data.sheets);
            if (!selectedYear && cached.data.default) {
                setSelectedYear(cached.data.default);
            }
            return;
        }

        try {
            console.log("Fetching years...");
            const res = await fetchWithAuth('/api/detalle/years');
            const result = await res.json();
            console.log("Years response:", result);

            if (result.success && result.data?.type === 'multi_sheet_metadata') {
                console.log("Setting available years:", result.data.sheets);
                setAvailableYears(result.data.sheets);

                // Cache
                setCache('detalle-years', {
                    sheets: result.data.sheets,
                    default: result.data.default
                });

                if (!selectedYear && result.data.default) {
                    setSelectedYear(result.data.default);
                }
            } else {
                console.warn("Invalid years structure:", result);
            }
        } catch (error) {
            console.error('Error loading years:', error);
        }
    };

    const loadMonths = async (yearValue) => {
        // Check cache
        const cacheKey = `detalle-months-${yearValue}`;
        const cached = getCache(cacheKey);
        if (cached) {
            setAvailableMonths(cached.data.sheets);
            if (!selectedMonth && cached.data.default) {
                setSelectedMonth(cached.data.default);
            }
            return;
        }

        try {
            const res = await fetchWithAuth(`/api/detalle/months/${yearValue}`);
            const result = await res.json();
            if (result.success && result.data?.type === 'multi_sheet_metadata') {
                setAvailableMonths(result.data.sheets);

                // Cache
                setCache(cacheKey, {
                    sheets: result.data.sheets,
                    default: result.data.default
                });

                if (!selectedMonth && result.data.default) {
                    setSelectedMonth(result.data.default);
                }
            }
        } catch (error) {
            console.error('Error loading months:', error);
        }
    };

    const loadData = async (yearValue, monthValue) => {
        setLoading(true);

        // Check cache
        const cacheKey = `detalle-data-${yearValue}-${monthValue}`;
        const cached = getCache(cacheKey);
        if (cached) {
            setData(cached.data);
            setLoading(false);
            return;
        }

        try {
            // No submode needed anymore
            const res = await fetchWithAuth(`/api/detalle/data/${yearValue}/${monthValue}`);
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                setData(result.data);
                // Cache
                setCache(cacheKey, result.data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleYearChange = (e) => {
        const newYear = e.target.value;
        setSelectedYear(newYear);
        setSelectedMonth(''); // Reset month
        setData([]); // Clear data
    };

    const handleMonthChange = (e) => {
        const newMonth = e.target.value;
        setSelectedMonth(newMonth);
    };

    const handleRowClick = (row) => {
        setSelectedPolicy(row);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <Link to="/dashboard" className="hover:text-bolivar-green">Inicio</Link>
                        <span>/</span>
                        <span className="text-slate-700">Detalle Negocios y Recaudos</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Detalle Negocios y Recaudos</h1>
                </div>
                <Link to="/dashboard" className="text-sm text-bolivar-green hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Volver al Diagrama
                </Link>
            </div>

            {/* Year/Month Selectors (Replaced Tabs) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-700">Año:</label>
                        <select
                            value={selectedYear}
                            onChange={handleYearChange}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-bolivar-green"
                        >
                            <option value="">Seleccionar...</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {availableMonths.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-slate-700">Mes:</label>
                            <select
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-bolivar-green"
                            >
                                <option value="">Seleccionar...</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedYear && selectedMonth && (
                        <span className="text-sm text-slate-500">
                            Mostrando: <strong>{selectedMonth} {selectedYear}</strong>
                        </span>
                    )}
                </div>

                {/* Data Display */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bolivar-green"></div>
                            <span className="ml-3 text-slate-600">Cargando datos...</span>
                        </div>
                    ) : data.length > 0 ? (
                        <DataTable
                            data={data}
                            title={`Detalle: ${selectedMonth} ${selectedYear} `}
                            onRowClick={handleRowClick}
                        />
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <p className="font-medium">Selecciona un año y mes para ver los datos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <DetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                policy={selectedPolicy}
            />
        </div>
    );
}
