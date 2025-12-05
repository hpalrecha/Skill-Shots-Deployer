import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProgressChartProps {
  completed: number;
  pending: number;
}

const COLORS = ['hsl(var(--chart-2))', 'hsl(var(--chart-4))'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-2 border border-border rounded-md shadow-sm">
        <p className="font-semibold text-foreground">{`${payload[0].name}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function ProgressChart({ completed, pending }: ProgressChartProps) {
  const data = [
    { name: 'Completed', value: completed },
    { name: 'Pending', value: pending },
  ];

  const total = completed + pending;

  if (total === 0) {
    return <p className="text-center text-muted-foreground py-8">No topics available.</p>;
  }

  return (
    <div style={{ width: '100%', height: 250 }} data-testid="chart-progress">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-3xl font-bold fill-foreground">
            {`${Math.round((completed / total) * 100)}%`}
          </text>
          <text x="50%" y="62%" textAnchor="middle" dominantBaseline="central" className="text-sm fill-muted-foreground">
            Done
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
