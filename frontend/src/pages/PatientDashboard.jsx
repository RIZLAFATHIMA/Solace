import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Send, Clock, BookHeart } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function PatientDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('text'); // text or voice
  const [textContent, setTextContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [history, setHistory] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/journal/my-entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textContent.trim()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/journal/text`, 
        { text_content: textContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg('Journal entry saved beautifully.');
      setTextContent('');
      fetchHistory();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = uploadAudio;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied', err);
      alert('Microphone access is required to record voice entries.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadAudio = async () => {
    setLoading(true);
    try {
      // We'll use the browser's default audio type, which is typically webm or mp4 
      // but we will name it with a generic .webm extension because `librosa` usually expects 
      // specific headers. If this fails, we will need to handle the conversion.
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType });
      const formData = new FormData();
      
      // Send as webm. Librosa will pass it to soundfile.
      formData.append('audio', audioBlob, 'journal_voice.webm');

      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/journal/voice`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccessMsg('Voice entry saved beautifully.');
      fetchHistory();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to upload voice entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Input Section */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="md:col-span-2 space-y-6"
      >
        <div className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-nature-800 mb-4 flex items-center gap-2">
            <BookHeart className="text-nature-500" /> Express Yourself
          </h2>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'text' ? 'bg-white shadow text-nature-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Write
            </button>
            <button 
              onClick={() => setActiveTab('voice')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'voice' ? 'bg-white shadow text-ocean-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Speak
            </button>
          </div>

          {activeTab === 'text' ? (
            <form onSubmit={handleTextSubmit}>
              <textarea 
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="How are you feeling today? Let your thoughts flow..."
                className="w-full h-40 p-4 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:border-nature-300 focus:ring-2 focus:ring-nature-100 outline-none resize-none transition-all placeholder:text-gray-400"
              />
              <div className="flex justify-end mt-4">
                <button 
                  type="submit" 
                  disabled={loading || !textContent.trim()}
                  className="btn-primary flex items-center gap-2 px-6 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : <><Send size={16} /> Save Entry</>}
                </button>
              </div>
            </form>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-gray-100 border-dashed">
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  className="w-16 h-16 bg-ocean-100 hover:bg-ocean-200 text-ocean-600 rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <Mic size={24} />
                </button>
              ) : (
                <button 
                  onClick={stopRecording}
                  className="w-16 h-16 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-all animate-pulse"
                >
                  <Square size={20} className="fill-current" />
                </button>
              )}
              <p className="mt-4 text-gray-500 text-sm">
                {isRecording ? 'Listening... Click to stop.' : 'Click to start recording your voice.'}
              </p>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3 bg-nature-50 text-nature-700 rounded-lg text-sm transition-opacity opacity-100 flex items-center gap-2">
              <span className="text-xl">✨</span> {successMsg}
            </div>
          )}
        </div>
      </motion.div>

      {/* History Section */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel p-6 h-[calc(100vh-12rem)] overflow-y-auto"
      >
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-gray-400" /> Recent Entries
        </h3>
        
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center mt-10">No entries yet. Start your journey today.</p>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.journal_id} className="p-4 rounded-xl bg-white/60 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {entry.entry_type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {entry.text_content && (
                  <p className="text-sm text-gray-700 line-clamp-3 mb-3">{entry.text_content}</p>
                )}
                {entry.emotions && entry.emotions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.emotions.map((em, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-nature-50 text-nature-700 border border-nature-100">
                        {em.label} • {em.confidence}%
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
