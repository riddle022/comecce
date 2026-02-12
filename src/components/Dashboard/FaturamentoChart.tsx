import React, { useMemo, useState } from "react";
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    LabelList,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { TendenciaItem } from "../../hooks/useDashboardData";

interface FaturamentoChartProps {
  data: TendenciaItem[];
}

type FilterType = "day" | "week" | "month";

export const FaturamentoChart: React.FC<FaturamentoChartProps> = ({ data }) => {
  const [filter, setFilter] = useState<FilterType>("month");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let result: { data: string; valor_liquido: number }[] = [];

    if (filter === "day") {
      result = data.map((d) => ({
        data: d.data,
        valor_liquido: d.valor_liquido,
      }));
    } else if (filter === "week") {
      const daysOfWeek = [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
      ];
      const weekData = daysOfWeek.map((day) => ({
        data: day,
        valor_liquido: 0,
      }));

      data.forEach((item) => {
        const [year, month, day] = item.data.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        const dayIndex = date.getDay();
        weekData[dayIndex].valor_liquido += item.valor_liquido;
      });

      result = weekData;
    } else if (filter === "month") {
      const monthMap = new Map<string, number>();

      data.forEach((item) => {
        const [year, month] = item.data.split("-");
        const key = `${year}-${month}`;
        const current = monthMap.get(key) || 0;
        monthMap.set(key, current + item.valor_liquido);
      });

      result = Array.from(monthMap.entries()).map(([key, value]) => ({
        data: key,
        valor_liquido: value,
      }));
    } else {
      result = data;
    }

    return result.map((item, index) => {
      let variacao = 0;
      if (index > 0) {
        const anterior = result[index - 1].valor_liquido;
        if (anterior !== 0) {
          variacao = ((item.valor_liquido - anterior) / anterior) * 100;
        }
      }
      return { ...item, variacao };
    });
  }, [data, filter]);

  const formatDate = (dateStr: string) => {
    if (filter === "week") return dateStr;
    if (filter === "month") {
      const [year, month] = dateStr.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      const monthName = date.toLocaleDateString("pt-BR", { month: "long" });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  // Custom label for the Bar (Value)
  const CustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#94A3B8"
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
      >
        {formatCurrency(value)}
      </text>
    );
  };

  return (
    <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">
          Faturamento no Período
        </h3>
        <div className="flex items-center bg-[#0F172A] rounded-lg p-1 border border-[#334155]">
          {(["day", "week", "month"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
                ${
                  filter === f
                    ? "bg-[#38BDF8]/10 text-[#38BDF8] shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }
              `}
            >
              {f === "day" ? "Dia" : f === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart
          data={processedData}
          barSize={filter === "day" ? undefined : 32} // Auto width for days, fixed for others
          margin={{ top: 35, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="faturamentoGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#0F766E" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
          />
          <XAxis
            dataKey="data"
            stroke="#64748B"
            tickFormatter={formatDate}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={30} // Evita sobreposição de datas no eixo X
          />
          <YAxis
            stroke="#64748B"
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "#334155", opacity: 0.2 }}
            contentStyle={{
              backgroundColor: "#0F172A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
            formatter={(value: any, name: string) => {
              if (name === "variacao")
                return [`${value.toFixed(1)}%`, "Crescimento"];
              return [formatCurrency(value), "Faturamento"];
            }}
            labelFormatter={formatDate}
            labelStyle={{ color: "#E2E8F0", marginBottom: "8px" }}
          />

          <Bar
            dataKey="valor_liquido"
            fill="url(#faturamentoGradient)"
            radius={[4, 4, 0, 0]}
            // Lógica de labels: Só mostra se NÃO for 'day'.
            // No modo 'day', fica muito poluído mostrar valores em todas as barras.
            label={filter !== "day" ? <CustomBarLabel /> : undefined}
          />

          {/* Linha de Evolução Percentual */}
          <Line
            type="monotone"
            dataKey="valor_liquido"
            stroke="#fbbf24" /* Amber-400 */
            strokeWidth={2}
            strokeDasharray="5 5"
            // Pontos menores no modo dia para reduzir ruído
            dot={{
              r: filter === "day" ? 2 : 4,
              fill: "#fbbf24",
              strokeWidth: filter === "day" ? 1 : 2,
              stroke: "#1E293B",
            }}
            activeDot={{ r: 6, fill: "#fbbf24" }}
          >
            <LabelList
              dataKey="variacao"
              position="top"
              offset={22}
              content={(props: any) => {
                // No modo 'day', NÃO mostramos os labels de porcentagem para evitar poluição visual extrema.
                // A informação estará disponível no Tooltip.
                if (filter === "day") return null;

                const { x, y, value, index } = props;
                if (index === 0 || value === undefined || value === null)
                  return null;

                const isPositive = value >= 0;
                const color = isPositive ? "#4ade80" : "#f87171";

                return (
                  <text
                    x={x}
                    y={y - 22}
                    fill={color}
                    fontSize={11}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {`${isPositive ? "+" : ""}${value.toFixed(1)}%`}
                  </text>
                );
              }}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
