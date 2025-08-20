// frontend/src/pages/Dashboard.js
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { eventsApi, goalsApi, habitsApi } from "../api";
import Loader from "../components/Loader";

export default function Dashboard() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // small "trend" derived from events (events per day in last 7 days)
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [hRes, gRes, eRes] = await Promise.all([habitsApi.list(), goalsApi.list(), eventsApi.list()]);
        setHabits(hRes.data || []);
        setGoals(gRes.data || []);
        setEvents(eRes.data || []);

        // build simple 7-day trend from events (count per day)
        const now = new Date();
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() - (6 - i));
          const label = d.toLocaleDateString(undefined, { weekday: "short" });
          const count = (eRes.data || []).filter(ev => {
            const evDate = new Date(ev.start);
            return evDate.toDateString() === d.toDateString();
          }).length;
          return { day: label, events: count };
        });
        setTrendData(days);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <Loader />;

  const completedToday = habits.filter(h => h.completedToday).length;
  const totalHabits = habits.length;
  const activeGoals = goals.filter(g => !g.isCompleted).length;
  const weeklyStreak = Math.max(...habits.map(h => h.streak), 0);

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
          <div className="flex flex-col items-center">
            <div className="text-mint-green mb-1 font-bold text-2xl">{completedToday}/{totalHabits}</div>
            <span className="text-sm text-gray-600">Today's Habits</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-energetic-orange mb-1 font-bold text-2xl">{goals.length ? Math.round((goals.filter(g=>g.isCompleted).length/goals.length)*100) : 0}%</div>
            <span className="text-sm text-gray-600">Completed Goals</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-energetic-orange mb-1 font-bold text-2xl">{weeklyStreak} days</div>
            <span className="text-sm text-gray-600">Top Streak</span>
          </div>
        </div>
      </Card>

      <Card title="Weekly Events Trend">
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={trendData}>
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