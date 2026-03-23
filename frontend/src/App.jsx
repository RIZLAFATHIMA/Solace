import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sparkles, LogOut, User } from 'lucide-react';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import TherapistDashboard from './pages/TherapistDashboard';
import Verify from './pages/Verify';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
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
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#f0f4f8] via-white to-[#edeaf8]">
        <div className="absolute top-[-15%] left-[-10%] w-[40rem] h-[40rem] bg-serenity-300/20 rounded-full blur-[100px] z-0 pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[35rem] h-[35rem] bg-lavender-300/20 rounded-full blur-[80px] z-0 pointer-events-none animate-float"></div>

        <div className="relative z-10">
          <header className="px-8 py-4 flex justify-between items-center bg-white/40 backdrop-blur-xl border-b border-white/60 shadow-[0_4px_30px_rgba(74,119,155,0.03)] sticky top-0 z-50">
            <h1 className="text-2xl font-extrabold text-serenity-800 tracking-tight flex items-center gap-2">
              <Sparkles className="text-lavender-500 w-7 h-7" />
              Solace
            </h1>
            {user && (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-3 bg-white/70 px-4 py-1.5 rounded-full border border-serenity-100 shadow-sm transition-all hover:bg-white">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-serenity-400 to-lavender-400 text-white flex items-center justify-center font-bold shadow-inner">
                    {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                  </div>
                  <span className="text-serenity-800 font-semibold text-sm">
                    Hello, {user.name ? user.name.split(' ')[0] : 'User'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 bg-white/50 text-serenity-600 hover:text-lavender-600 hover:bg-white rounded-full transition-all border border-transparent hover:border-serenity-200 hover:shadow-sm"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </header>

          <main className="container mx-auto px-4 py-6 max-w-[1400px]">
            <Routes>
              {/* FIX: added /login as an explicit route so the verify page
                  "Go to Login" button works correctly */}
              <Route path="/" element={
                !user ? <Login onLogin={handleLogin} /> :
                user.role === 'patient' ? <Navigate to="/patient" /> :
                <Navigate to="/therapist" />
              } />

              <Route path="/login" element={
                !user ? <Login onLogin={handleLogin} /> :
                user.role === 'patient' ? <Navigate to="/patient" /> :
                <Navigate to="/therapist" />
              } />

              <Route path="/verify" element={<Verify />} />

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