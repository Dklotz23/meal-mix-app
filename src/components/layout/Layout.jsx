import Navbar from './Navbar';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

export default function Layout({ children }) {
  const { user, logOut } = useAuth();

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
          <button onClick={logOut} className="text-xs font-semibold text-gray-500 hover:text-orange-600" title={`Log out ${user?.email}`}>
            Log out
          </button>
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