import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

const emotionColors = {
  Joy: '#f59e0b', // amber
  Sadness: '#3b82f6', // blue
  Anger: '#ef4444', // red
  Fear: '#8b5cf6', // purple
  Surprise: '#10b981', // emerald
  Neutral: '#6b7280' // gray
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-xl shadow-lg">
        <p className="text-gray-500 text-sm mb-1">{format(parseISO(data.date), 'MMM d, h:mm a')}</p>
        <p className="font-semibold text-lg" style={{ color: emotionColors[data.emotion] || '#000' }}>
          {data.emotion}
        </p>
        <p className="text-sm text-gray-600">
          Confidence: <span className="font-medium text-gray-900">{data.confidence_percentage}%</span>
        </p>
        <p className="text-xs text-gray-400 mt-1 capitalize">
          Input: {data.entry_type}
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

  // Map to format suitable for charting
  const chartData = data.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM d'),
    // We can map emotions to Y-axis values for scattered display, 
    // or plot Confidence % if we're tracing a specific emotion over time.
    // Here we'll just plot confidence percentage of whatever emotion was detected
    value: item.confidence_percentage
  }));

  return (
    <div className="h-80 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="formattedDate" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            domain={[0, 100]} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12 }} 
            dx={-10}
            label={{ value: 'Confidence %', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#529652" 
            strokeWidth={3}
            dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 8, strokeWidth: 0, fill: '#529652' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
