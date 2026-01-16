import React, { useState } from 'react';
import {
    Package,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Receipt
} from 'lucide-react';
import { FilterPanel } from '../Common/FilterPanel';
import { MetricCard } from './MetricCard';
import { useProdutosData } from '../../hooks/useProdutosData';
import { useProdutosVendedor } from '../../hooks/useProdutosVendedor';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';

export const ProdutosPage: React.FC = () => {
    const { filters: globalFilters, updateFilters } = useGlobalFilters();
    const [selectedVendedor, setSelectedVendedor] = useState<string>('');

    // 1. Main Dashboard Data (Fast Load)
    const { data, loading, error } = useProdutosData({
        dataInicio: globalFilters.dataInicio,
        dataFim: globalFilters.dataFim,
        empresaIds: globalFilters.empresaIds
    });

    // 2. Detailed Table Data (Server-Side Filtered)
    const {
        vendedoresList,
        tableData,
        loadingTable,
        loadingList
    } = useProdutosVendedor({
        dataInicio: globalFilters.dataInicio,
        dataFim: globalFilters.dataFim,
        empresaIds: globalFilters.empresaIds,
        vendedor: selectedVendedor
    });

    const handleDateRangeChange = (newDateRange: { dataInicio: string; dataFim: string }) => {
        updateFilters(newDateRange);
    };

    const handleEmpresasChange = (ids: string[]) => {
        updateFilters({ empresaIds: ids });
    };

    return (
        <div className="space-y-6">
            <div className="relative z-50">
                <FilterPanel
                    onDateRangeChange={handleDateRangeChange}
                    onEmpresasChange={handleEmpresasChange}
                    initialDateRange={{ dataInicio: globalFilters.dataInicio, dataFim: globalFilters.dataFim }}
                    initialEmpresas={globalFilters.empresaIds}
                />
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-4 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-400">Carregando dados de produtos...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <div>
                            <p className="text-red-400 font-medium">Erro ao carregar dados</p>
                            <p className="text-red-300 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {!loading && !error && data && (
                <>
                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Produtos Vendidos"
                            value={new Intl.NumberFormat('pt-BR').format(data.kpis.produtos_vendidos)}
                            icon={Package}
                            color="blue"
                        />
                        <MetricCard
                            title="Custo Produtos (CMV)"
                            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.kpis.custo_total_cmv)}
                            icon={Receipt}
                            color="orange"
                        />
                        <MetricCard
                            title="Margem Bruta (Valor)"
                            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.kpis.margem_bruta_valor)}
                            icon={DollarSign}
                            color="green"
                        />
                        <MetricCard
                            title="Margem Bruta (%)"
                            value={`${data.kpis.margem_bruta_percentual}%`}
                            icon={TrendingUp}
                            color="purple"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Performance por Produto Table */}
                        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Performance por Produto</h3>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-200 uppercase bg-[#0F172A] sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Produto</th>
                                            <th className="px-4 py-3 text-right">Faturamento</th>
                                            <th className="px-4 py-3 text-right">Custo CMV</th>
                                            <th className="px-4 py-3 text-right">Margem</th>
                                            <th className="px-4 py-3 text-right rounded-tr-lg">Margem %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.performance_produtos.map((item, index) => (
                                            <tr key={index} className="border-b border-[#0F4C5C]/10 hover:bg-[#0F4C5C]/5">
                                                <td className="px-4 py-3 font-medium text-white">{item.produto}</td>
                                                <td className="px-4 py-3 text-right text-emerald-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.faturamento)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-orange-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.custo)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-cyan-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.lucro)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-white">
                                                    {item.margem_percentual}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Performance por Grupo Table */}
                        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Performance por Grupo</h3>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-200 uppercase bg-[#0F172A] sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Grupo</th>
                                            <th className="px-4 py-3 text-right">Faturamento</th>
                                            <th className="px-4 py-3 text-right">Ticket Médio</th>
                                            <th className="px-4 py-3 text-right">Margem</th>
                                            <th className="px-4 py-3 text-right rounded-tr-lg">Margem %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.performance_grupos.map((item, index) => (
                                            <tr key={index} className="border-b border-[#0F4C5C]/10 hover:bg-[#0F4C5C]/5">
                                                <td className="px-4 py-3 font-medium text-white">{item.grupo}</td>
                                                <td className="px-4 py-3 text-right text-emerald-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.faturamento)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-blue-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.ticket_medio || 0)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-cyan-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.lucro)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-white">
                                                    {item.margem_percentual}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Produtos por Vendedor Table (Server-Side) */}
                    <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6 relative">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                            <h3 className="text-lg font-semibold text-white">
                                Produtos por Vendedor
                                {selectedVendedor && <span className="text-emerald-400 ml-2">: {selectedVendedor}</span>}
                            </h3>
                            <select
                                value={selectedVendedor}
                                onChange={(e) => setSelectedVendedor(e.target.value)}
                                disabled={loadingList}
                                className="bg-[#0F172A] border border-[#0F4C5C]/20 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#0F4C5C] disabled:opacity-50"
                            >
                                <option value="" disabled>Selecionar Vendedor</option>
                                {vendedoresList.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar relative min-h-[100px]">
                            {loadingTable ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#1E293B]/80 z-10">
                                    <div className="w-8 h-8 border-2 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : !selectedVendedor ? (
                                <div className="flex items-center justify-center py-12 text-gray-400">
                                    Selecione um vendedor para visualizar os dados
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-200 uppercase bg-[#0F172A] sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Produto</th>
                                            <th className="px-4 py-3 text-right">Qtd</th>
                                            <th className="px-4 py-3 text-right rounded-tr-lg">Faturamento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableData.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">Nenhum dado encontrado</td>
                                            </tr>
                                        ) : (
                                            tableData.map((item, index) => (
                                                <tr key={index} className="border-b border-[#0F4C5C]/10 hover:bg-[#0F4C5C]/5">
                                                    <td className="px-4 py-3 font-medium text-white">{item.produto}</td>
                                                    <td className="px-4 py-3 text-right">{item.quantidade}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-400">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.faturamento)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
