// frontend/src/pages/Dashboard.js
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { eventsApi, goalsApi, habitsApi, aiApi } from "../api";
import Loader from "../components/Loader";
import IntelligentSuggestions from "../components/IntelligentSuggestions";

const BRAND = {
  blue: "#2C7BE5",     // soft blue
  teal: "#31B7BA",     // your soothing teal
  gradient: "linear-gradient(135deg, #2C7BE5 0%, #31B7BA 100%)",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);

  // Phase 1 Intelligent Suggestions
  const [intelligentSuggestions, setIntelligentSuggestions] = useState([]);
  const [intelligentLoading, setIntelligentLoading] = useState(false);

  // Load core data
  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [hRes, gRes, eRes] = await Promise.all([
          habitsApi.list(),
          goalsApi.list(),
          eventsApi.list(),
        ]);

        const habitsData = hRes?.data || [];
        const goalsData = gRes?.data || [];
        const eventsData = eRes?.data || [];

        setHabits(habitsData);
        setGoals(goalsData);
        setEvents(eventsData);

        // Build 7-day event trend
        const now = new Date();
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() - (6 - i));
          const label = d.toLocaleDateString(undefined, { weekday: "short" });
          const count = (eventsData || []).filter((ev) => {
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
  }, [user]);

  // Fetch Phase 1 Intelligent Suggestions
  useEffect(() => {
    if (!user) return;
    fetchIntelligentSuggestionsData();
  }, [user]);

  const fetchIntelligentSuggestionsData = async (refresh = false) => {
    setIntelligentLoading(true);
    try {
      const response = await aiApi.intelligentSuggestions(refresh);
      const suggestions = response?.data?.suggestions || [];
      setIntelligentSuggestions(suggestions);
    } catch (err) {
      console.error("Failed to fetch intelligent suggestions:", err);
      setIntelligentSuggestions([]);
    } finally {
      setIntelligentLoading(false);
    }
  };

  if (loading) return <Loader />;

  // Stats
  const activeHabits = habits.filter((h) => h.streak > 0).length;
  const totalGoals = goals.length;
  const upcomingEvents = events.filter((e) => new Date(e.start) > new Date()).length;
  const avgGoalProgress =
    goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
      : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header - Soft Radial (Full Width) */}
      <div
        className="rounded-2xl border border-blue-100/60 shadow-sm p-6"
        style={{
          background: `
            radial-gradient(1200px 600px at 0% 0%,
              rgba(44,123,229,0.12) 0%,
              rgba(44,123,229,0.08) 25%,
              rgba(49,183,186,0.08) 55%,
              rgba(49,183,186,0.06) 75%,
              rgba(255,255,255,1) 100%
            ),
            radial-gradient(900px 500px at 100% 100%,
              rgba(49,183,186,0.08) 0%,
              rgba(49,183,186,0.06) 40%,
              rgba(255,255,255,1) 100%
            )
          `
        }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Welcome back, {user?.name || "Friend"}! 🎉
        </h1>
        <p className="text-gray-600">
          Ready to make today productive and meaningful? Here’s your quick snapshot.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-blue-100/60 bg-white/70 backdrop-blur-sm shadow-sm p-5 hover:shadow-md transition">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
            Active Habits
          </h3>
          <p className="text-4xl font-bold mt-2" style={{ color: BRAND.teal }}>
            {activeHabits}
          </p>
          <p className="text-sm text-gray-600 mt-1">out of {habits.length} total</p>
        </div>

        <div className="rounded-xl border border-blue-100/60 bg-white/70 backdrop-blur-sm shadow-sm p-5 hover:shadow-md transition">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
            Goals
          </h3>
          <p className="text-4xl font-bold mt-2" style={{ color: BRAND.blue }}>
            {totalGoals}
          </p>
          <p className="text-sm text-gray-600 mt-1">{avgGoalProgress}% avg progress</p>
        </div>

        <div className="rounded-xl border border-blue-100/60 bg-white/70 backdrop-blur-sm shadow-sm p-5 hover:shadow-md transition">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
            Upcoming Events
          </h3>
          <p className="text-4xl font-bold mt-2 text-indigo-600">
            {upcomingEvents}
          </p>
          <p className="text-sm text-gray-600 mt-1">in your calendar</p>
        </div>

        <div className="rounded-xl border border-blue-100/60 bg-white/70 backdrop-blur-sm shadow-sm p-5 hover:shadow-md transition">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
            Weekly Activity
          </h3>
          <p className="text-4xl font-bold mt-2 text-amber-600">
            {trendData.reduce((sum, d) => sum + d.events, 0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">events this week</p>
        </div>
      </div>

      {/* Phase 1: Intelligent Suggestions */}
      <div className="rounded-2xl border border-blue-100/60 bg-white/70 backdrop-blur-sm shadow-sm p-5">
        <IntelligentSuggestions
          suggestions={intelligentSuggestions}
          loading={intelligentLoading}
          onRefresh={() => fetchIntelligentSuggestionsData(true)}
        />
      </div>

      {/* Weekly Trend Chart (kept original UI) */}
      <div className="rounded-2xl border border-blue-100/60 bg-white/70 backdrop-blur-sm shadow-sm p-5">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Weekly Activity Trend</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            {/* Keeping stroke default to avoid functional/UI regressions */}
            <Line type="monotone" dataKey="events" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
