import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import EmotionChart from '../components/EmotionChart';

const API_URL = 'http://localhost:5000/api';

export default function TherapistDashboard({ user }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientEmotions, setPatientEmotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accepted'); // 'accepted' or 'pending'

  useEffect(() => {
    fetchPatients();
  }, []);

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
      // Refresh list
      fetchPatients();
    } catch (err) {
      console.error('Error updating patient status', err);
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const loadPatientDetails = async (patient) => {
    setSelectedPatient(patient);
    setPatientEmotions([]); // Reset while loading
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

  if (loading) return <div className="text-center py-20 animate-pulse text-nature-600">Loading your dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto min-h-[calc(100vh-8rem)] flex flex-col gap-4 pb-12">
      {/* Invite Code Banner */}
      <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-nature-400">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Your Therapist Invite Code</h2>
          <p className="text-sm text-gray-500">Provide this 6-digit code to your patients during registration so they can link their accounts to you.</p>
        </div>
        <div className="bg-white/60 px-6 py-2 rounded-xl border border-gray-200 shadow-sm font-mono text-xl font-extrabold tracking-widest text-nature-700">
          {user?.invite_code || '------'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 items-start">
        {/* Patient List Sidebar */}
        <div className={`glass-panel p-4 flex flex-col ${selectedPatient ? 'hidden md:flex' : 'flex'} md:col-span-1 border-r border-gray-100 md:sticky md:top-6 h-[calc(100vh-12rem)]`}>
          <div className="flex flex-col gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 px-2">
              <Users size={20} className="text-nature-500" /> Patients
            </h2>
            <div className="flex bg-gray-100/50 p-1 rounded-lg">
              <button onClick={() => setActiveTab('accepted')} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${activeTab === 'accepted' ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500'}`}>
                Active
              </button>
              <button onClick={() => setActiveTab('pending')} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500'}`}>
                Pending {patients.filter(p => p.status === 'pending').length > 0 && `(${patients.filter(p => p.status === 'pending').length})`}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {patients.filter(p => p.status === activeTab).length === 0 ? (
              <p className="text-sm text-gray-400 p-4 text-center">No {activeTab} patients.</p>
            ) : (
              patients.filter(p => p.status === activeTab).map(p => (
                <div key={p.patient_id} className={`w-full text-left p-3 rounded-xl transition-all flex flex-col ${selectedPatient?.patient_id === p.patient_id ? 'bg-nature-50 border-nature-200 border text-nature-800 shadow-sm' : 'bg-transparent hover:bg-white/50 border border-transparent hover:border-gray-100 text-gray-600'}`}>
                  <button
                    onClick={() => activeTab === 'accepted' && loadPatientDetails(p)}
                    className="flex justify-between items-center w-full"
                    disabled={activeTab === 'pending'}
                  >
                    <div className="truncate pr-2 text-left">
                      <p className="font-medium truncate">{p.name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-400 truncate">{p.email}</p>
                    </div>
                    {activeTab === 'accepted' && <ChevronRight size={16} className={selectedPatient?.patient_id === p.patient_id ? 'text-nature-500' : 'text-gray-300'} />}
                  </button>
                  
                  {activeTab === 'pending' && (
                    <div className="flex gap-2 mt-3 p-1">
                      <button onClick={() => handlePatientStatus(p.patient_id, 'accepted')} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-1.5 rounded-md text-xs font-semibold transition-colors">Accept</button>
                      <button onClick={() => handlePatientStatus(p.patient_id, 'rejected')} className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 py-1.5 rounded-md text-xs font-semibold transition-colors">Reject</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Patient Details Main Area */}
        <div className={`md:col-span-3 flex flex-col ${!selectedPatient ? 'hidden md:flex' : 'flex'}`}>
          <AnimatePresence mode="wait">
            {!selectedPatient ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 glass-panel flex flex-col items-center justify-center text-gray-400"
              >
                <AlertCircle size={48} strokeWidth={1} className="mb-4 text-gray-300" />
                <p>Select a patient to view their emotional journey.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="details"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 glass-panel p-6 flex flex-col relative"
              >
                <div className="flex items-center gap-4 mb-6 md:mb-8 border-b border-gray-100 pb-4">
                  <button onClick={() => setSelectedPatient(null)} className="md:hidden p-2 bg-gray-50 rounded-lg text-gray-500">
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedPatient.name || 'Anonymous'}</h2>
                    <p className="text-sm text-gray-500">Patient since {new Date(selectedPatient.assigned_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex-1 pr-2">
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Emotion Analysis Trend</h3>
                    <p className="text-sm text-gray-500 mb-4">Historical analysis of dominant emotions over time.</p>
                    <div className="bg-white/40 p-2 md:p-6 rounded-2xl border border-gray-100/50 shadow-inner">
                      <EmotionChart data={patientEmotions} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Recent Insight Logs</h3>
                    <div className="space-y-3">
                      {patientEmotions.slice().reverse().map((entry, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/50 rounded-xl border border-gray-100 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-800 uppercase">{entry.emotion}</p>
                            <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleString()} • {entry.entry_type} entry</p>
                          </div>
                          <div className="bg-white px-3 py-1 rounded-full text-sm font-semibold text-nature-600 border border-nature-100 shadow-sm">
                            {entry.confidence_percentage}% Confidence
                          </div>
                        </div>
                      ))}
                      {patientEmotions.length === 0 && (
                        <p className="text-sm text-gray-400 italic">No entries recorded for this patient yet.</p>
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
