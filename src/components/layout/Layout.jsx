import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

export default function Layout({ children }) {
  const { user, logOut } = useAuth();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  return (
    // 1. Outer Background: Gray and centered (Like a desktop workspace)
    <div className="min-h-screen bg-gray-100 flex justify-center font-sans">
      
      {/* 2. The "Phone" Container: Fixed width, white background, shadow */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative">
        
        {/* Mobile Top Header (Now visible everywhere) */}
        <div className="bg-white p-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-100">
          <div className="flex items-center">
            <img src={logo} alt="Meal Mix" className="h-8 w-auto mr-2" />
            <span className="text-lg font-bold text-orange-600">Meal Mix</span>
          </div>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-gray-700 hover:text-orange-600"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div
          className={`absolute inset-0 z-[60] bg-gray-900/40 transition-opacity duration-300 ease-out ${
            isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
          aria-hidden={!isMenuOpen}
        >
            <aside
              className={`absolute right-0 top-0 h-full w-[90%] bg-white shadow-2xl transition-transform duration-300 ease-out ${
                isMenuOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-orange-600"
                  aria-label="Close menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <section className="border-b border-gray-100 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Account</h3>
                <p className="break-words text-sm font-medium text-gray-800">{user?.email}</p>
                <button
                  onClick={logOut}
                  className="mt-4 text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  Log out
                </button>
              </section>

            </aside>
        </div>

        {/* Main Content Area */}
        <main className="p-4 pb-24">
          {children}
        </main>

        {/* Navigation */}
        <Navbar />
      </div>
    </div>
  );
}