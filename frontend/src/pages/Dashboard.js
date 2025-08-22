// frontend/src/pages/Dashboard.js
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dashboardApi } from "../api";
import Loader from "../components/Loader";

export default function Dashboard() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await dashboardApi.summary();
        setSummary(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard summary:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (!summary) return <Loader />;

  return (
    <div className="bg-light-gray-bg min-h-screen p-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Good morning, {user?.name || "User"}! 👋</h1>
      <p className="text-gray-500 mb-6">Ready to make today productive and meaningful?</p>

      <Card accent="border-l-4 border-mint-green">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-mint-green-200 rounded-full flex items-center justify-center text-mint-green-800 text-xl">🤖</div>
          <p className="text-gray-700 font-medium">
            Here's your quick snapshot for today — insights are pulled from your real data.
          </p>
        </div>
      </Card>

      <Card title="Progress Overview">
        <div className="flex justify-around items-center text-center space-x-4">
          <div>
            <div className="text-mint-green mb-1 font-bold text-2xl">
              {summary.completedToday}/{summary.totalHabits}
            </div>
            <span className="text-sm text-gray-600">Today's Habits</span>
          </div>
          <div>
            <div className="text-energetic-orange mb-1 font-bold text-2xl">
              {summary.totalGoals ? Math.round((summary.completedGoals / summary.totalGoals) * 100) : 0}%
            </div>
            <span className="text-sm text-gray-600">Completed Goals</span>
          </div>
          <div>
            <div className="text-energetic-orange mb-1 font-bold text-2xl">{summary.topStreak} days</div>
            <span className="text-sm text-gray-600">Top Streak</span>
          </div>
        </div>
      </Card>

      <Card title="Weekly Events Trend">
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={summary.weeklyEvents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="events" stroke="#FF9F1C" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}