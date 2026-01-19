import React, { useState } from 'react';
import {
    Package,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Receipt,
    Search,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { FilterPanel } from '../Common/FilterPanel';
import { MetricCard } from './MetricCard';
import { useProdutosData } from '../../hooks/useProdutosData';
import { useProdutosVendedor } from '../../hooks/useProdutosVendedor';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';

export const ProdutosPage: React.FC = () => {
    const { filters: globalFilters, updateFilters } = useGlobalFilters();
    const [selectedVendedor, setSelectedVendedor] = useState<string>('');

    // Filters and Sorting State
    const [searchProduto, setSearchProduto] = useState('');
    const [searchGrupo, setSearchGrupo] = useState('');
    const [sortFieldProduto, setSortFieldProduto] = useState<string>('faturamento');
    const [sortDirProduto, setSortDirProduto] = useState<'asc' | 'desc'>('desc');
    const [sortFieldGrupo, setSortFieldGrupo] = useState<string>('faturamento');
    const [sortDirGrupo, setSortDirGrupo] = useState<'asc' | 'desc'>('desc');
    const [sortFieldVendedor, setSortFieldVendedor] = useState<string>('faturamento');
    const [sortDirVendedor, setSortDirVendedor] = useState<'asc' | 'desc'>('desc');

    const handleSort = (field: string, currentField: string, currentDir: 'asc' | 'desc', setField: Function, setDir: Function) => {
        if (field === currentField) {
            setDir(currentDir === 'asc' ? 'desc' : 'asc');
        } else {
            setField(field);
            setDir('desc');
        }
    };

    // 1. Main Dashboard Data (Fast Load)
    const { data, loading, error } = useProdutosData({
        dataInicio: globalFilters.dataInicio,
        dataFim: globalFilters.dataFim,
        empresaIds: globalFilters.empresaIds
    });

    // 2. Detailed Table Data (Aggregated Sellers)
    const {
        tableData,
        loadingTable
    } = useProdutosVendedor({
        dataInicio: globalFilters.dataInicio,
        dataFim: globalFilters.dataFim,
        empresaIds: globalFilters.empresaIds
    });

    const handleDateRangeChange = (newDateRange: { dataInicio: string; dataFim: string }) => {
        updateFilters(newDateRange);
    };

    const handleEmpresasChange = (ids: string[]) => {
        updateFilters({ empresaIds: ids });
    };

    // Filter and Sort Logic
    const filteredProdutos = data?.performance_produtos
        ? [...data.performance_produtos]
            .filter(item => item.produto.toLowerCase().includes(searchProduto.toLowerCase()))
            .sort((a, b) => {
                const modifier = sortDirProduto === 'asc' ? 1 : -1;
                const field = sortFieldProduto as keyof typeof a;
                if (typeof a[field] === 'string') {
                    return (a[field] as string).localeCompare(b[field] as string) * modifier;
                }
                return ((a[field] as number) - (b[field] as number)) * modifier;
            })
        : [];

    const filteredGrupos = data?.performance_grupos
        ? [...data.performance_grupos]
            .filter(item => item.grupo.toLowerCase().includes(searchGrupo.toLowerCase()))
            .sort((a, b) => {
                const modifier = sortDirGrupo === 'asc' ? 1 : -1;
                const field = sortFieldGrupo as keyof typeof a;
                if (typeof a[field] === 'string') {
                    return (a[field] as string).localeCompare(b[field] as string) * modifier;
                }
                return ((a[field] as number) - (b[field] as number)) * modifier;
            })
        : [];

    // Filter and Sort Sellers
    const sortedTableData = tableData
        ? [...tableData]
            .filter(item => item.vendedor.toLowerCase().includes(selectedVendedor.toLowerCase()))
            .sort((a, b) => {
                const modifier = sortDirVendedor === 'asc' ? 1 : -1;
                const field = sortFieldVendedor as keyof typeof a;
                if (typeof a[field] === 'string') {
                    return (a[field] as string).localeCompare(b[field] as string) * modifier;
                }
                return ((a[field] as number) - (b[field] as number)) * modifier;
            })
        : [];

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

                    <div className="flex flex-col gap-6">
                        {/* Performance por Produto Table */}
                        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                                <h3 className="text-lg font-semibold text-white">Performance por Produto</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={searchProduto}
                                        onChange={(e) => setSearchProduto(e.target.value)}
                                        className="bg-[#0F172A] border border-[#0F4C5C]/20 rounded-lg pl-9 pr-4 py-1.5 text-white text-sm focus:outline-none focus:border-[#0F4C5C] w-full md:w-64"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-200 uppercase bg-[#0F172A] sticky top-0">
                                        <tr>
                                            {[
                                                { label: 'Produto', key: 'produto', align: 'left' },
                                                { label: 'Faturamento', key: 'faturamento', align: 'right' },
                                                { label: 'Custo CMV', key: 'custo', align: 'right' },
                                                { label: 'Margem', key: 'lucro', align: 'right' },
                                                { label: 'Margem %', key: 'margem_percentual', align: 'right' },
                                                { label: 'Qtd Vendida', key: 'cantidad', align: 'right' },
                                                { label: 'Total Desconto', key: 'desconto', align: 'right' }
                                            ].map((col, idx) => (
                                                <th
                                                    key={col.key}
                                                    onClick={() => handleSort(col.key, sortFieldProduto, sortDirProduto, setSortFieldProduto, setSortDirProduto)}
                                                    className={`px-4 py-3 cursor-pointer hover:bg-[#0F4C5C]/20 transition-colors ${col.align === 'right' ? 'text-right' : ''} ${idx === 0 ? 'rounded-tl-lg' : ''} ${idx === 6 ? 'rounded-tr-lg' : ''}`}
                                                >
                                                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : 'justify-start'} space-x-1`}>
                                                        <span>{col.label}</span>
                                                        {sortFieldProduto === col.key ? (
                                                            sortDirProduto === 'asc' ? <ChevronUp size={14} className="text-emerald-400" /> : <ChevronDown size={14} className="text-emerald-400" />
                                                        ) : (
                                                            <div className="w-3.5 opacity-0 group-hover:opacity-50" />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProdutos.map((item, index) => (
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
                                                <td className="px-4 py-3 text-right text-white">
                                                    {new Intl.NumberFormat('pt-BR').format(item.cantidad)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.desconto)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Performance por Grupo Table */}
                        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                                <h3 className="text-lg font-semibold text-white">Performance por Grupo</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar grupo..."
                                        value={searchGrupo}
                                        onChange={(e) => setSearchGrupo(e.target.value)}
                                        className="bg-[#0F172A] border border-[#0F4C5C]/20 rounded-lg pl-9 pr-4 py-1.5 text-white text-sm focus:outline-none focus:border-[#0F4C5C] w-full md:w-64"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-200 uppercase bg-[#0F172A] sticky top-0">
                                        <tr>
                                            {[
                                                { label: 'Grupo', key: 'grupo', align: 'left' },
                                                { label: 'Faturamento', key: 'faturamento', align: 'right' },
                                                { label: 'Ticket Médio', key: 'ticket_medio', align: 'right' },
                                                { label: 'Margem', key: 'lucro', align: 'right' },
                                                { label: 'Margem %', key: 'margem_percentual', align: 'right' },
                                                { label: 'Qtd Vendida', key: 'cantidad', align: 'right' },
                                                { label: 'Total Desconto', key: 'desconto', align: 'right' }
                                            ].map((col, idx) => (
                                                <th
                                                    key={col.key}
                                                    onClick={() => handleSort(col.key, sortFieldGrupo, sortDirGrupo, setSortFieldGrupo, setSortDirGrupo)}
                                                    className={`px-4 py-3 cursor-pointer hover:bg-[#0F4C5C]/20 transition-colors ${col.align === 'right' ? 'text-right' : ''} ${idx === 0 ? 'rounded-tl-lg' : ''} ${idx === 6 ? 'rounded-tr-lg' : ''}`}
                                                >
                                                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : 'justify-start'} space-x-1`}>
                                                        <span>{col.label}</span>
                                                        {sortFieldGrupo === col.key ? (
                                                            sortDirGrupo === 'asc' ? <ChevronUp size={14} className="text-emerald-400" /> : <ChevronDown size={14} className="text-emerald-400" />
                                                        ) : (
                                                            <div className="w-3.5 opacity-0 group-hover:opacity-50" />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredGrupos.map((item, index) => (
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
                                                <td className="px-4 py-3 text-right text-white">
                                                    {new Intl.NumberFormat('pt-BR').format(item.cantidad)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.desconto)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Performance por Vendedor Table (Aggregated) */}
                    <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6 relative">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                            <h3 className="text-lg font-semibold text-white">
                                Performance por Vendedor
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar vendedor..."
                                    value={selectedVendedor}
                                    onChange={(e) => setSelectedVendedor(e.target.value)}
                                    className="bg-[#0F172A] border border-[#0F4C5C]/20 rounded-lg pl-9 pr-4 py-1.5 text-white text-sm focus:outline-none focus:border-[#0F4C5C] w-full md:w-64"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar relative min-h-[100px]">
                            {loadingTable ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#1E293B]/80 z-10">
                                    <div className="w-8 h-8 border-2 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-200 uppercase bg-[#0F172A] sticky top-0">
                                        <tr>
                                            {[
                                                { label: 'Vendedor', key: 'vendedor', align: 'left' },
                                                { label: 'Faturamento', key: 'faturamento', align: 'right' },
                                                { label: 'Ticket Médio', key: 'ticket_medio', align: 'right' },
                                                { label: 'Total Desconto', key: 'total_desconto', align: 'right' },
                                                { label: 'Qtde Vendida', key: 'quantidade_vendida', align: 'right' }
                                            ].map((col, idx) => (
                                                <th
                                                    key={col.key}
                                                    onClick={() => handleSort(col.key, sortFieldVendedor, sortDirVendedor, setSortFieldVendedor, setSortDirVendedor)}
                                                    className={`px-4 py-3 cursor-pointer hover:bg-[#0F4C5C]/20 transition-colors ${col.align === 'right' ? 'text-right' : ''} ${idx === 0 ? 'rounded-tl-lg' : ''} ${idx === 4 ? 'rounded-tr-lg' : ''}`}
                                                >
                                                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : 'justify-start'} space-x-1`}>
                                                        <span>{col.label}</span>
                                                        {sortFieldVendedor === col.key ? (
                                                            sortDirVendedor === 'asc' ? <ChevronUp size={14} className="text-emerald-400" /> : <ChevronDown size={14} className="text-emerald-400" />
                                                        ) : (
                                                            <div className="w-3.5 opacity-0 group-hover:opacity-50" />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTableData.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum dado encontrado</td>
                                            </tr>
                                        ) : (
                                            sortedTableData.map((item, index) => (
                                                <tr key={index} className="border-b border-[#0F4C5C]/10 hover:bg-[#0F4C5C]/5">
                                                    <td className="px-4 py-3 font-medium text-white">{item.vendedor}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-400">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.faturamento)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-blue-400">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.ticket_medio)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-red-400">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_desconto)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-white">
                                                        {new Intl.NumberFormat('pt-BR').format(item.quantidade_vendida)}
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
