import { Link } from 'react-router-dom';

export default function OracleView() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Oracle Consultas</h1>
                <p className="text-slate-500 mt-1">Conexión directa a base de datos Oracle</p>
            </div>

            {/* Placeholder */}
            <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">🔮</div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">Módulo Oracle</h2>
                <p className="text-slate-500 mb-6">
                    Este módulo permite realizar consultas directas a la base de datos Oracle.
                </p>
                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <span>Requiere configuración de conexión Oracle</span>
                </div>
            </div>
        </div>
    );
}
