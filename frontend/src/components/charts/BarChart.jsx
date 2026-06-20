import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function BarChart({ 
  data = [], 
  bars = [], 
  xKey = 'name', 
  height = 300, 
  stacked = false,
  horizontal = false,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
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
        <RechartsBar 
          data={data} 
          layout={horizontal ? 'vertical' : 'horizontal'}
          barCategoryGap="20%"
          barGap={4}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />}
          
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis type="category" dataKey={xKey} tick={{ fontSize: 12 }} stroke="#9ca3af" width={80} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            </>
          )}
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />}
          
          {bars.map((bar, i) => (
            <Bar
              key={bar.key || `bar-${i}`}
              dataKey={bar.key || bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || defaultColors[i % defaultColors.length]}
              stackId={stacked ? 'stack' : undefined}
              radius={bar.radius || [4, 4, 0, 0]}
              maxBarSize={bar.maxBarSize || 50}
            />
          ))}
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  )
}

export default BarChart