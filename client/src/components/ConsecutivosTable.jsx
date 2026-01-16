import { useState } from 'react'

export default function ConsecutivosTable({ data, title, onRowClick }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')

    if (!data || data.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p className="font-medium">No hay datos disponibles para este mes</p>
            </div>
        )
    }

    // Get column names from first row
    const columns = Object.keys(data[0])

    // Try to identify key columns (flexible to handle different structures)
    const consecutivoCol = columns.find(c => c.toLowerCase().includes('consecutivo') || c.toLowerCase().includes('consec')) || columns[2] || columns[0]
    const estadoCol = columns.find(c => c.toLowerCase().includes('estado') || c.toLowerCase().includes('comentario') || c.toLowerCase().includes('observ')) || columns[4] || null
    const correctorCol = columns.find(c => c.toLowerCase().includes('corredor') || c.toLowerCase().includes('agente') || c.toLowerCase().includes('nombre')) || columns[1] || null

    // Filter data based on search and status
    const filteredData = data.filter(row => {
        const consecutivo = String(row[consecutivoCol] || '').toLowerCase()
        const estado = String(row[estadoCol] || '').toLowerCase()
        const corredor = String(row[correctorCol] || '').toLowerCase()

        const matchesSearch = consecutivo.includes(searchTerm.toLowerCase()) ||
            corredor.includes(searchTerm.toLowerCase())

        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'pending' && (!estado || estado === '' || estado === 'error de consulta')) ||
            (filterStatus === 'completed' && estado && estado !== '' && estado !== 'error de consulta')

        return matchesSearch && matchesStatus
    })

    // Determine row status for styling
    const getRowStatus = (row) => {
        const estado = String(row[estadoCol] || '').toLowerCase()
        if (!estado || estado === '' || estado === 'comentario no encontrado') return 'pending'
        if (estado.includes('error')) return 'error'
        return 'completed'
    }

    const getStatusBadge = (row) => {
        const status = getRowStatus(row)
        const estado = row[estadoCol] || ''

        if (status === 'pending') {
            return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pendiente</span>
        }
        if (status === 'error') {
            return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Error</span>
        }
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Actualizado</span>
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">{title}</h3>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por consecutivo o corredor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bolivar-green focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'all'
                                    ? 'bg-bolivar-green text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Todos ({data.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('pending')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'pending'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setFilterStatus('completed')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'completed'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Actualizados
                        </button>
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-slate-500">
                Mostrando {filteredData.length} de {data.length} consecutivos
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Consecutivo</th>
                            {correctorCol && <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Corredor/Agente</th>}
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Estado</th>
                            {estadoCol && <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Comentario</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map((row, idx) => {
                            const status = getRowStatus(row)
                            return (
                                <tr
                                    key={idx}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${status === 'error' ? 'bg-red-50/30' :
                                            status === 'pending' ? 'bg-amber-50/30' : ''
                                        }`}
                                >
                                    <td className="px-4 py-3 text-sm font-mono font-bold text-bolivar-green">
                                        {row[consecutivoCol] || '-'}
                                    </td>
                                    {correctorCol && (
                                        <td className="px-4 py-3 text-sm text-slate-700">
                                            {row[correctorCol] || '-'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3 text-sm">
                                        {getStatusBadge(row)}
                                    </td>
                                    {estadoCol && (
                                        <td className="px-4 py-3 text-sm text-slate-600 max-w-md truncate">
                                            {row[estadoCol] || <span className="text-slate-400 italic">Sin comentario</span>}
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {filteredData.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <p>No se encontraron consecutivos con los filtros aplicados</p>
                </div>
            )}
        </div>
    )
}
