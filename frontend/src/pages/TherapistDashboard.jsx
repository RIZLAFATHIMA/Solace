import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertCircle, ChevronRight, ChevronLeft, Filter } from 'lucide-react';
import axios from 'axios';
import EmotionChart, { formatIST } from '../components/EmotionChart';

const API_URL = 'http://localhost:5000/api';

// IST short date for "Patient since" label
const formatISTDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

export default function TherapistDashboard({ user }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientEmotions, setPatientEmotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accepted');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/therapist/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data);
    } catch (err) {
      console.error('Error fetching patients', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientStatus = async (patientId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/therapist/patients/${patientId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPatients();
    } catch (err) {
      console.error('Error updating patient status', err);
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const loadPatientDetails = async (patient) => {
    setSelectedPatient(patient);
    setPatientEmotions([]);
    setStartDate('');
    setEndDate('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/therapist/patients/${patient.patient_id}/emotions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientEmotions(res.data);
    } catch (err) {
      console.error('Error fetching details', err);
    }
  };

  // Filter using IST dates for correct day boundaries
  const filteredEmotions = patientEmotions.filter(entry => {
    if (!startDate && !endDate) return true;
    const entryDateIST = new Date(
      new Date(entry.date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    entryDateIST.setHours(0, 0, 0, 0);
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
    if (start && end) return entryDateIST >= start && entryDateIST <= end;
    if (start) return entryDateIST >= start;
    if (end) return entryDateIST <= end;
    return true;
  });

  if (loading) return (
    <div className="text-center py-20 animate-pulse font-bold text-serenity-600">
      Loading your dashboard...
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto min-h-[calc(100vh-8rem)] flex flex-col gap-4 pb-12">
      {/* Invite Code Banner */}
      <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-serenity-400 shadow-[0_4px_20px_rgba(74,119,155,0.06)]">
        <div>
          <h2 className="text-lg font-bold text-serenity-800">Your Therapist Invite Code</h2>
          <p className="text-sm font-medium text-serenity-600/70">
            Provide this 6-digit code to your patients during registration so they can link their accounts to you.
          </p>
        </div>
        <div className="bg-white/80 px-6 py-2.5 rounded-xl border border-serenity-200 shadow-inner font-mono text-xl font-extrabold tracking-widest text-serenity-800">
          {user?.invite_code || '------'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 items-start">
        {/* Patient List Sidebar */}
        <div className={`glass-panel p-4 flex flex-col ${selectedPatient ? 'hidden md:flex' : 'flex'} md:col-span-1 border-r border-gray-100 md:sticky md:top-6 h-[calc(100vh-12rem)]`}>
          <div className="flex flex-col gap-2 mb-4">
            <h2 className="text-lg font-bold text-serenity-800 flex items-center gap-2 px-2">
              <Users size={20} className="text-lavender-500" /> Patients
            </h2>
            <div className="flex bg-white/50 p-1.5 rounded-xl border border-serenity-100 shadow-inner">
              <button
                onClick={() => setActiveTab('accepted')}
                className={`flex-1 text-sm py-2 rounded-lg transition-all duration-300 font-bold ${activeTab === 'accepted' ? 'bg-white shadow-[0_2px_8px_rgba(74,119,155,0.08)] text-serenity-800 scale-[1.02]' : 'text-gray-500 hover:text-lavender-600'}`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 text-sm py-2 rounded-lg transition-all duration-300 font-bold ${activeTab === 'pending' ? 'bg-white shadow-[0_2px_8px_rgba(74,119,155,0.08)] text-serenity-800 scale-[1.02]' : 'text-gray-500 hover:text-lavender-600'}`}
              >
                Pending {patients.filter(p => p.status === 'pending').length > 0 && `(${patients.filter(p => p.status === 'pending').length})`}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {patients.filter(p => p.status === activeTab).length === 0 ? (
              <p className="text-sm text-gray-400 p-4 text-center">No {activeTab} patients.</p>
            ) : (
              patients.filter(p => p.status === activeTab).map(p => (
                <div
                  key={p.patient_id}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all duration-300 flex flex-col group ${selectedPatient?.patient_id === p.patient_id ? 'bg-serenity-50 border-serenity-300 border shadow-[0_2px_10px_rgba(74,119,155,0.15)] text-serenity-800 scale-[1.02]' : 'bg-transparent hover:bg-white/60 border border-transparent hover:border-serenity-200 text-gray-500 hover:shadow-sm'}`}
                >
                  <button
                    onClick={() => activeTab === 'accepted' && loadPatientDetails(p)}
                    className="flex justify-between items-center w-full"
                    disabled={activeTab === 'pending'}
                  >
                    <div className="truncate pr-2 text-left">
                      <p className="font-bold truncate group-hover:text-lavender-700 transition-colors text-[15px]">{p.name || 'Anonymous'}</p>
                      <p className="text-xs font-medium text-gray-400 truncate">{p.email}</p>
                    </div>
                    {activeTab === 'accepted' && (
                      <ChevronRight size={18} className={`transition-transform duration-300 ${selectedPatient?.patient_id === p.patient_id ? 'text-lavender-500 translate-x-1' : 'text-gray-300 group-hover:text-serenity-400'}`} />
                    )}
                  </button>

                  {activeTab === 'pending' && (
                    <div className="flex gap-2 mt-4 p-1">
                      <button onClick={() => handlePatientStatus(p.patient_id, 'accepted')} className="flex-1 bg-serenity-50 text-serenity-700 border border-serenity-200 hover:bg-serenity-100 py-2 rounded-xl text-xs font-bold transition-all duration-300 hover:shadow-sm">Accept</button>
                      <button onClick={() => handlePatientStatus(p.patient_id, 'rejected')} className="flex-1 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 py-2 rounded-xl text-xs font-bold transition-all duration-300 hover:shadow-sm">Reject</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Patient Details */}
        <div className={`md:col-span-3 flex flex-col ${!selectedPatient ? 'hidden md:flex' : 'flex'}`}>
          <AnimatePresence mode="wait">
            {!selectedPatient ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 glass-panel flex flex-col items-center justify-center text-serenity-600"
              >
                <AlertCircle size={48} strokeWidth={1} className="mb-5 text-lavender-400 animate-pulse-slow" />
                <p className="font-medium text-lg">Select a patient to view their emotional journey.</p>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 glass-panel p-6 flex flex-col relative overflow-hidden"
              >
                <div className="flex items-center gap-4 mb-6 md:mb-8 border-b border-serenity-100 pb-4">
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="md:hidden p-2 bg-serenity-50 rounded-lg text-serenity-600 hover:bg-serenity-100 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-extrabold text-serenity-800">{selectedPatient.name || 'Anonymous'}</h2>
                    {/* FIX: date now shown in IST */}
                    <p className="text-sm font-medium text-serenity-600/70">
                      Patient since {selectedPatient.assigned_at ? formatISTDate(selectedPatient.assigned_at) : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 pr-2">
                  <div className="mb-8 relative z-10">
                    <h3 className="text-lg font-bold text-serenity-800 mb-2">Emotion Analysis Trend</h3>
                    <p className="text-sm font-medium text-serenity-600/70 mb-4">
                      Historical analysis of dominant emotions over time.
                    </p>

                    {/* Date Filters */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 bg-serenity-50/30 p-4 rounded-2xl border border-serenity-100">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter size={16} className="text-serenity-500" />
                        <span className="text-sm font-semibold text-serenity-700">Filter Dates:</span>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-2.5 text-[10px] uppercase font-bold text-serenity-400">Start</span>
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-3 pt-6 pb-2 pr-3 rounded-xl border border-serenity-200 bg-white text-sm text-serenity-800 focus:ring-2 focus:ring-lavender-400/20 focus:border-lavender-400 outline-none" />
                        </div>
                        <span className="text-serenity-300">-</span>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-2.5 text-[10px] uppercase font-bold text-serenity-400">End</span>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-3 pt-6 pb-2 pr-3 rounded-xl border border-serenity-200 bg-white text-sm text-serenity-800 focus:ring-2 focus:ring-lavender-400/20 focus:border-lavender-400 outline-none" />
                        </div>
                      </div>
                      {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs font-semibold text-lavender-600 hover:text-lavender-800 transition-colors whitespace-nowrap">
                          Clear Filters
                        </button>
                      )}
                    </div>

                    <div className="bg-white/60 p-2 md:p-6 rounded-3xl border border-serenity-200 shadow-[0_8px_30px_rgba(74,119,155,0.06)] backdrop-blur-sm">
                      <EmotionChart data={filteredEmotions} />
                    </div>
                  </div>

                  {/* Recent Insight Logs */}
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-serenity-800 mb-4">Recent Insight Logs</h3>
                    <div className="space-y-3">
                      {filteredEmotions.slice().reverse().map((entry, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/70 rounded-2xl border border-serenity-100 gap-4 hover:shadow-[0_4px_20px_rgba(139,92,246,0.08)] hover:border-lavender-300 transition-all duration-300 group">
                          <div>
                            <p className="text-sm font-bold text-lavender-800 uppercase tracking-widest bg-lavender-50 inline-block px-2 py-1 rounded-md mb-2 border border-lavender-100">
                              {entry.emotion}
                            </p>
                            {/* FIX: date shown in IST */}
                            <p className="text-xs font-medium text-gray-500 group-hover:text-serenity-600 transition-colors">
                              {formatIST(entry.date)} • {entry.entry_type} entry
                            </p>
                          </div>
                          <div className="bg-white px-3.5 py-1.5 rounded-xl text-sm font-bold text-serenity-700 border border-serenity-200 shadow-sm flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-lavender-500 animate-pulse"></div>
                            {entry.confidence_percentage}% Confidence
                          </div>
                        </div>
                      ))}
                      {filteredEmotions.length === 0 && (
                        <p className="text-sm font-medium text-serenity-600/50 italic">
                          No entries recorded for this patient or period yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}