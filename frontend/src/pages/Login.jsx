import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('patient');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      } else {
        const payload = { email, password, name, role };
        if (role === 'patient' && inviteCode) {
            payload.invite_code = inviteCode;
        }
        await axios.post(`${API_URL}/auth/register`, payload);
        // Auto login after register
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto mt-20"
    >
      <div className="glass-panel p-8">
        <h2 className="text-3xl font-bold text-center text-nature-800 mb-6">
          {isLogin ? 'Welcome Back' : 'Begin Your Journey'}
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field" 
                placeholder="How should we call you?"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field" 
              placeholder="you@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field" 
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${role === 'patient' ? 'bg-nature-50 border-nature-400 text-nature-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <input type="radio" name="role" value="patient" checked={role === 'patient'} onChange={() => setRole('patient')} className="hidden" />
                  Patient
                </label>
                <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${role === 'therapist' ? 'bg-ocean-50 border-ocean-400 text-ocean-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <input type="radio" name="role" value="therapist" checked={role === 'therapist'} onChange={() => setRole('therapist')} className="hidden" />
                  Therapist
                </label>
              </div>
            </div>
          )}

          {!isLogin && role === 'patient' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Therapist Invite Code (Optional)</label>
              <input 
                type="text" 
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="input-field uppercase" 
                placeholder="Enter 6-digit invite code"
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full btn-primary text-lg mt-4 flex justify-center items-center h-12 ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
               isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-nature-600 font-semibold hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
