import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'

export default function DetailsModal({ isOpen, closeModal, data }) {
    if (!data) return null

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={closeModal}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-bolivar-dark/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-0 text-left align-middle shadow-2xl transition-all">

                                <div className="bg-bolivar-green px-8 py-6 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <div className="bg-white/20 p-2 rounded-lg">
                                            <svg className="w-5 h-5 text-bolivar-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        </div>
                                        Detalle de Póliza
                                    </h3>
                                    <span className="text-xs font-mono font-medium text-white/70 bg-black/20 px-3 py-1 rounded-full">ID: {data.ID}</span>
                                </div>

                                <div className="p-8">
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-8">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cliente Asegurado</p>
                                            <p className="text-xl font-bold text-slate-800">{data.Cliente}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Número de Póliza</p>
                                            <p className="text-xl font-mono font-medium text-bolivar-green">{data.Póliza}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Cobertura</p>
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm">🛡️</span>
                                                <p className="text-lg font-medium text-slate-700">{data.Tipo}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado</p>
                                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold border 
                                                ${data.Estado === 'Activa' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
                                                ${data.Estado === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                                                ${data.Estado === 'Cancelada' ? 'bg-red-50 text-red-700 border-red-100' : ''}
                                                ${data.Estado === 'En Revisión' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : ''}
                                            `}>
                                                {data.Estado}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 mb-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-bolivar-yellow/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                        <div className="flex justify-between items-end relative z-10">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500 mb-1">Valor Asegurado Total</p>
                                                <p className="text-4xl font-bold text-bolivar-green">${data.Monto.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Próxima Renovación</p>
                                                <p className="text-lg font-bold text-slate-800">{data['Fecha Renovación']}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button
                                            type="button"
                                            className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                                            onClick={closeModal}
                                        >
                                            Cerrar
                                        </button>
                                        <button
                                            type="button"
                                            className="px-5 py-2.5 rounded-lg bg-bolivar-green text-white text-sm font-bold shadow-lg shadow-bolivar-green/20 hover:bg-bolivar-dark hover:shadow-xl transition-all"
                                            onClick={() => alert('Simulación: Enviando comando a Oracle Bot...')}
                                        >
                                            ⚡ Actualizar en Oracle
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
