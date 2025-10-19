// frontend/src/components/TestPanel.js
import { useState } from 'react';
import { FaFlask, FaDatabase, FaRobot, FaTimes, FaTrash, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function TestPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const getToken = () => localStorage.getItem('token');

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const handleSeedData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/test/seed-data');
      alert('✅ Test data seeded successfully!\n' + JSON.stringify(response.data.data, null, 2));
    } catch (err) {
      setError(err.response?.data?.msg || 'Error seeding data');
      alert('❌ ' + (err.response?.data?.msg || 'Error seeding data'));
    } finally {
      setLoading(false);
    }
  };

  const handleRunAllAI = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await api.post('/test/run-all-ai');
      setResults(response.data);
      console.log('[TestPanel] AI Test Results:', response.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error running tests');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('⚠️ This will delete ALL your habits, goals, events, and messages. Continue?')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.delete('/test/clear-data');
      alert('✅ All data cleared!\n' + JSON.stringify(response.data.deleted, null, 2));
      setResults(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error clearing data');
      alert('❌ ' + (err.response?.data?.msg || 'Error clearing data'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition z-50"
        title="Open Test Panel"
      >
        <FaFlask className="text-2xl" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaFlask className="text-xl" />
          <h3 className="font-bold text-lg">AI Test Suite</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 p-1 rounded transition"
        >
          <FaTimes />
        </button>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        <button
          onClick={handleSeedData}
          disabled={loading}
          className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:bg-gray-300"
        >
          <FaDatabase />
          {loading ? 'Seeding...' : '1. Seed Test Data'}
        </button>

        <button
          onClick={handleRunAllAI}
          disabled={loading}
          className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:bg-gray-300"
        >
          <FaRobot />
          {loading ? 'Running...' : '2. Run All AI Tests'}
        </button>

        <button
          onClick={handleClearData}
          disabled={loading}
          className="w-full bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:bg-gray-300"
        >
          <FaTrash />
          {loading ? 'Clearing...' : '3. Clear All Data'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            ❌ {error}
          </div>
        )}

        {results && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm space-y-2 max-h-64 overflow-y-auto">
            <div className="font-bold text-gray-800 flex items-center gap-2">
              <FaCheckCircle className="text-green-500" />
              Test Results:
            </div>

            <div className="space-y-2">
              {/* Phase 1 */}
              <div className="bg-white p-2 rounded border border-gray-200">
                <p className="font-semibold text-purple-700">Phase 1: Suggestions</p>
                <p className="text-xs text-gray-600">
                  {results.results.phase1_suggestions.success
                    ? `✅ ${results.results.phase1_suggestions.count} suggestions generated`
                    : `❌ ${results.results.phase1_suggestions.error}`}
                </p>
              </div>

              {/* Phase 2 */}
              <div className="bg-white p-2 rounded border border-gray-200">
                <p className="font-semibold text-blue-700">Phase 2: Chat</p>
                <p className="text-xs text-gray-600">
                  {results.results.phase2_chat.success
                    ? `✅ ${results.results.phase2_chat.count} responses generated`
                    : `❌ ${results.results.phase2_chat.error}`}
                </p>
              </div>

              {/* Phase 3 */}
              <div className="bg-white p-2 rounded border border-gray-200">
                <p className="font-semibold text-green-700">Phase 3: Notifications</p>
                <p className="text-xs text-gray-600">
                  {results.results.phase3_notifications.success
                    ? `✅ ${results.results.phase3_notifications.count} notifications created`
                    : `❌ ${results.results.phase3_notifications.error}`}
                </p>
              </div>
            </div>

            <button
              onClick={() => console.log('Full Results:', results)}
              className="text-xs text-blue-600 hover:underline"
            >
              View Full Results in Console
            </button>
          </div>
        )}
      </div>
    </div>
  );
}