import { useState, useEffect } from 'react';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PhoneIcon, LockClosedIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'; // Importamos iconos

function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [step, setStep] = useState('sendCode');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Configurar reCAPTCHA cuando el componente se monta
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // Esto se ejecuta cuando el reCAPTCHA se resuelve
      },
      'expired-callback': () => {
        // Esto se ejecuta cuando el reCAPTCHA expira
      }
    });
    setRecaptchaVerifier(verifier);

    return () => {
      // Limpiar el reCAPTCHA cuando el componente se desmonta
      if (verifier) verifier.clear();
    };
  }, []);

  const handleSendCode = async () => {
    setError('');
    setSuccess('');
    try {
      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA no está configurado. Recargue la página.');
      }
      if (!phoneNumber) {
        setError('Por favor, ingrese un número de teléfono.');
        return;
      }

      const formattedPhone = `+${phoneNumber.replace(/\D/g, '')}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('verifyCode');
      setSuccess('Código de verificación enviado. Revise su teléfono.');
    } catch (error) {
      console.error("Error sending code:", error);
      setError(`Error al enviar código: ${error.message}`);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setSuccess('');
    try {
      if (!confirmationResult) {
        setError('No se ha enviado ningún código. Intente de nuevo.');
        return;
      }
      if (!verificationCode) {
        setError('Por favor, ingrese el código de verificación.');
        return;
      }

      await confirmationResult.confirm(verificationCode);
      // Redirección manejada por el efecto que observa currentUser
      setSuccess('¡Sesión iniciada exitosamente!');
    } catch (error) {
      console.error("Error verifying code:", error);
      setError(`Error al verificar código: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-soft animate-fadeInUp">
      <div className="card-modern p-8 max-w-md w-full text-center">
        <h1 className="main-header-title text-center mb-6">Iniciar Sesión</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
            <XMarkIcon className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-start">
            <CheckIcon className="h-5 w-5 mr-2" />
            <span>{success}</span>
          </div>
        )}

        {step === 'sendCode' ? (
          <div className="space-y-4">
            <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <PhoneIcon className="h-5 w-5" />
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Número de teléfono (ej. +50212345678)"
                className="input-field-inside w-full"
              />
            </div>
            <button onClick={handleSendCode} className="btn-primary-gradient w-full">
              Enviar código
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <LockClosedIcon className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Código de verificación"
                className="input-field-inside w-full"
              />
            </div>
            <button onClick={handleVerifyCode} className="btn-primary-gradient w-full">
              Verificar
            </button>
          </div>
        )}
        <div id="recaptcha-container" className="mt-4 flex justify-center"></div>
      </div>
    </div>
  );
}

export default LoginPage;
