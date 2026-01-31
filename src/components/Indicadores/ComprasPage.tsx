import { Activity, ShoppingBag } from 'lucide-react';
import React, { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
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

    // --- Process Data for "Custos Diretos" (Revenda + Laboratório) ---
    const specificDashboardData = useMemo(() => {
        if (!data) return { chartData: [], supplierData: [], kpis: { total: 0 } };

        // Relaxed matching strings (lowercase, partial)
        const MATCH_REVENDA = 'compra de mercadorias para revenda';
        const MATCH_LAB = 'compra laborat'; // Matches 'Laboratório' and 'Laboratorio'

        const isRevenda = (cat: string) => (cat || '').toLowerCase().includes(MATCH_REVENDA);
        const isLab = (cat: string) => (cat || '').toLowerCase().includes(MATCH_LAB);

        const filtered = data.filter(item => isRevenda(item.categoria) || isLab(item.categoria));

        // Group by Month (data_pagamento) -> YYYY-MM
        const grouped: Record<string, { date: string, revenda: number, laboratorio: number }> = {};

        // Group by Supplier
        const supplierMap: Record<string, { name: string, value: number, revenda: number, laboratorio: number, count: number }> = {};

        let total = 0;

        filtered.forEach(item => {
            const val = Number(item.valor_pago) || 0;
            total += val;

            // 1. Time Grouping
            const dateKey = item.data_pagamento.substring(0, 7);
            if (!grouped[dateKey]) {
                grouped[dateKey] = { date: dateKey, revenda: 0, laboratorio: 0 };
            }

            // 2. Supplier Grouping
            // fallback to 'NÃO IDENTIFICADO' if missing
            const rawName = item.fornecedor || 'NÃO IDENTIFICADO';
            const supplierName = rawName.toUpperCase().trim();

            if (!supplierMap[supplierName]) {
                supplierMap[supplierName] = { name: supplierName, value: 0, revenda: 0, laboratorio: 0, count: 0 };
            }

            supplierMap[supplierName].value += val;
            supplierMap[supplierName].count += 1;

            if (isRevenda(item.categoria)) {
                grouped[dateKey].revenda += val;
                supplierMap[supplierName].revenda += val;
            } else if (isLab(item.categoria)) {
                grouped[dateKey].laboratorio += val;
                supplierMap[supplierName].laboratorio += val;
            }
        });

        const chartData = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));

        // Sort suppliers by Total Value Descending
        const supplierData = Object.values(supplierMap).sort((a, b) => b.value - a.value);

        return { chartData, supplierData, kpis: { total } };
    }, [data]);





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

                {/* SUPPLIER ANALYSIS SECTION */}
                <div className="pt-6">
                    <div className="bg-[#1E293B] border border-slate-700/50 rounded-xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-semibold text-slate-200">Análise por Fornecedor (Razão Social)</h4>
                            <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
                                {specificDashboardData.supplierData.length} Fornecedores Encontrados
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700">
                                    <tr>
                                        <th className="p-4 font-semibold">Fornecedor / Razão Social</th>
                                        <th className="p-4 font-semibold text-right">Revenda</th>
                                        <th className="p-4 font-semibold text-right">Laboratório</th>
                                        <th className="p-4 font-semibold text-right">Total</th>
                                        <th className="p-4 font-semibold text-right text-xs">% Repr.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {specificDashboardData.supplierData.map((supplier, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 font-medium text-slate-300">
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-sm" title={supplier.name}>{supplier.name}</span>
                                                    <span className="text-[10px] text-slate-500">{supplier.count} registros</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right text-emerald-400/80">
                                                {supplier.revenda > 0 ? formatCurrency(supplier.revenda) : '-'}
                                            </td>
                                            <td className="p-4 text-right text-blue-400/80">
                                                {supplier.laboratorio > 0 ? formatCurrency(supplier.laboratorio) : '-'}
                                            </td>
                                            <td className="p-4 text-right font-bold text-white">
                                                {formatCurrency(supplier.value)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs text-slate-400">
                                                        {specificDashboardData.kpis.total > 0
                                                            ? ((supplier.value / specificDashboardData.kpis.total) * 100).toFixed(1)
                                                            : 0}%
                                                    </span>
                                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500"
                                                            style={{
                                                                width: `${specificDashboardData.kpis.total > 0
                                                                    ? (supplier.value / specificDashboardData.kpis.total) * 100
                                                                    : 0}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {specificDashboardData.supplierData.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                                Nenhum fornecedor encontrado para os filtros selecionados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
