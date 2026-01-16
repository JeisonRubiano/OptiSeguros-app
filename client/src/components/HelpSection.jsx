import { useState } from 'react';

export default function HelpSection() {
    const [activeTab, setActiveTab] = useState('sheets');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Centro de Ayuda y Documentación</h2>

            <div className="flex space-x-4 border-b border-slate-100 mb-6">
                <button
                    onClick={() => setActiveTab('sheets')}
                    className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'sheets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Google Sheets
                </button>
                <button
                    onClick={() => setActiveTab('oracle')}
                    className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'oracle' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Robot Oracle
                </button>
                <button
                    onClick={() => setActiveTab('faq')}
                    className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'faq' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Preguntas Frecuentes
                </button>
            </div>

            <div className="prose prose-slate max-w-none">
                {activeTab === 'sheets' && (
                    <div className="animate-fade-in">
                        <h3 className="text-lg font-bold text-slate-800 mb-3">Conexión con Google Sheets</h3>
                        <p className="text-slate-600 mb-4">
                            Para que el sistema pueda leer tus archivos, sigue estos pasos:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                            <li>Asegúrate de que el archivo <code>credentials.json</code> esté cargado en el servidor.</li>
                            <li>
                                Abre tu archivo de Google Sheets y pulsa el botón <strong>Compartir</strong>.
                            </li>
                            <li>
                                Copia el correo del robot (bot-lector@...) y pégalo en la ventana de compartir.
                            </li>
                            <li>
                                Dale permisos de <strong>Editor</strong>.
                            </li>
                            <li>
                                Copia el nombre exacto del archivo y búscalo en este panel.
                            </li>
                        </ol>
                        <div className="bg-blue-50 mt-6 p-4 rounded-lg border border-blue-100">
                            <p className="text-sm text-blue-800">💡 <strong>Tip:</strong> Puedes vincular múltiples hojas de cálculo con la misma cuenta de servicio.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'oracle' && (
                    <div className="animate-fade-in">
                        <h3 className="text-lg font-bold text-slate-800 mb-3">Configuración del Bot Oracle</h3>
                        <p className="text-slate-600 mb-4">
                            El robot de automatización requiere un mapeo inicial de tu pantalla ya que interactúa visualmente con la aplicación.
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-slate-600">
                            <li>
                                <strong>Resolución de Pantalla:</strong> No cambies la resolución de tu monitor después de configurar el bot, o las coordenadas fallarán.
                            </li>
                            <li>
                                <strong>Ubicación de Ventanas:</strong> Intenta mantener la ventana de Oracle maximizada siempre.
                            </li>
                            <li>
                                <strong>VPN:</strong> Asegúrate de estar conectado a la VPN antes de lanzar una consulta.
                            </li>
                        </ul>
                        <h4 className="font-bold text-slate-800 mt-6 mb-2">Para re-configurar coordenadas:</h4>
                        <p className="text-sm text-slate-600 bg-slate-100 p-3 rounded">
                            Ejecuta el script <code>server/tools/mouse_tracker.py</code> y sigue las instrucciones en la terminal.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
