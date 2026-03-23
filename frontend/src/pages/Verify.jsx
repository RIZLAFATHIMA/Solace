import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Verify() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Verifying your email...');
  const hasAttempted = useRef(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing verification token.');
        return;
      }
      
      // Prevent double calls in Strict Mode
      if (hasAttempted.current) return;
      hasAttempted.current = true;

      try {
        const res = await axios.get(`${API_URL}/auth/verify/${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. Please try again or request a new link.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel max-w-md w-full p-8 text-center flex flex-col items-center gap-6"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-lavender-500 animate-spin" />
            <h2 className="text-2xl font-bold text-serenity-800">Verifying...</h2>
            <p className="text-serenity-600/70 font-medium">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <CheckCircle2 className="w-20 h-20 text-serenity-500" />
            </motion.div>
            <h2 className="text-2xl font-extrabold text-serenity-800 mt-2">Account Verified!</h2>
            <p className="text-serenity-600/70 font-medium">{message}</p>
            <button 
              onClick={() => navigate('/')} 
              className="mt-4 btn-primary w-full max-w-xs"
            >
              Go to Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <XCircle className="w-20 h-20 text-red-500" />
            </motion.div>
            <h2 className="text-2xl font-extrabold text-serenity-800 mt-2">Verification Failed</h2>
            <p className="text-serenity-600/70 font-medium mb-2">{message}</p>
            <button 
              onClick={() => navigate('/')} 
              className="mt-4 px-6 py-2.5 bg-serenity-50 text-serenity-700 font-bold border border-serenity-200 rounded-xl hover:bg-serenity-100 hover:shadow-sm transition-all duration-300 w-full max-w-xs"
            >
              Return Home
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
