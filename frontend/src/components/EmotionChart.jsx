import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

// IST formatter — used everywhere dates are displayed
export const formatIST = (dateStr) =>
  new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

// Maps emotion label → numeric Y axis position (same scale as PatientDashboard)
const EMOTION_TO_VALUE = {
  Joy:     4,
  Neutral: 3,
  Fear:    2,
  Sadness: 1,
  Anger:   0
};

const VALUE_TO_EMOTION = {
  4: 'Joy',
  3: 'Neutral',
  2: 'Fear',
  1: 'Sadness',
  0: 'Anger'
};

const EMOTION_COLORS = {
  Joy:     '#f59e0b',
  Sadness: '#3b82f6',
  Anger:   '#ef4444',
  Fear:    '#8b5cf6',
  Neutral: '#6b7280'
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const emotion = VALUE_TO_EMOTION[d.emotionValue] || d.emotion || 'Unknown';
    return (
      <div className="bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-xl shadow-lg">
        <p className="text-gray-500 text-sm mb-1">{formatIST(d.date)}</p>
        <p className="font-semibold text-lg" style={{ color: EMOTION_COLORS[emotion] || '#000' }}>
          {emotion}
        </p>
        <p className="text-sm text-gray-600">
          Confidence: <span className="font-medium text-gray-900">{d.confidence_percentage}%</span>
        </p>
        <p className="text-xs text-gray-400 mt-1 capitalize">
          Input: {d.entry_type}
        </p>
      </div>
    );
  }
  return null;
};

export default function EmotionChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
        No emotion data available yet.
      </div>
    );
  }

  // Map each data point to a numeric Y value so emotion labels show on Y axis
  const chartData = data.map(item => ({
    ...item,
    emotionValue: EMOTION_TO_VALUE[item.emotion] !== undefined
      ? EMOTION_TO_VALUE[item.emotion]
      : 3 // default to Neutral
  }));

  return (
    <div className="h-80 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            dy={10}
            tickFormatter={(val) => {
              try {
                const date = new Date(val);
                if (isNaN(date)) return val;
                return date.toLocaleDateString('en-US', {
                  timeZone: 'Asia/Kolkata',
                  month: 'short',
                  day: 'numeric'
                });
              } catch {
                return val;
              }
            }}
          />
          {/* FIX: Y axis now shows emotion labels instead of confidence % */}
          <YAxis
            domain={[0, 4]}
            ticks={[0, 1, 2, 3, 4]}
            tickFormatter={(val) => VALUE_TO_EMOTION[val] || ''}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="emotionValue"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={({ cx, cy, payload }) => {
              const emotion = VALUE_TO_EMOTION[payload.emotionValue] || 'Neutral';
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={EMOTION_COLORS[emotion] || '#8b5cf6'}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 8, strokeWidth: 0, fill: '#6d28d9' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}