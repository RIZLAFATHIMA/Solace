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
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      } else {
        // Registration — backend now sends a verification email
        // and does NOT return a token. Show success message instead.
        const payload = { email, password, name, role };
        if (role === 'patient' && inviteCode) {
          payload.invite_code = inviteCode;
        }
        await axios.post(`${API_URL}/auth/register`, payload);
        setSuccess(
          'Account created! Please check your email and click the verification link before logging in.'
        );
        // Switch to login tab so user can login after verifying
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
          setEmail(email); // keep email filled in for convenience
          setPassword('');
        }, 4000);
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to server. Please ensure the backend is running.');
      } else {
        // FIX: handle the 403 "please verify your email" case explicitly
        if (err.response.status === 403) {
          setError(
            'Please verify your email before logging in. Check your inbox for the verification link.'
          );
        } else {
          setError(err.response?.data?.message || 'Something went wrong');
        }
      }
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
        <h2 className="text-3xl font-extrabold text-center text-serenity-800 mb-6 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Begin Your Journey'}
        </h2>

        {error && (
          <div className="bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 p-3 rounded-xl mb-4 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-serenity-50/80 backdrop-blur-sm border border-serenity-200 text-serenity-700 p-3 rounded-xl mb-4 text-sm text-center font-medium shadow-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-serenity-800 mb-1.5 ml-1">Name</label>
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
            <label className="block text-sm font-semibold text-serenity-800 mb-1.5 ml-1">Email</label>
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
            <label className="block text-sm font-semibold text-serenity-800 mb-1.5 ml-1">Password</label>
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
              <label className="block text-sm font-semibold text-serenity-800 mb-1.5 ml-1">I am a...</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-300 font-semibold ${role === 'patient' ? 'bg-serenity-50 border-serenity-400 text-serenity-700 shadow-[0_4px_12px_rgba(74,119,155,0.15)] scale-[1.02]' : 'bg-white/50 border-serenity-100 text-gray-500 hover:bg-serenity-50/50 hover:border-serenity-200'}`}>
                  <input type="radio" name="role" value="patient" checked={role === 'patient'} onChange={() => setRole('patient')} className="hidden" />
                  Patient
                </label>
                <label className={`flex-1 flex items-center justify-center p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-300 font-semibold ${role === 'therapist' ? 'bg-lavender-50 border-lavender-400 text-lavender-800 shadow-[0_4px_12px_rgba(139,92,246,0.15)] scale-[1.02]' : 'bg-white/50 border-serenity-100 text-gray-500 hover:bg-lavender-50/50 hover:border-lavender-200'}`}>
                  <input type="radio" name="role" value="therapist" checked={role === 'therapist'} onChange={() => setRole('therapist')} className="hidden" />
                  Therapist
                </label>
              </div>
            </div>
          )}

          {!isLogin && role === 'patient' && (
            <div>
              <label className="block text-sm font-semibold text-serenity-800 mb-1.5 ml-1">
                Therapist Invite Code (Optional)
              </label>
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
            className={`w-full btn-primary text-lg mt-6 flex justify-center items-center h-14 ${loading ? 'opacity-80 scale-[0.98]' : ''}`}
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

        {/* Resend verification link — shown on login tab only */}
        {isLogin && (
          <div className="mt-3 text-center">
            <button
              onClick={async () => {
                if (!email) {
                  setError('Enter your email above first.');
                  return;
                }
                try {
                  await axios.post(`${API_URL}/auth/resend-verification`, { email });
                  setSuccess('Verification email resent! Check your inbox.');
                  setError('');
                } catch {
                  setError('Failed to resend. Please try again.');
                }
              }}
              className="text-xs text-gray-400 hover:text-serenity-600 transition-colors underline"
            >
              Didn't receive verification email? Resend it
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600 font-medium">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setSuccess('');
              setError('');
            }}
            className="text-lavender-600 font-bold hover:text-lavender-700 hover:underline transition-colors ml-1"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}