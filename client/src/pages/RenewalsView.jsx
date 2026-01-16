import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RenewalsDataTable from '../components/RenewalsDataTable';

import DetailsModal from '../components/DetailsModal';
import { fetchWithAuth } from '../utils/api';

export default function RenewalsView() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);

    // Load months on mount
    useEffect(() => {
        loadMonths();
    }, []);

    // Load data when month is selected
    useEffect(() => {
        if (selectedMonth) {
            loadData(selectedMonth);
        }
    }, [selectedMonth]);

    const loadMonths = async () => {
        try {
            const res = await fetchWithAuth('/api/renewals/months');
            const result = await res.json();
            if (result.success && result.data?.type === 'multi_sheet_metadata') {
                setAvailableMonths(result.data.sheets);
                if (!selectedMonth && result.data.default) {
                    setSelectedMonth(result.data.default);
                }
            }
        } catch (error) {
            console.error('Error loading months:', error);
        }
    };

    const loadData = async (monthValue) => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`/api/renewals/${monthValue}`);
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
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
                        <span className="text-slate-700">Detalle Renovaciones</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Detalle Renovaciones A&A</h1>
                </div>
                <Link to="/dashboard" className="text-sm text-bolivar-green hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Volver al Dashboard
                </Link>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Month Selector */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-4 flex-wrap">
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

                    {selectedMonth && (
                        <span className="text-sm text-slate-500">
                            Mostrando: <strong>{selectedMonth} 2025</strong>
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
                        <RenewalsDataTable
                            data={data}
                            title={`Renovaciones: ${selectedMonth} 2025`}
                            onRowClick={handleRowClick}
                        />
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            <p className="font-medium">Selecciona un mes para ver los datos de renovaciones</p>
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
