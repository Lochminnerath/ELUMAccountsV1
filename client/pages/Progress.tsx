import Layout from "@/components/Layout";
import { formatDisplayDate, getLastNDaysLogs } from "@/lib/tracker";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Progress() {
  const weekLogs = getLastNDaysLogs(7);

  const chartData = weekLogs.map((log) => {
    const caloriesIn = log.foods.reduce((acc, food) => acc + food.calories, 0);
    const caloriesOut = log.exercises.reduce((acc, ex) => acc + ex.caloriesBurned, 0);
    const sleepTotal = log.sleep.hours + log.sleep.minutes / 60;
    const mentalAverage =
      (log.questionnaire.mood + log.questionnaire.stress + log.questionnaire.energy + log.questionnaire.focus) /
      4;

    return {
      day: formatDisplayDate(log.date),
      caloriesIn,
      caloriesOut,
      net: caloriesIn - caloriesOut,
      sleep: Number(sleepTotal.toFixed(1)),
      mood: Number(mentalAverage.toFixed(1)),
      questionnaireDone: log.questionnaire.completed ? "Yes" : "No",
    };
  });

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">Progress: Week at a Glance</h1>
        <p className="mt-2 mb-6 text-muted-foreground">
          Compare daily nutrition, activity, sleep, and mental check-ins over the last 7 days.
        </p>

        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Calories In vs Out</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="caloriesIn" fill="#f97316" name="Calories In" />
                <Bar dataKey="caloriesOut" fill="#16a34a" name="Calories Burned" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Net Calories & Sleep Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={3} name="Net Calories" />
                <Line type="monotone" dataKey="sleep" stroke="#7c3aed" strokeWidth={3} name="Sleep Hours" />
                <Line type="monotone" dataKey="mood" stroke="#dc2626" strokeWidth={2} name="Mental Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Daily Record Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2">Day</th>
                  <th className="py-2">Calories In</th>
                  <th className="py-2">Burned</th>
                  <th className="py-2">Net</th>
                  <th className="py-2">Sleep</th>
                  <th className="py-2">Mental Avg</th>
                  <th className="py-2">Questionnaire</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.day} className="border-b border-border/60">
                    <td className="py-2">{row.day}</td>
                    <td className="py-2">{row.caloriesIn}</td>
                    <td className="py-2">{row.caloriesOut}</td>
                    <td className="py-2">{row.net}</td>
                    <td className="py-2">{row.sleep}h</td>
                    <td className="py-2">{row.mood}/5</td>
                    <td className="py-2">{row.questionnaireDone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
