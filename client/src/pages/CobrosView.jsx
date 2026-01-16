import { useState, useEffect } from 'react';

import { fetchWithAuth } from '../utils/api';

export default function CobrosView() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth('/api/cobros/pending');
            const json = await res.json();
            if (json.success) {
                setData(json);
            }
        } catch (error) {
            console.error('Error loading collections:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (responsable) => {
        if (expandedGroup === responsable) {
            setExpandedGroup(null);
        } else {
            setExpandedGroup(responsable);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bolivar-green"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Gestión de Cobros Global
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Seguimiento centralizado por responsable de todas las pólizas pendientes.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-right">
                        <span className="block text-xs text-slate-400 font-bold uppercase">Total por Recaudar</span>
                        <span className="text-2xl font-extrabold text-slate-800">
                            ${data.total_global_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {data.data.map((group) => (
                    <div key={group.responsable} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Header del Grupo */}
                        <div
                            className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${expandedGroup === group.responsable ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                            onClick={() => toggleGroup(group.responsable)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${group.total_usd > 10000 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                    {group.responsable.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{group.responsable}</h3>
                                    <span className="text-xs text-slate-500 font-medium">{group.count} pólizas pendientes</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-slate-800">
                                    ${group.total_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {expandedGroup === group.responsable ? 'Ocultar detalle' : 'Ver detalle'}
                                </div>
                            </div>
                        </div>

                        {/* Body (Tabla) */}
                        {expandedGroup === group.responsable && (
                            <div className="border-t border-slate-100 overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                                        <tr>
                                            <th className="px-4 py-3">Póliza / Consecutivo</th>
                                            <th className="px-4 py-3">Asegurado</th>
                                            <th className="px-4 py-3">Sucursal</th>
                                            <th className="px-4 py-3">F. Exp.</th>
                                            <th className="px-4 py-3 text-right">Mora</th>
                                            <th className="px-4 py-3 text-right">Valor USD</th>
                                            <th className="px-4 py-3 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {group.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    <div>#{item.NUMERO_POLIZA || item.CONSECUTIVO}</div>
                                                    <div className="text-xs text-slate-400 font-normal">{item.CONSECUTIVO}</div>
                                                </td>
                                                <td className="px-4 py-3 font-medium">{item.ASEGURADO}</td>
                                                <td className="px-4 py-3 text-xs">{item.SUCURSAL}</td>
                                                <td className="px-4 py-3 text-xs">{item.FECHA?.split(' ')[0]}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.dias_mora > 30 ? 'bg-red-100 text-red-700' : (item.dias_mora > 15 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}`}>
                                                        {item.dias_mora} días
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                    ${item.valor_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <a
                                                        href={`https://wa.me/?text=${encodeURIComponent(`Hola, favor gestionar cobro de póliza #${item.NUMERO_POLIZA || item.CONSECUTIVO} de ${item.ASEGURADO}. Está pendiente hace ${item.dias_mora} días.`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-sm transition-transform active:scale-95"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
