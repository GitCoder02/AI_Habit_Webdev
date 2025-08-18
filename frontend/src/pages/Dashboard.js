// frontend/src/pages/Dashboard.js
import Card from "../components/Card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { FaCheckCircle, FaBullseye, FaChartLine } from 'react-icons/fa';

const trendData = [
  { day: "Mon", energy: 3, productivity: 5 },
  { day: "Tue", energy: 4, productivity: 6 },
  { day: "Wed", energy: 2, productivity: 4 },
  { day: "Thu", energy: 5, productivity: 8 },
  { day: "Fri", energy: 4, productivity: 7 },
  { day: "Sat", energy: 6, productivity: 6 },
  { day: "Sun", energy: 5, productivity: 4 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const userName = user?.name || "User";

  return (
    <div className="bg-light-gray-bg min-h-screen p-6 space-y-6">
      {/* Welcome */}
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
        Good morning, {userName}! 👋
      </h1>
      <p className="text-gray-500 mb-6">Ready to make today productive and meaningful?</p>

      {/* Daily AI Summary */}
      <Card accent="border-l-4 border-mint-green">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-mint-green-200 rounded-full flex items-center justify-center text-mint-green-800 text-xl">🤖</div>
          <p className="text-gray-700 font-medium">
            You're off to a great start today! Focus on your morning habits and tackle your most important goals first. ☀️
          </p>
        </div>
      </Card>

      {/* Progress Overview */}
      <Card title="Progress Overview">
        <div className="flex justify-around items-center text-center space-x-4">
          <div className="flex flex-col items-center">
            <FaCheckCircle size={24} className="text-mint-green mb-1" />
            <span className="text-2xl font-bold text-energetic-orange">3/5</span>
            <span className="text-sm text-gray-600">Today's Habits</span>
          </div>
          <div className="flex flex-col items-center">
            <FaBullseye size={24} className="text-energetic-orange mb-1" />
            <span className="text-2xl font-bold text-energetic-orange">20%</span>
            <span className="text-sm text-gray-600">Active Goals</span>
          </div>
          <div className="flex flex-col items-center">
            <FaChartLine size={24} className="text-energetic-orange mb-1" />
            <span className="text-2xl font-bold text-energetic-orange">7 days</span>
            <span className="text-sm text-gray-600">Weekly Streak</span>
          </div>
        </div>
      </Card>

      {/* AI Coaching */}
      <Card title="AI Coaching">
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-3 rounded-md bg-subtle-gray">
            <span className="material-icons text-energetic-orange text-2xl">schedule</span>
            <p className="text-gray-700">Your peak focus is between 9-11 AM. Schedule deep work then.</p>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-md bg-subtle-gray">
            <span className="material-icons text-energetic-orange text-2xl">track_changes</span>
            <p className="text-gray-700">You've been consistent with reading. Try adding 5 more minutes.</p>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-md bg-subtle-gray">
            <span className="material-icons text-energetic-orange text-2xl">bolt</span>
            <p className="text-gray-700">Take a 10-minute walk after lunch to boost afternoon energy.</p>
          </div>
        </div>
      </Card>
      
      {/* Quick Habits */}
      <Card title="Quick Habits">
        <ul className="space-y-2">
          {[
            { name: "Morning Meditation", streak: 7 },
            { name: "Daily Reading", streak: 5 },
            { name: "Exercise", streak: 3 },
          ].map((habit) => (
            <li key={habit.name} className="flex justify-between items-center p-2 rounded hover:bg-subtle-gray transition-colors">
              <span className="font-medium text-gray-700">{habit.name}</span>
              <div className="flex items-center space-x-1">
                <span className="text-energetic-orange">🔥</span>
                <span className="font-bold text-energetic-orange">{habit.streak}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Active Goals */}
      <Card title="Active Goals">
        <ul className="space-y-2">
          {[
            { name: "PAMPER ONLY ANWESHA!", progress: 0 },
            { name: "Learn Python Programming", progress: 35 },
            { name: "Run a Half Marathon", progress: 20 },
          ].map((goal) => (
            <li key={goal.name} className="flex justify-between items-center p-2 rounded hover:bg-subtle-gray transition-colors">
              <span className="text-gray-700">{goal.name}</span>
              <span className="font-semibold text-energetic-orange">{goal.progress}%</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}