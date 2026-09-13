import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Auth from './pages/Auth';
import { useAuth } from './context/AuthContext';

// Import Pages (Currently empty placeholders)
import Generator from './pages/Generator';
import ManageMeals from './pages/ManageMeals';
import Pantry from './pages/Pantry';

function App() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          {/* 1. Home Page: Where we decide what to eat */}
          <Route path="/" element={<Generator />} />
          
          {/* 2. Manage Page: Add/Edit recipes */}
          <Route path="/manage" element={<ManageMeals />} />
          
          {/* 3. Store Page: Grocery list */}
          <Route path="/store" element={<Pantry />} />
          <Route path="/pantry" element={<Pantry />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;