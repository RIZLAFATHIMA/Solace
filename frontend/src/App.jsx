import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import TherapistDashboard from './pages/TherapistDashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check local storage for user on load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-nature-50 to-white">
        {/* Soft decorative background circles */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-nature-200/40 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-ocean-200/40 rounded-full blur-3xl z-0 pointer-events-none"></div>

        <div className="relative z-10">
          <header className="px-8 py-4 flex justify-between items-center glass-panel m-4">
            <h1 className="text-2xl font-bold text-nature-800 tracking-tight flex items-center gap-2">
              <span className="text-nature-500">❀</span> Serenity Journal
            </h1>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Welcome, {user.name || user.email.split('@')[0]}</span>
                <button onClick={handleLogout} className="btn-secondary text-sm px-4 py-1.5">
                  Sign Out
                </button>
              </div>
            )}
          </header>

          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={
                 !user ? (
                   <Login onLogin={handleLogin} />
                 ) : user.role === 'patient' ? (
                   <Navigate to="/patient" />
                 ) : (
                   <Navigate to="/therapist" />
                 )
              } />
              
              <Route path="/patient" element={
                user?.role === 'patient' ? <PatientDashboard user={user} /> : <Navigate to="/" />
              } />
              
              <Route path="/therapist" element={
                user?.role === 'therapist' ? <TherapistDashboard user={user} /> : <Navigate to="/" />
              } />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
