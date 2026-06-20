import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function PieChart({ 
  data = [], 
  dataKey = 'value', 
  nameKey = 'name', 
  height = 300, 
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
  innerRadius = 0,
  outerRadius = 80,
  showLegend = true,
  showTooltip = true,
  showLabels = true,
  donut = false,
  className = '' 
}) {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const data = payload[0]
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-sm text-gray-900 dark:text-white">{data.name}</p>
        <p className="text-xs text-gray-500" style={{ color: data.payload.fill }}>
          {data.value} ({((data.value / (data.payload.total || 1)) * 100).toFixed(1)}%)
        </p>
      </div>
    )
  }

  const renderLabel = ({ name, value, percent }) => {
    if (!showLabels) return null
    return `${name}: ${(percent * 100).toFixed(0)}%`
  }

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0)
  const enrichedData = data.map(item => ({ ...item, total }))

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPie>
          <Pie
            data={enrichedData}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={donut ? (innerRadius || 60) : innerRadius}
            outerRadius={outerRadius}
            label={renderLabel}
            labelLine={showLabels}
            paddingAngle={2}
          >
            {enrichedData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />}
        </RechartsPie>
      </ResponsiveContainer>
    </div>
  )
}

export default PieChart