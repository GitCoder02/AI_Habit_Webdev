// frontend/src/components/IntelligentSuggestions.js
import React, { useState } from "react";
import { 
  FaLightbulb, 
  FaRunning, 
  FaBullseye, 
  FaCalendarAlt, 
  FaHeart,
  FaChevronDown,
  FaChevronUp,
  FaSync
} from "react-icons/fa";

// Priority Badge Component - Teal Theme
const PriorityBadge = ({ priority }) => {
  const styles = {
    high: "bg-teal-100 text-teal-800 border border-teal-300",
    medium: "bg-cyan-100 text-cyan-700 border border-cyan-300",
    low: "bg-gray-100 text-gray-600 border border-gray-300",
  };

  const labels = {
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[priority] || styles.medium}`}>
      {labels[priority] || "Medium Priority"}
    </span>
  );
};

// Type Icon Component - Teal Colors
const TypeIcon = ({ type }) => {
  const iconStyles = {
    habit: { icon: FaRunning, color: "bg-teal-50 text-teal-600" },
    goal: { icon: FaBullseye, color: "bg-cyan-50 text-cyan-600" },
    schedule: { icon: FaCalendarAlt, color: "bg-sky-50 text-sky-600" },
    motivation: { icon: FaHeart, color: "bg-emerald-50 text-emerald-600" },
  };

  const { icon: Icon, color } = iconStyles[type] || iconStyles.habit;

  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

// Individual Suggestion Card - Teal Theme
const SuggestionCard = ({ suggestion }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-teal-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <TypeIcon type={suggestion.type} />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {suggestion.title}
            </h3>
            <PriorityBadge priority={suggestion.priority} />
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-3 leading-relaxed">
        {suggestion.description}
      </p>

      {/* Rationale - Teal Box */}
      <div className="bg-teal-50 border-l-4 border-teal-500 p-3 mb-3 rounded-r">
        <p className="text-sm text-teal-900">
          <span className="font-semibold">Why this matters:</span> {suggestion.rationale}
        </p>
      </div>

      {/* Expandable Action Steps */}
      {suggestion.actionableSteps && suggestion.actionableSteps.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left font-semibold text-gray-700 hover:text-teal-600 transition-colors"
          >
            <span>Action Steps</span>
            {expanded ? <FaChevronUp className="text-teal-500" /> : <FaChevronDown className="text-teal-500" />}
          </button>

          {expanded && (
            <ol className="mt-3 space-y-2 list-decimal list-inside">
              {suggestion.actionableSteps.map((step, idx) => (
                <li key={idx} className="text-sm text-gray-700 pl-2">
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Impact - Cyan Box */}
      {suggestion.estimatedImpact && (
        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-3 rounded-r">
          <p className="text-sm text-cyan-900">
            <span className="font-semibold">Expected Impact:</span> {suggestion.estimatedImpact}
          </p>
        </div>
      )}

      {/* Footer Metadata */}
      <div className="mt-4 pt-3 border-t border-teal-100 flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{suggestion.type} suggestion</span>
        {suggestion.generatedAt && (
          <span>
            {new Date(suggestion.generatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
};

// Main Component - Teal Theme
export default function IntelligentSuggestions({ suggestions, loading, onRefresh }) {
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Filter suggestions
  const filteredSuggestions = suggestions.filter((s) => {
    const typeMatch = filter === "all" || s.type === filter;
    const priorityMatch = priorityFilter === "all" || s.priority === priorityFilter;
    return typeMatch && priorityMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center p-12 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg">
        <FaLightbulb className="w-16 h-16 text-teal-400 mx-auto mb-4" />
        <p className="text-gray-700 text-lg font-medium">No suggestions available at the moment.</p>
        <p className="text-gray-500 text-sm mt-2">
          Keep tracking your habits and goals to receive personalized insights!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters and Refresh */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaLightbulb className="text-amber-500" />
            AI-Powered Suggestions
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Personalized insights based on your habits, goals, and schedule
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all shadow-sm hover:shadow-md"
            style={{ backgroundColor: '#31B7BA' }}
          >
            <FaSync className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      {/* Filters - Teal Style */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">Type:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-teal-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:outline-none transition-all"
          >
            <option value="all">All Types</option>
            <option value="habit">Habits</option>
            <option value="goal">Goals</option>
            <option value="schedule">Schedule</option>
            <option value="motivation">Motivation</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">Priority:</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-teal-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:outline-none transition-all"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Result Count */}
        <div className="flex items-center ml-auto text-sm text-gray-600 font-medium">
          Showing {filteredSuggestions.length} of {suggestions.length} suggestions
        </div>
      </div>

      {/* Suggestions Grid */}
      {filteredSuggestions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
          <p className="text-gray-600">No suggestions match your filters.</p>
        </div>
      )}
    </div>
  );
}