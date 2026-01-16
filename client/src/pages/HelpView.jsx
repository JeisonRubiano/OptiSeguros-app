import { Link } from 'react-router-dom';

export default function HelpView() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Centro de Ayuda</h1>
                <p className="text-slate-500 mt-1">Guías y documentación del sistema</p>
            </div>

            {/* Help Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-2xl mb-4">📖</div>
                    <h3 className="font-bold text-slate-700 mb-2">Guía de Inicio</h3>
                    <p className="text-sm text-slate-500">Aprende a navegar por el sistema y entender el flujo de datos.</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center text-2xl mb-4">📊</div>
                    <h3 className="font-bold text-slate-700 mb-2">Interpretación de Datos</h3>
                    <p className="text-sm text-slate-500">Cómo leer los reportes y entender las métricas clave.</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-2xl mb-4">🔧</div>
                    <h3 className="font-bold text-slate-700 mb-2">Configuración</h3>
                    <p className="text-sm text-slate-500">Opciones avanzadas y personalización del sistema.</p>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h2 className="font-bold text-lg text-slate-700 mb-4">Preguntas Frecuentes</h2>
                <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-4">
                        <h4 className="font-medium text-slate-700">¿Qué es el REPORTE principal?</h4>
                        <p className="text-sm text-slate-500 mt-1">El archivo maestro que contiene todos los registros de negocios y operaciones.</p>
                    </div>
                    <div className="border-b border-slate-100 pb-4">
                        <h4 className="font-medium text-slate-700">¿Cómo se clasifican los registros?</h4>
                        <p className="text-sm text-slate-500 mt-1">Los registros completos van a Detalle, los incompletos van a Consecutivos pendientes.</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-700">¿Con qué frecuencia se actualizan los datos?</h4>
                        <p className="text-sm text-slate-500 mt-1">Los datos se actualizan cada vez que se procesa un nuevo archivo REPORTE.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
