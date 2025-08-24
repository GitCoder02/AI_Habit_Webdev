import React from "react";

export default function SuggestionCard({ suggestion, onAccept, onDismiss }) {
  const { title, explanation, score = 0.6, tags = [] } = suggestion;

  // Normalize score (backend gives 0.5–1.0)
  const scorePercent = Math.max(0, Math.min(100, Math.round((score || 0) * 100)));

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm flex flex-col space-y-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="pr-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{explanation}</p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                  aria-label={`tag ${t}`}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Confidence Score with progress bar */}
        <div className="w-28 ml-4 flex-shrink-0">
          <div className="text-xs text-gray-500 mb-1">Confidence</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${scorePercent}%`, backgroundColor: "rgb(5,150,105)" }} // fallback mint-green
              aria-valuenow={scorePercent}
              aria-valuemin="0"
              aria-valuemax="100"
              role="progressbar"
            />
          </div>
          <div className="text-xs font-medium text-gray-700 mt-1 text-right">
            {scorePercent}%
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={() => onDismiss && onDismiss(suggestion)}
          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800"
          aria-label="Dismiss suggestion"
          type="button"
        >
          Dismiss
        </button>

        <button
          onClick={() => onAccept && onAccept(suggestion)}
          className="px-3 py-1 rounded bg-mint-green hover:bg-mint-green-600 text-white"
          aria-label="Accept suggestion"
          type="button"
        >
          Accept
        </button>

        <button
          onClick={() => {
            // show minimal details about the suggestion
            const detail = suggestion.meta || suggestion.payload || {};
            alert(JSON.stringify(detail, null, 2));
          }}
          className="ml-2 px-3 py-1 rounded border border-gray-200 bg-white text-sm text-gray-600"
          aria-label="Show suggestion details"
          type="button"
        >
          Details
        </button>
      </div>
    </div>
  );
}