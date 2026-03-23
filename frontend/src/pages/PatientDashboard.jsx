import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Send, Clock, BookHeart, Smile, TrendingUp, X, Filter } from 'lucide-react';
import axios from 'axios';
import EmotionChart, { formatIST } from '../components/EmotionChart';

const API_URL = 'http://localhost:5000/api';

// IST short date — used on entry cards
const formatISTShort = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric'
  });

const formatISTTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

export default function PatientDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('text');
  const [textContent, setTextContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      await axios.post(
        `${API_URL}/journal/text`,
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
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType });
      const formData = new FormData();
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

  // Filter history by selected dates (using IST dates for comparison)
  const filteredHistory = history.filter(entry => {
    if (!startDate && !endDate) return true;
    // Convert entry date to IST date string for comparison
    const entryDateIST = new Date(
      new Date(entry.created_at).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    entryDateIST.setHours(0, 0, 0, 0);
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
    if (start && end) return entryDateIST >= start && entryDateIST <= end;
    if (start) return entryDateIST >= start;
    if (end) return entryDateIST <= end;
    return true;
  });

  // Build chart data in the same format EmotionChart expects
  // (same structure as therapist side: { date, emotion, confidence_percentage, entry_type })
  const chartData = filteredHistory
    .map(entry => {
      let primaryEmotion = 'Neutral';
      let confidence = 0;
      if (entry.emotions && entry.emotions.length > 0) {
        const top = entry.emotions.reduce((prev, cur) =>
          prev.confidence > cur.confidence ? prev : cur
        );
        primaryEmotion = top.label;
        confidence = top.confidence;
      }
      return {
        date: entry.created_at,
        emotion: primaryEmotion,
        confidence_percentage: confidence,
        entry_type: entry.entry_type
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 border-l-4 border-lavender-400"
      >
        <h2 className="text-2xl font-extrabold text-serenity-800">
          Hello, {user?.name?.split(' ')[0] || 'there'} 👋
        </h2>
        <p className="text-serenity-600/80 font-medium mt-1">
          How are you feeling today? Express yourself below.
        </p>
      </motion.div>

      {/* Journal Input + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journal Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-panel p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <BookHeart className="text-lavender-500 w-6 h-6" />
            <h3 className="text-xl font-bold text-serenity-800">New Journal Entry</h3>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-white/50 p-1.5 rounded-xl border border-serenity-100 shadow-inner mb-5 w-fit">
            <button
              onClick={() => setActiveTab('text')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'text' ? 'bg-white shadow text-serenity-800 scale-[1.02]' : 'text-gray-500 hover:text-lavender-600'}`}
            >
              Text
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'voice' ? 'bg-white shadow text-serenity-800 scale-[1.02]' : 'text-gray-500 hover:text-lavender-600'}`}
            >
              Voice
            </button>
          </div>

          {successMsg && (
            <div className="bg-serenity-50/80 border border-serenity-200 text-serenity-700 p-3 rounded-xl mb-4 text-sm font-medium text-center">
              {successMsg}
            </div>
          )}

          {activeTab === 'text' ? (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={5}
                className="w-full p-4 rounded-2xl border border-serenity-200 bg-white/70 text-serenity-800 placeholder-serenity-300 focus:ring-2 focus:ring-lavender-400/20 focus:border-lavender-400 outline-none resize-none text-sm leading-relaxed"
                placeholder="Write freely about how you're feeling today..."
              />
              <button
                type="submit"
                disabled={loading || !textContent.trim()}
                className="btn-primary flex items-center gap-2 px-6"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <Send size={16} />}
                Save Entry
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-6 py-6">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' : 'bg-lavender-500 hover:bg-lavender-600 hover:scale-105'}`}
              >
                {isRecording ? <Square size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
              </button>
              <p className="text-sm font-medium text-serenity-600">
                {isRecording ? 'Recording... tap to stop' : 'Tap to start recording'}
              </p>
              {loading && (
                <p className="text-sm text-lavender-600 font-medium animate-pulse">
                  Analysing your voice...
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel p-6 flex flex-col"
        >
          <h3 className="text-xl font-bold text-serenity-800 mb-4 flex items-center gap-2">
            <TrendingUp className="text-lavender-500 w-5 h-5" /> Quick Stats
          </h3>
          <div className="space-y-3 flex-1">
            <div className="bg-serenity-50/60 rounded-2xl p-4 border border-serenity-100">
              <p className="text-xs font-bold uppercase tracking-widest text-serenity-400 mb-1">Total Entries</p>
              <p className="text-3xl font-extrabold text-serenity-800">{history.length}</p>
            </div>
            <div className="bg-lavender-50/60 rounded-2xl p-4 border border-lavender-100">
              <p className="text-xs font-bold uppercase tracking-widest text-lavender-400 mb-1">Latest Mood</p>
              <p className="text-xl font-extrabold text-lavender-800">
                {history[0]?.emotions?.[0]?.label || '—'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-serenity-100 text-serenity-500 flex items-center justify-center">
              <Smile size={32} />
            </div>
            <p className="text-sm font-medium text-serenity-700/80 text-center">
              Keep logging to unlock deeper emotional trends.
            </p>
            <button
              onClick={() => setShowStatsModal(true)}
              className="w-full btn-secondary text-sm"
            >
              View Full Stats
            </button>
          </div>
        </motion.div>
      </div>

      {/* Recent Entries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-2xl font-bold text-serenity-800 mb-6 flex items-center gap-2 pl-2">
          <Clock className="text-lavender-500 w-6 h-6" /> Recent Entries
        </h3>

        {history.length === 0 ? (
          <div className="glass-panel p-10 text-center">
            <p className="text-lg text-serenity-500/70 font-medium">
              Your journal is waiting. Start writing above to see your entries here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {history.slice(0, 10).map((entry) => (
              <div
                key={entry.journal_id}
                className="glass-panel p-6 hover:-translate-y-1 transition-transform duration-300 group cursor-pointer flex flex-col h-full border border-serenity-200/60 hover:border-lavender-300 hover:shadow-[0_10px_40px_rgba(139,92,246,0.1)]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-lavender-50 text-lavender-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                    {entry.entry_type}
                  </div>
                  {/* FIX: all dates now in IST */}
                  <span className="text-xs font-semibold text-serenity-400 group-hover:text-serenity-600 transition-colors text-right">
                    {formatISTShort(entry.created_at)}<br />
                    <span className="text-[10px] font-medium opacity-80">{formatISTTime(entry.created_at)}</span>
                  </span>
                </div>

                <h4 className="font-bold text-serenity-900 mb-2 truncate">
                  {entry.entry_type === 'text'
                    ? (entry.text_content?.substring(0, 30) + '...')
                    : 'Voice Recording'}
                </h4>

                {entry.text_content && (
                  <p className="text-sm text-serenity-600 line-clamp-3 leading-relaxed flex-1">
                    {entry.text_content}
                  </p>
                )}

                {entry.emotions && entry.emotions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-serenity-100">
                    {entry.emotions.map((em, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-serenity-50/80 text-serenity-700"
                      >
                        {em.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-serenity-900/40 backdrop-blur-sm"
            onClick={() => setShowStatsModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(74,119,155,0.15)] w-full max-w-2xl relative z-10 overflow-hidden border border-lavender-100/50"
          >
            <div className="p-6 border-b border-serenity-100 flex justify-between items-center bg-serenity-50/50">
              <h3 className="text-xl font-bold text-serenity-900 flex items-center gap-2">
                <TrendingUp className="text-lavender-500" /> Your Emotional Journey
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-serenity-400 hover:text-serenity-700 bg-white rounded-full p-2 shadow-sm transition-all border border-serenity-100 hover:border-serenity-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Date Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 bg-serenity-50/30 p-4 rounded-2xl border border-serenity-100">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter size={16} className="text-serenity-500" />
                  <span className="text-sm font-semibold text-serenity-700">Filter Dates:</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-[10px] uppercase font-bold text-serenity-400">Start</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-3 pt-6 pb-2 pr-3 rounded-xl border border-serenity-200 bg-white text-sm text-serenity-800 focus:ring-2 focus:ring-lavender-400/20 focus:border-lavender-400 outline-none"
                    />
                  </div>
                  <span className="text-serenity-300">-</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-[10px] uppercase font-bold text-serenity-400">End</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-3 pt-6 pb-2 pr-3 rounded-xl border border-serenity-200 bg-white text-sm text-serenity-800 focus:ring-2 focus:ring-lavender-400/20 focus:border-lavender-400 outline-none"
                    />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-xs font-semibold text-lavender-600 hover:text-lavender-800 transition-colors whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* FIX: now uses the same EmotionChart as the doctor side
                  with emotion labels on Y axis instead of a custom inline chart */}
              {chartData.length > 0 ? (
                <div className="bg-white/60 p-2 md:p-4 rounded-3xl border border-serenity-200 shadow-[0_8px_30px_rgba(74,119,155,0.06)]">
                  <EmotionChart data={chartData} />
                </div>
              ) : (
                <div className="text-center py-12 text-serenity-500 bg-serenity-50/50 rounded-2xl border border-serenity-100 border-dashed">
                  <p className="text-lg font-medium">No entries found for this period.</p>
                  <p className="text-sm opacity-80 mt-2">Adjust your date filters or keep journaling!</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}