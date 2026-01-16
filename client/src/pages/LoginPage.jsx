import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import API_BASE_URL from '../config';

const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState('');

    const from = location.state?.from?.pathname || "/dashboard";

    const handleSuccess = async (credentialResponse) => {
        try {
            const token = credentialResponse.credential;
            const decoded = jwtDecode(token);

            const allowedDomains = ['segurosbolivar.com', 'uptc.edu.co'];

            if (!decoded.hd || !allowedDomains.includes(decoded.hd)) {
                setError('Acceso restringido. Por favor usa tu cuenta corporativa autorizada.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken: token }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Error en autenticación');
            }

            const data = await response.json();
            login(data.user, token);
            navigate(from, { replace: true });

        } catch (err) {
            console.error(err);
            setError(err.message || 'Error al iniciar sesión');
        }
    };

    const handleError = () => {
        setError('Error al conectar con Google');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border-t-8 border-bolivar-green">
                <div className="flex flex-col items-center mb-8">
                    {/* Logo container */}
                    <div className="h-24 w-auto flex items-center justify-center mb-4">
                        <img
                            className="max-h-full max-w-full object-contain"
                            src="/logo_bolivar.png"
                            alt="Seguros Bolívar"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<span class="text-xl font-bold text-bolivar-green">Seguros Bolívar</span>';
                            }}
                        />
                    </div>

                    <h1 className="text-3xl font-extrabold text-bolivar-green text-center tracking-tight">
                        OptiSeguros
                    </h1>
                    <div className="mt-2 w-16 h-1 bg-bolivar-yellow rounded-full"></div>
                    <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-3 text-center">
                        Gerencia de Salud Internacional
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-8">
                    <p className="text-center text-slate-600">
                        Inicie sesión para acceder a la plataforma.
                    </p>

                    <div className="flex justify-center w-full transform transition-transform hover:scale-105">
                        <GoogleLogin
                            onSuccess={handleSuccess}
                            onError={handleError}
                            theme="filled_blue"
                            size="large"
                            shape="pill"
                            width="280"
                            text="continue_with"
                            locale="es"
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400">
                            Acceso exclusivo <span className="font-semibold text-bolivar-green">@segurosbolivar.com</span>
                        </p>
                        <p className="text-[10px] text-slate-300 mt-2">
                            © {new Date().getFullYear()} Seguros Bolívar
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
