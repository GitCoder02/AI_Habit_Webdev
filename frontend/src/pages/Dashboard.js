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


  // Load core data (habits/goals/events)
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
      {/* Welcome Header */}
      <div
        className="text-white rounded-lg p-6 shadow-lg"
        style={{
          background: "linear-gradient(135deg, #31B7BA 0%, #26949E 100%)",
        }}
      >
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name || "Friend"}! 🎉
        </h1>
        <p className="text-teal-50">
          Ready to make today productive and meaningful?
          <br />
          Here's your quick snapshot for today — insights are pulled from your
          real data.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <h3 className="text-gray-500 text-sm font-semibold uppercase">
            Active Habits
          </h3>
          <p
            className="text-4xl font-bold mt-2"
            style={{ color: "#31B7BA" }}
          >
            {activeHabits}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            out of {habits.length} total
          </p>
        </Card>

        <Card>
          <h3 className="text-gray-500 text-sm font-semibold uppercase">
            Goals
          </h3>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {totalGoals}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {avgGoalProgress}% avg progress
          </p>
        </Card>

        <Card>
          <h3 className="text-gray-500 text-sm font-semibold uppercase">
            Upcoming Events
          </h3>
          <p className="text-4xl font-bold text-purple-600 mt-2">
            {upcomingEvents}
          </p>
          <p className="text-sm text-gray-600 mt-1">in your calendar</p>
        </Card>

        <Card>
          <h3 className="text-gray-500 text-sm font-semibold uppercase">
            Weekly Activity
          </h3>
          <p className="text-4xl font-bold text-orange-600 mt-2">
            {trendData.reduce((sum, d) => sum + d.events, 0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">events this week</p>
        </Card>
      </div>

      {/* Phase 1: Intelligent Suggestions */}
      <Card>
        <IntelligentSuggestions
          suggestions={intelligentSuggestions}
          loading={intelligentLoading}
          onRefresh={() => fetchIntelligentSuggestionsData(true)}
        />
      </Card>

      {/* Weekly Trend Chart */}
      <Card>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          📊 Weekly Activity Trend
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="events"
              stroke="#8884d8"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
