import { Activity, ShoppingBag } from 'lucide-react';
import React, { useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    LabelList,
    Legend,
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

    const formatCompact = (value: number) => {
        if (!value || value === 0) return '';
        if (value >= 1000) {
            const k = value / 1000;
            return k % 1 === 0 ? `${k.toFixed(0)}k` : `${k.toFixed(1).replace('.', ',')}k`;
        }
        return value.toFixed(0);
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

        const isRevenda = (cat: string) => {
            const lc = (cat || '').toLowerCase();
            return lc.startsWith('2.002') && lc.includes('compra') && !lc.includes('laborat');
        };
        const isLab = (cat: string) => {
            const lc = (cat || '').toLowerCase();
            return lc.startsWith('2.002') && lc.includes('laborat');
        };

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

                    {/* Comparative Area Chart with inline labels */}
                    <div className="md:col-span-2 bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-xl relative">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-slate-300">Evolução de Custos Diretos</h4>
                        </div>

                        <div className="h-[380px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={specificDashboardData.chartData} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="gradRevenda" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="gradLab" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748B"
                                        tickFormatter={formatDate}
                                        tick={{ fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#64748B"
                                        tickFormatter={(val) => {
                                            if (val >= 1000) return `R$${(val / 1000).toFixed(0)}k`;
                                            return `R$${val}`;
                                        }}
                                        tick={{ fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={60}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        contentStyle={{
                                            backgroundColor: '#0F172A',
                                            borderColor: '#334155',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                                        }}
                                        labelStyle={{ color: '#94A3B8', fontSize: 12, marginBottom: 8, fontWeight: 600 }}
                                        itemStyle={{ color: '#E2E8F0', fontSize: 13, padding: '2px 0' }}
                                        formatter={(value?: number, name?: string) => {
                                            const label = name === 'revenda' ? 'Revenda' : 'Laboratório';
                                            return [formatCurrency(value || 0), label];
                                        }}
                                        labelFormatter={formatDate}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: 12, color: '#94A3B8', paddingBottom: 12 }}
                                        formatter={(value: string) => value === 'revenda' ? 'Revenda' : 'Laboratório'}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenda"
                                        name="revenda"
                                        stroke="#10B981"
                                        strokeWidth={2.5}
                                        fill="url(#gradRevenda)"
                                        dot={{ r: 4, fill: '#10B981', stroke: '#0F172A', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                                    >
                                        <LabelList
                                            dataKey="revenda"
                                            position="top"
                                            offset={10}
                                            fill="#6EE7B7"
                                            fontSize={11}
                                            fontWeight={700}
                                            formatter={(val: any) => formatCompact(Number(val))}
                                        />
                                    </Area>
                                    <Area
                                        type="monotone"
                                        dataKey="laboratorio"
                                        name="laboratorio"
                                        stroke="#3B82F6"
                                        strokeWidth={2.5}
                                        fill="url(#gradLab)"
                                        dot={{ r: 4, fill: '#3B82F6', stroke: '#0F172A', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                                    >
                                        <LabelList
                                            dataKey="laboratorio"
                                            position="bottom"
                                            offset={10}
                                            fill="#93C5FD"
                                            fontSize={11}
                                            fontWeight={700}
                                            formatter={(val: any) => formatCompact(Number(val))}
                                        />
                                    </Area>
                                </AreaChart>
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
