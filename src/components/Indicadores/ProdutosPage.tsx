import React, { useState } from 'react';
import {
    Package,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Receipt,
    Search,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { FilterPanel } from '../Common/FilterPanel';
import { MetricCard } from './MetricCard';
import { useProdutosData } from '../../hooks/useProdutosData';
import { useProdutosPaginated } from '../../hooks/useProdutosPaginated';
import { useGruposPaginated } from '../../hooks/useGruposPaginated';
import { useVendedoresPaginated } from '../../hooks/useVendedoresPaginated';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';

export const ProdutosPage: React.FC = () => {
    const { filters: globalFilters, updateFilters } = useGlobalFilters();
    const limit = 5;

    // 1. Main Dashboard Data (KPIs Only)
    const { data: kpiData, loading: kpisLoading, error: kpisError } = useProdutosData({
        dataInicio: globalFilters.dataInicio,
        dataFim: globalFilters.dataFim,
        empresaIds: globalFilters.empresaIds
    });

    // 2. Pagination & Sorting State - Produtos
    const [searchProduto, setSearchProduto] = useState('');
    const [pageProduto, setPageProduto] = useState(1);
    const [sortFieldProduto, setSortFieldProduto] = useState<string>('faturamento');
    const [sortDirProduto, setSortDirProduto] = useState<'asc' | 'desc'>('desc');

    const {
        data: productosData,
        totalCount: productosTotal,
        loading: productosLoading,
        error: productosError
    } = useProdutosPaginated({
        dataInicio: globalFilters.dataInicio,
        dataFim: globalFilters.dataFim,
        empresaIds: globalFilters.empresaIds,
        search: searchProduto,
        page: pageProduto,
        limit,
        sortField: sortFieldProduto,
        sortDir: sortDirProduto
    });

    // 3. Pagination & Sorting State - Grupos
    const [searchGrupo, setSearchGrupo] = useState('');
    const [pageGrupo, setPageGrupo] = useState(1);
    const [sortFieldGrupo, setSortFieldGrupo] = useState<string>('faturamento');
    const [sortDirGrupo, setSortDirGrupo] = useState<'asc' | 'desc'>('desc');

    const {
        data: gruposData,
        totalCount: gruposTotal,
        loading: gruposLoading,
        error: gruposError
    } = useGruposPaginated({
        dataInicio: globalFilters.dataInicio,
        dataFim: globalFilters.dataFim,
        empresaIds: globalFilters.empresaIds,
        search: searchGrupo,
        page: pageGrupo,
        limit,
        sortField: sortFieldGrupo,
        sortDir: sortDirGrupo
    });

    // 4. Pagination & Sorting State - Vendedores
    const [searchVendedor, setSearchVendedor] = useState('');
    const [pageVendedor, setPageVendedor] = useState(1);
    const [sortFieldVendedor, setSortFieldVendedor] = useState<string>('faturamento');
    const [sortDirVendedor, setSortDirVendedor] = useState<'asc' | 'desc'>('desc');

    const {
        data: vendedoresData,
        totalCount: vendedoresTotal,
        loading: vendedoresLoading,
        error: vendedoresError
    } = useVendedoresPaginated({
        dataInicio: globalFilters.dataInicio,
        dataFim: globalFilters.dataFim,
        empresaIds: globalFilters.empresaIds,
        search: searchVendedor,
        page: pageVendedor,
        limit,
        sortField: sortFieldVendedor,
        sortDir: sortDirVendedor
    });

    const handleSort = (field: string, currentField: string, currentDir: 'asc' | 'desc', setField: Function, setDir: Function, setPage: Function) => {
        if (field === currentField) {
            setDir(currentDir === 'asc' ? 'desc' : 'asc');
        } else {
            setField(field);
            setDir('desc');
        }
        setPage(1); // Reset to first page on sort
    };

    const handleDateRangeChange = (newDateRange: { dataInicio: string; dataFim: string }) => {
        updateFilters(newDateRange);
        setPageProduto(1);
        setPageGrupo(1);
        setPageVendedor(1);
    };

    const handleEmpresasChange = (ids: string[]) => {
        updateFilters({ empresaIds: ids });
        setPageProduto(1);
        setPageGrupo(1);
        setPageVendedor(1);
    };

    const PaginationControls = ({
        page,
        total,
        limit,
        setPage,
        loading
    }: {
        page: number,
        total: number,
        limit: number,
        setPage: (p: number) => void,
        loading: boolean
    }) => {
        const totalPages = Math.ceil(total / limit);
        if (totalPages <= 1 && total > 0) return null;
        if (total === 0) return null;

        return (
            <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs text-gray-500">
                    Mostrando <span className="font-medium text-gray-300">{(page - 1) * limit + 1}</span> a <span className="font-medium text-gray-300">{Math.min(page * limit, total)}</span> de <span className="font-medium text-gray-300">{total}</span> itens
                </p>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1 || loading}
                        className="p-1.5 rounded-lg bg-[#0F172A] border border-[#0F4C5C]/20 text-gray-400 hover:text-white hover:border-[#0F4C5C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-gray-400 font-medium px-2">
                        Página {page} de {totalPages || 1}
                    </span>
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages || loading}
                        className="p-1.5 rounded-lg bg-[#0F172A] border border-[#0F4C5C]/20 text-gray-400 hover:text-white hover:border-[#0F4C5C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
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

            {kpisLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-4 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-400">Carregando dados de produtos...</p>
                    </div>
                </div>
            )}

            {kpisError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <div>
                            <p className="text-red-400 font-medium">Erro ao carregar dados</p>
                            <p className="text-red-300 text-sm mt-1">{kpisError}</p>
                        </div>
                    </div>
                </div>
            )}

            {!kpisLoading && !kpisError && kpiData && (
                <>
                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Produtos Vendidos"
                            value={new Intl.NumberFormat('pt-BR').format(kpiData.kpis.produtos_vendidos)}
                            icon={Package}
                            color="blue"
                        />
                        <MetricCard
                            title="Custo Produtos (CMV)"
                            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpiData.kpis.custo_total_cmv)}
                            icon={Receipt}
                            color="orange"
                        />
                        <MetricCard
                            title="Margem Bruta (Valor)"
                            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpiData.kpis.margem_bruta_valor)}
                            icon={DollarSign}
                            color="green"
                        />
                        <MetricCard
                            title="Margem Bruta (%)"
                            value={`${kpiData.kpis.margem_bruta_percentual}%`}
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
                                        onChange={(e) => {
                                            setSearchProduto(e.target.value);
                                            setPageProduto(1);
                                        }}
                                        className="bg-[#0F172A] border border-[#0F4C5C]/20 rounded-lg pl-9 pr-4 py-1.5 text-white text-sm focus:outline-none focus:border-[#0F4C5C] w-full md:w-64"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto min-h-[300px] relative">
                                {productosLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#1E293B]/60 z-10">
                                        <div className="w-8 h-8 border-2 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
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
                                                    onClick={() => handleSort(col.key, sortFieldProduto, sortDirProduto, setSortFieldProduto, setSortDirProduto, setPageProduto)}
                                                    className={`px-4 py-3 cursor-pointer hover:bg-[#0F4C5C]/20 transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
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
                                        {productosData.length === 0 && !productosLoading ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum produto encontrado</td>
                                            </tr>
                                        ) : (
                                            productosData.map((item, index) => (
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
                                            ))
                                        )}
                                    </tbody>
                                    {kpiData.kpis && (
                                        <tfoot className="sticky bottom-0 bg-[#0F172A] border-t-2 border-[#0F4C5C]/30 text-xs font-bold uppercase transition-colors">
                                            <tr>
                                                <td className="px-4 py-3 text-white">Totais</td>
                                                <td className="px-4 py-3 text-right text-emerald-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        kpiData.kpis.faturamento_total
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-orange-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        kpiData.kpis.custo_total_cmv
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-cyan-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        kpiData.kpis.margem_bruta_valor
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-white">
                                                    {kpiData.kpis.margem_bruta_percentual}%
                                                </td>
                                                <td className="px-4 py-3 text-right text-white">
                                                    {new Intl.NumberFormat('pt-BR').format(
                                                        kpiData.kpis.produtos_vendidos
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        kpiData.kpis.desconto_total
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                            <PaginationControls
                                page={pageProduto}
                                total={productosTotal}
                                limit={limit}
                                setPage={setPageProduto}
                                loading={productosLoading}
                            />
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
                                        onChange={(e) => {
                                            setSearchGrupo(e.target.value);
                                            setPageGrupo(1);
                                        }}
                                        className="bg-[#0F172A] border border-[#0F4C5C]/20 rounded-lg pl-9 pr-4 py-1.5 text-white text-sm focus:outline-none focus:border-[#0F4C5C] w-full md:w-64"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto min-h-[300px] relative">
                                {gruposLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#1E293B]/60 z-10">
                                        <div className="w-8 h-8 border-2 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
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
                                                    onClick={() => handleSort(col.key, sortFieldGrupo, sortDirGrupo, setSortFieldGrupo, setSortDirGrupo, setPageGrupo)}
                                                    className={`px-4 py-3 cursor-pointer hover:bg-[#0F4C5C]/20 transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
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
                                        {gruposData.length === 0 && !gruposLoading ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum grupo encontrado</td>
                                            </tr>
                                        ) : (
                                            gruposData.map((item, index) => (
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
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls
                                page={pageGrupo}
                                total={gruposTotal}
                                limit={limit}
                                setPage={setPageGrupo}
                                loading={gruposLoading}
                            />
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
                                    value={searchVendedor}
                                    onChange={(e) => {
                                        setSearchVendedor(e.target.value);
                                        setPageVendedor(1);
                                    }}
                                    className="bg-[#0F172A] border border-[#0F4C5C]/20 rounded-lg pl-9 pr-4 py-1.5 text-white text-sm focus:outline-none focus:border-[#0F4C5C] w-full md:w-64"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[100px] relative">
                            {vendedoresLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#1E293B]/80 z-10">
                                    <div className="w-8 h-8 border-2 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
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
                                                onClick={() => handleSort(col.key, sortFieldVendedor, sortDirVendedor, setSortFieldVendedor, setSortDirVendedor, setPageVendedor)}
                                                className={`px-4 py-3 cursor-pointer hover:bg-[#0F4C5C]/20 transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
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
                                    {vendedoresData.length === 0 && !vendedoresLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum dado encontrado</td>
                                        </tr>
                                    ) : (
                                        vendedoresData.map((item, index) => (
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
                        </div>
                        <PaginationControls
                            page={pageVendedor}
                            total={vendedoresTotal}
                            limit={limit}
                            setPage={setPageVendedor}
                            loading={vendedoresLoading}
                        />
                    </div>
                </>
            )}
        </div>
    );
};
