import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { HomeIcon, UsersIcon, CreditCardIcon, ChartBarIcon, ClipboardDocumentListIcon, ArrowLeftOnRectangleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login'); // Redirige a la página de login después de cerrar sesión
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Opcional: Mostrar un mensaje de error al usuario, por ejemplo con un estado de error
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: HomeIcon },
    { name: 'Miembros', path: '/members', icon: UsersIcon },
    { name: 'Pagos', path: '/payments', icon: CreditCardIcon },
    { name: 'Gastos', path: '/expenses', icon: ChartBarIcon },
    { name: 'Aportaciones', path: '/contributions', icon: ClipboardDocumentListIcon },
  ];

  return (
    <nav className="bg-white-pure shadow-md sticky top-0 z-50 animate-fadeInUp">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo o Título de la Aplicación */}
        <Link to="/" className="text-blue-dark text-2xl font-bold hover:text-blue-secondary transition-colors duration-300">
          Mi App Financiera
        </Link>

        {/* Botón de menú móvil */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-blue-dark focus:outline-none p-2 rounded-md hover:bg-gray-soft transition-colors duration-200">
            {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>

        {/* Menú de navegación - Desktop */}
        <div className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="text-gray-700 hover:text-blue-dark font-medium transition-colors duration-200 inline-flex items-center group"
            >
              <link.icon className="h-5 w-5 mr-2 text-gray-500 group-hover:text-blue-dark icon-interactive" />
              {link.name}
            </Link>
          ))}
        </div>

        {/* Información del usuario y botón de cerrar sesión - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Muestra el nombre si currentUser existe y tiene displayName */}
          {currentUser && currentUser.displayName && (
            <span className="text-gray-700 text-sm font-medium">
              Hola, {currentUser.displayName.split(' ')[0]}!
            </span>
          )}
          {/* Muestra el botón de cerrar sesión si hay un usuario logueado */}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="btn-secondary-outline inline-flex items-center text-sm px-3 py-1.5"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 icon-interactive" />
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>

      {/* Menú de navegación - Móvil (se muestra/oculta con el estado isOpen) */}
      {isOpen && (
        <div className="md:hidden bg-white-pure px-4 pt-2 pb-4 shadow-inner">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="block text-gray-700 hover:text-blue-dark font-medium py-2 px-3 rounded-md hover:bg-gray-100 transition-colors duration-200 inline-flex items-center"
              >
                <link.icon className="h-5 w-5 mr-3 text-gray-500" />
                {link.name}
              </Link>
            ))}
            <hr className="border-gray-200 my-2" />
            {/* Muestra el nombre si currentUser existe y tiene displayName para móvil */}
            {currentUser && currentUser.displayName && (
              <span className="text-gray-700 text-sm font-medium py-2 px-3">
                Hola, {currentUser.displayName.split(' ')[0]}!
              </span>
            )}
            {/* Muestra el botón de cerrar sesión si hay un usuario logueado para móvil */}
            {currentUser && (
              <button
                onClick={handleLogout}
                className="btn-secondary-outline inline-flex items-center text-sm px-3 py-1.5 w-full justify-center"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2" />
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;