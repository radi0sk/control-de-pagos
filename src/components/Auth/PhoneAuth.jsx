import { useState } from 'react';
import { PhoneIcon, LockClosedIcon } from '@heroicons/react/24/outline'; // Importamos iconos

function PhoneAuth({ onSendCode, onVerifyCode, step }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  return (
    <div className="flex flex-col items-center justify-center p-4 animate-fadeInUp"> {/* Centrado y animación de entrada */}
      {step === 'sendCode' ? (
        <div className="space-y-4 w-full max-w-sm"> {/* Espaciado y ancho máximo */}
          <div className="input-with-icon-wrapper"> {/* Contenedor de input con ícono */}
            <div className="input-icon">
              <PhoneIcon className="h-5 w-5" />
            </div>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Número de teléfono (ej. +50212345678)"
              className="input-field-inside flex-1" // Input dentro del wrapper
            />
          </div>
          <button onClick={() => onSendCode(phoneNumber)} className="btn-primary-gradient w-full"> {/* Botón moderno */}
            Enviar código
          </button>
        </div>
      ) : (
        <div className="space-y-4 w-full max-w-sm"> {/* Espaciado y ancho máximo */}
          <div className="input-with-icon-wrapper"> {/* Contenedor de input con ícono */}
            <div className="input-icon">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Código de verificación"
              className="input-field-inside flex-1" // Input dentro del wrapper
            />
          </div>
          <button onClick={() => onVerifyCode(verificationCode)} className="btn-primary-gradient w-full"> {/* Botón moderno */}
            Verificar
          </button>
        </div>
      )}
    </div>
  );
}

export default PhoneAuth;
