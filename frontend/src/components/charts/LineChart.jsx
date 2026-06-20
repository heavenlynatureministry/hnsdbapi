import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function LineChart({ 
  data = [], 
  lines = [], 
  xKey = 'name', 
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  showDots = true,
  smooth = true,
  className = '' 
}) {
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLine data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />}
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />}
          {lines.map((line, i) => (
            <Line
              key={line.key || `line-${i}`}
              type={smooth ? 'monotone' : 'linear'}
              dataKey={line.key || line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || defaultColors[i % defaultColors.length]}
              strokeWidth={line.strokeWidth || 2}
              dot={showDots ? (line.dot || { r: 4 }) : false}
              activeDot={line.activeDot || { r: 6 }}
            />
          ))}
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  )
}

export default LineChart