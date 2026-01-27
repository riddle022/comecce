import { Activity, ShoppingBag } from 'lucide-react';
import React, { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';
import { usePurchasesData } from '../../hooks/usePurchasesData';
import { FilterPanel } from '../Common/FilterPanel';

export const ComprasPage: React.FC = () => {
    const { filters, updateFilters } = useGlobalFilters();
    const { data, loading, error } = usePurchasesData({
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
        empresaIds: filters.empresaIds
    });

    const handleDateRangeChange = (newDateRange: { dataInicio: string; dataFim: string }) => {
        updateFilters(newDateRange);
    };

    const handleEmpresasChange = (ids: string[]) => {
        updateFilters({ empresaIds: ids });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0 // Cleaner look for large numbers
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        // If dateString is YYYY-MM, append -01 to make it a valid full date for parsing if needed, 
        // but typically we just handle the string parts for display to be safer.
        const [year, month] = dateString.split('-');

        // Month names array
        const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const monthIndex = parseInt(month, 10) - 1;

        if (monthIndex >= 0 && monthIndex < 12) {
            return `${months[monthIndex]}/${year.slice(2)}`; // jan/26
        }
        return dateString;
    };

    // --- Process Data for "Specific" Dashboard (Revenda + Laboratório) ---
    const specificDashboardData = useMemo(() => {
        if (!data) return { chartData: [], kpis: { total: 0 } };

        // Relaxed matching strings (lowercase, partial)
        const MATCH_REVENDA = 'compra de mercadorias para revenda';
        const MATCH_LAB = 'compra laborat'; // Matches 'Laboratório' and 'Laboratorio'

        const isRevenda = (cat: string) => (cat || '').toLowerCase().includes(MATCH_REVENDA);
        const isLab = (cat: string) => (cat || '').toLowerCase().includes(MATCH_LAB);

        const filtered = data.filter(item => isRevenda(item.categoria) || isLab(item.categoria));

        // Group by Month (data_pagamento) -> YYYY-MM
        const grouped: Record<string, { date: string, revenda: number, laboratorio: number }> = {};
        let total = 0;

        filtered.forEach(item => {
            const dateKey = item.data_pagamento.substring(0, 7);
            if (!grouped[dateKey]) {
                grouped[dateKey] = { date: dateKey, revenda: 0, laboratorio: 0 };
            }
            const val = Number(item.valor_pago) || 0;

            if (isRevenda(item.categoria)) {
                grouped[dateKey].revenda += val;
            } else if (isLab(item.categoria)) {
                grouped[dateKey].laboratorio += val;
            }

            total += val;
        });

        const chartData = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
        return { chartData, kpis: { total } };
    }, [data]);

    // --- Process Data for "General" Dashboard (All OTHER Categories) ---
    const generalDashboardData = useMemo(() => {
        if (!data) return { chartData: [], categories: [], topCategories: [], fullSummary: [], kpis: { total: 0 } };

        const MATCH_REVENDA = 'compra de mercadorias para revenda';
        const MATCH_LAB = 'compra laborat';

        const isRevenda = (cat: string) => (cat || '').toLowerCase().includes(MATCH_REVENDA);
        const isLab = (cat: string) => (cat || '').toLowerCase().includes(MATCH_LAB);

        // Filter OUT the specific categories
        const filtered = data.filter(item => !isRevenda(item.categoria) && !isLab(item.categoria));

        let total = 0;
        const categoryTotals: Record<string, number> = {};

        // 1. Calculate totals per category to find Top X
        filtered.forEach(item => {
            const cat = item.categoria || 'Sem Categoria';
            const val = Number(item.valor_pago) || 0;
            categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
            total += val;
        });

        // 2. Full Summary for Table (DRE Style)
        const sortedCats = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1]);

        const fullSummary = sortedCats.map(([name, value]) => ({
            name,
            value,
            percent: total > 0 ? (value / total) * 100 : 0
        }));

        // 3. Identify Top 9 Categories for Charts
        const top9 = new Set(sortedCats.slice(0, 9).map(c => c[0]));
        const topCategoriesList = sortedCats.slice(0, 10).map(([name, value]) => ({ name, value })); // Top 10 for Ranking Chart

        // 4. Build Monthly Data grouping small cats into "Outros"
        const grouped: Record<string, Record<string, number>> = {};

        filtered.forEach(item => {
            const dateKey = item.data_pagamento.substring(0, 7);
            if (!grouped[dateKey]) {
                grouped[dateKey] = { Outros: 0 };
                top9.forEach(t => grouped[dateKey][t] = 0);
            }

            const rawCat = item.categoria || 'Sem Categoria';
            const val = Number(item.valor_pago) || 0;
            const finalCat = top9.has(rawCat) ? rawCat : 'Outros';

            grouped[dateKey][finalCat] = (grouped[dateKey][finalCat] || 0) + val;
        });

        const chartData = Object.entries(grouped).map(([dateKey, cats]) => {
            return {
                date: dateKey,
                ...cats
            };
        }).sort((a, b) => a.date.localeCompare(b.date));

        return {
            chartData,
            categories: [...Array.from(top9), 'Outros'],
            topCategories: topCategoriesList,
            fullSummary,
            kpis: { total }
        };
    }, [data]);

    const COLORS = [
        '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#9CA3AF'
    ];

    if (loading && !data) {
        return (
            <div className="space-y-6 animate-pulse">
                <FilterPanel
                    onDateRangeChange={handleDateRangeChange}
                    onEmpresasChange={handleEmpresasChange}
                    initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
                    initialEmpresas={filters.empresaIds}
                />
                <div className="h-32 bg-slate-800/50 rounded-xl"></div>
                <div className="h-80 bg-slate-800/50 rounded-xl"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <FilterPanel
                    onDateRangeChange={handleDateRangeChange}
                    onEmpresasChange={handleEmpresasChange}
                    initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
                    initialEmpresas={filters.empresaIds}
                />
                <div className="p-6 text-center bg-red-900/20 border border-red-500/30 rounded-xl text-red-200">
                    <h3 className="text-lg font-semibold">Erro ao carregar dados</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!data || filters.empresaIds.length === 0) {
        return (
            <div className="space-y-6">
                <FilterPanel
                    onDateRangeChange={handleDateRangeChange}
                    onEmpresasChange={handleEmpresasChange}
                    initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
                    initialEmpresas={filters.empresaIds}
                />
                <div className="bg-[#1E293B] border border-slate-700/50 rounded-xl p-12">
                    <div className="text-center">
                        <p className="text-gray-400">Selecione empresas para visualizar os dados</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header / Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                            Gestão de Compras & Custos
                        </h2>
                        {loading && data && <Activity className="animate-spin text-emerald-500" size={16} />}
                    </div>
                    <p className="text-gray-400 text-sm">Dashboard analítico de despesas mensais</p>
                </div>
                <div className="w-full md:w-auto">
                    <FilterPanel
                        onDateRangeChange={handleDateRangeChange}
                        onEmpresasChange={handleEmpresasChange}
                        initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
                        initialEmpresas={filters.empresaIds}
                    />
                </div>
            </div>

            {/* DASHBOARD 1: CUSTOS DIRETOS (REVENDA + LAB) */}
            <section className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-700 pb-2">
                    <ShoppingBag className="text-emerald-400" size={20} />
                    <h3 className="text-xl font-semibold text-white">Custos Diretos (Mercadorias e Laboratório)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* KPI Card */}
                    <div className="bg-[#1E293B]/80 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
                        <div>
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <ShoppingBag size={80} className="text-emerald-400" />
                            </div>
                            <h3 className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">Total de Custos</h3>
                            <p className="text-4xl font-bold text-white tracking-tight">{formatCurrency(specificDashboardData.kpis.total)}</p>
                        </div>
                        <div className="mt-6 flex flex-col space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-emerald-400 font-medium">Revenda</span>
                                <div className="h-2 flex-1 mx-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-blue-400 font-medium">Laboratório</span>
                                <div className="h-2 flex-1 mx-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comparative Bar Chart */}
                    <div className="md:col-span-2 bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-xl relative min-h-[300px]">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-semibold text-slate-300">Evolução de Custos Diretos</h4>
                            <div className="flex items-center space-x-4 text-xs font-medium">
                                <div className="flex items-center space-x-1.5">
                                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                    <span className="text-slate-400">Revenda</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                                    <span className="text-slate-400">Laboratório</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[230px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={specificDashboardData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#94A3B8"
                                        tickFormatter={formatDate}
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#94A3B8"
                                        tickFormatter={(val) => `R$${val / 1000}k`}
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#334155', opacity: 0.2 }}
                                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                        formatter={(value?: number) => [formatCurrency(value || 0), '']}
                                        labelFormatter={formatDate}
                                    />
                                    <Bar dataKey="revenda" name="Revenda" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                        <LabelList
                                            dataKey="revenda"
                                            position="top"
                                            fill="#10B981"
                                            fontSize={10}
                                            formatter={(val: any) => formatCurrency(Number(val))}
                                        />
                                    </Bar>
                                    <Bar dataKey="laboratorio" name="Laboratório" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                        <LabelList
                                            dataKey="laboratorio"
                                            position="top"
                                            fill="#3B82F6"
                                            fontSize={10}
                                            formatter={(val: any) => formatCurrency(Number(val))}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>

            {/* DASHBOARD 2: GENERAL CATEGORIES (OTHER EXPENSES) */}
            <section className="space-y-4 pt-8">
                <div className="flex items-center space-x-2 border-b border-slate-700 pb-2">
                    <Activity className="text-orange-400" size={20} />
                    <h3 className="text-xl font-semibold text-white">Despesas Gerais (Top Consumo)</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Ranking Chart (Horizontal Bars) - REPLACES PIE CHART for better readability */}
                    <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col relative z-20">
                        <h4 className="text-sm font-semibold text-slate-300 mb-4">Ranking: Onde gastamos mais?</h4>
                        <div className="flex-1 min-h-[500px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={generalDashboardData.topCategories}
                                    margin={{ top: 0, right: 60, left: 20, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={100}
                                        tick={{ fontSize: 10, fill: '#E2E8F0', fontWeight: 500 }}
                                        tickFormatter={(val) => val.length > 15 ? `${val.substring(0, 15)}...` : val}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#334155', opacity: 0.1 }}
                                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                        wrapperStyle={{ zIndex: 1000 }}
                                        formatter={(value?: number) => [formatCurrency(value || 0), 'Valor']}
                                    />
                                    <Bar dataKey="value" name="Valor" radius={[0, 4, 4, 0]} barSize={24}>
                                        {generalDashboardData.topCategories.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                        {/* Added LabelList for visibility without hover */}
                                        <LabelList
                                            dataKey="value"
                                            position="right"
                                            fill="#FFFF"
                                            fontSize={10}
                                            formatter={(value: any) => formatCurrency(Number(value))}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Stacked Bar Chart (Evolution) - Simplified Data */}
                    <div className="lg:col-span-2 flex flex-col space-y-6">
                        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-xl relative min-h-[350px]">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-sm font-semibold text-slate-300">Evolução Mensal das Despesas</h4>
                                <span className="text-xs text-slate-500 uppercase tracking-wide">Agrupado por Top 9 + Outros</span>
                            </div>

                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={generalDashboardData.chartData}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#94A3B8"
                                            tickFormatter={formatDate}
                                            tick={{ fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#94A3B8"
                                            tickFormatter={(val) => `R$${val / 1000}k`}
                                            tick={{ fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                            formatter={(value?: number, name?: string) => [formatCurrency(value || 0), name || '']}
                                            labelFormatter={formatDate}
                                            itemSorter={(item) => (item.value as number) * -1} // Sort tooltip high to low
                                        />
                                        {(generalDashboardData.categories || []).map((cat, index) => (
                                            <Bar
                                                key={cat}
                                                dataKey={cat}
                                                stackId="a"
                                                fill={cat === 'Outros' ? '#475569' : COLORS[index % COLORS.length] || '#9CA3AF'}
                                                radius={[0, 0, 0, 0]}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* DRE Summary Table - Styled like Debug Section */}
                        <div className="bg-black/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 font-mono text-xs shadow-2xl flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                                <h4 className="text-emerald-400 font-bold text-sm tracking-wider uppercase">Detalhamento Analítico</h4>
                                <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-800">
                                    {generalDashboardData.fullSummary.length} CATEGORIAS
                                </span>
                            </div>

                            <div className="overflow-y-auto max-h-[400px] flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 z-10 backdrop-blur-sm">
                                        <tr>
                                            <th className="p-3 font-semibold uppercase">Categoria</th>
                                            <th className="p-3 font-semibold text-right uppercase">Valor</th>
                                            <th className="p-3 font-semibold text-right uppercase">% Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {generalDashboardData.fullSummary.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors group text-slate-300 hover:text-white">
                                                <td className="p-2 truncate max-w-[220px]" title={item.name}>
                                                    {idx + 1}. {item.name}
                                                </td>
                                                <td className="p-2 text-right font-bold text-emerald-300/90">
                                                    {formatCurrency(item.value)}
                                                </td>
                                                <td className="p-2 text-right w-24">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[10px] text-slate-500">{item.percent.toFixed(1)}%</span>
                                                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                                style={{ width: `${Math.min(item.percent, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
