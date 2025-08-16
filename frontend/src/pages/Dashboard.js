// frontend/src/pages/Dashboard.js
import Card from "../components/Card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useAuth } from "../context/AuthContext";

const trendData = [
  { day: "Mon", progress: 3 },
  { day: "Tue", progress: 4 },
  { day: "Wed", progress: 2 },
  { day: "Thu", progress: 5 },
  { day: "Fri", progress: 4 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const userName = user?.name || "User";

  return (
    <div className="bg-gray-100 min-h-screen p-6 space-y-6">
      {/* Welcome */}
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
        Good morning, {userName}! 👋
      </h1>
      <p className="text-gray-500 mb-6">Ready to make today productive and meaningful?</p>

      {/* Daily Summary */}
      <Card className="bg-green-50 border-green-100">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center text-green-800 text-xl">🤖</div>
          <p className="text-gray-700 font-medium">
            You nailed your deep work hours today but skipped exercise. Keep going! 💪
          </p>
        </div>
      </Card>

      {/* Progress Overview */}
      <Card>
        <div className="flex justify-between items-center space-x-6">
          {[
            { label: "Tasks Completed", value: 75, color: "from-green-400 to-green-600" },
            { label: "Habits Consistency", value: 60, color: "from-blue-400 to-blue-600" },
            { label: "Weekly Goal Progress", value: 40, color: "from-purple-400 to-purple-600" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-gray-200"></div>
                <div
                  className={`absolute inset-0 rounded-full bg-gradient-to-r ${item.color} flex items-center justify-center text-white font-bold`}
                  style={{ clipPath: `circle(${item.value}% at 50% 50%)` }}
                >
                  {item.value}%
                </div>
              </div>
              <span className="mt-2 text-sm text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Productivity Trend */}
      <Card>
        <div className="w-full h-64">
          <ResponsiveContainer>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="progress" stroke="#10B981" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <p className="text-gray-700">
          You're most focused at 10am — try scheduling coding sessions then. Also, remember to take short breaks every 90 minutes.
        </p>
      </Card>

      {/* Quick Habits */}
      <Card title="Your Habits">
        <ul className="space-y-2">
          {[
            { name: "Drink Water 💧", done: true },
            { name: "Exercise 🏋️", done: false },
            { name: "Read 📚", done: true },
          ].map((habit) => (
            <li key={habit.name} className="flex justify-between items-center p-2 rounded hover:shadow-md transition-shadow">
              <span>{habit.name}</span>
              <span className={`${habit.done ? "text-green-600" : "text-gray-400"} font-bold`}>
                {habit.done ? "✔️" : "❌"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}