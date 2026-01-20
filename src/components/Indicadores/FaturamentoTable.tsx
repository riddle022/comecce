import React, { useMemo, useState } from 'react';
import { SalesData } from '../../hooks/useSalesData';
import { Info, ArrowUp, ArrowDown } from 'lucide-react';

interface FaturamentoTableProps {
    data: SalesData;
    dateRange?: {
        start: string | Date;
        end: string | Date;
    };
}

// Inline Variation Indicator Component
const VariationIndicator = ({
    current,
    previous,
    isPartial,
    label
}: {
    current: number;
    previous: number;
    isPartial: boolean;
    label: string
}) => {
    if (isPartial || !previous) {
        return (
            <span
                className="ml-2 text-gray-400 cursor-help select-none inline-flex items-center text-xs font-medium w-[60px]"
                title={`${label}: Comparação indisponível para mês parcial ou sem dados anteriores.`}
            >
                —
            </span>
        );
    }

    const diff = current - previous;
    const percent = (diff / previous) * 100;
    const isPositive = percent >= 0;
    const colorClass = isPositive ? "text-lime-400" : "text-red-500";
    const Icon = isPositive ? ArrowUp : ArrowDown;

    return (
        <span
            className={`ml-2 inline-flex items-center text-xs font-medium ${colorClass} cursor-help select-none w-[60px]`}
            title={`${label}: Comparado com mês anterior (${new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(previous)})`}
        >
            <Icon size={12} className="mr-0.5" />
            {Math.abs(percent).toFixed(1)}%
        </span>
    );
};

export const FaturamentoTable: React.FC<FaturamentoTableProps> = ({ data, dateRange }) => {
    const [isCompareMode, setIsCompareMode] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('pt-BR').format(value);
    };

    // Helper to parse dates
    const parseDate = (dateStr: string) => new Date(dateStr + 'T12:00:00');

    // Helper to get month name
    const getMonthName = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', { month: '2-digit', year: 'numeric' }).format(date);
    };

    const tableData = useMemo(() => {
        if (!data?.tendencia) return [];

        // Sort trend data by date
        const sortedTrend = [...data.tendencia].sort((a, b) => a.data.localeCompare(b.data));

        // If not compare mode, aggregate everything into a single row
        if (!isCompareMode) {
            const total = sortedTrend.reduce((acc, curr) => ({
                faturamento_bruto: acc.faturamento_bruto + (Number(curr.valor_bruto) || 0),
                faturamento_liquido: acc.faturamento_liquido + (Number(curr.valor_liquido) || 0),
                numero_vendas: acc.numero_vendas + (Number(curr.numero_vendas) || 0),
                quantidade_vendida: acc.quantidade_vendida + (Number(curr.quantidade_vendida) || 0),
                desconto_total: acc.desconto_total + (Number(curr.desconto_total) || 0),
                custo_total: acc.custo_total + (Number(curr.custo_total) || 0),
            }), {
                faturamento_bruto: 0,
                faturamento_liquido: 0,
                numero_vendas: 0,
                quantidade_vendida: 0,
                desconto_total: 0,
                custo_total: 0
            });

            return [{
                periodo: 'Total',
                ...total,
                ticket_medio: total.numero_vendas > 0 ? total.faturamento_liquido / total.numero_vendas : 0,
                indice_desconto: total.faturamento_bruto > 0 ? (total.desconto_total / total.faturamento_bruto) * 100 : 0,
                margem_bruta: total.faturamento_liquido > 0 ? ((total.faturamento_liquido - total.custo_total) / total.faturamento_liquido) * 100 : 0,
                isPartial: false,
                previousData: null
            }];
        }

        // Compare mode: Group by month
        const groupedByMonth: Record<string, any> = {};

        sortedTrend.forEach(item => {
            const date = parseDate(item.data);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM sortable key

            if (!groupedByMonth[key]) {
                groupedByMonth[key] = {
                    rawDate: date,
                    faturamento_bruto: 0,
                    faturamento_liquido: 0,
                    numero_vendas: 0,
                    quantidade_vendida: 0,
                    desconto_total: 0,
                    custo_total: 0
                };
            }

            groupedByMonth[key].faturamento_bruto += (Number(item.valor_bruto) || 0);
            groupedByMonth[key].faturamento_liquido += (Number(item.valor_liquido) || 0);
            groupedByMonth[key].numero_vendas += (Number(item.numero_vendas) || 0);
            groupedByMonth[key].quantidade_vendida += (Number(item.quantidade_vendida) || 0);
            groupedByMonth[key].desconto_total += (Number(item.desconto_total) || 0);
            groupedByMonth[key].custo_total += (Number(item.custo_total) || 0);
        });

        // Convert to array and sort
        const sortedRows = Object.entries(groupedByMonth)
            .map(([key, val]) => ({
                sortKey: key,
                ...val
            }))
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        // Calculate derived metrics and variations with partiality check
        return sortedRows.map((row, index) => {
            // Check Partiality
            // A month is partial if:
            // 1. It is the FIRST month AND dateRange.start > 1st of that month
            // 2. It is the LAST month AND dateRange.end < last day of that month
            let isPartial = false;

            if (dateRange) {
                const rowDate = new Date(row.sortKey + '-01T12:00:00');
                const monthEnd = new Date(rowDate.getFullYear(), rowDate.getMonth() + 1, 0);

                const filterStart = new Date(dateRange.start);
                const filterEnd = new Date(dateRange.end);

                // Use simple string comparison for "YYYY-MM" to check matching months
                const filterStartMonthObj = new Date(filterStart.getFullYear(), filterStart.getMonth(), 1);
                const filterEndMonthObj = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), 1);

                // If this row is the Start Month of the filter
                if (rowDate.getTime() === filterStartMonthObj.getTime()) {
                    if (filterStart.getDate() > 1) isPartial = true;
                }

                // If this row is the End Month of the filter
                if (rowDate.getTime() === filterEndMonthObj.getTime()) {
                    if (filterEnd.getDate() < monthEnd.getDate()) isPartial = true;
                }
            }

            // Get Previous Data (only if previous row exists and is NOT partial)
            const previousRow = index > 0 ? sortedRows[index - 1] : null;



            // Correct approach: Just check this row's partiality for display.
            // For variation, we simply won't show it if EITHER is partial.
            // For now, let's just pass the data and handle "hide if partial" in the render.

            return {
                periodo: getMonthName(row.rawDate),
                sortKey: row.sortKey,
                ...row,
                ticket_medio: row.numero_vendas > 0 ? row.faturamento_liquido / row.numero_vendas : 0,
                indice_desconto: row.faturamento_bruto > 0 ? (row.desconto_total / row.faturamento_bruto) * 100 : 0,
                margem_bruta: row.faturamento_liquido > 0 ? ((row.faturamento_liquido - row.custo_total) / row.faturamento_liquido) * 100 : 0,
                isPartial: isPartial,
                previousData: previousRow
            };
        });

    }, [data?.tendencia, isCompareMode, dateRange]);

    // Calculate total row for compare mode
    const totalRow = useMemo(() => {
        if (!isCompareMode || tableData.length === 0) return null;

        const total = tableData.reduce((acc, curr) => ({
            faturamento_bruto: acc.faturamento_bruto + curr.faturamento_bruto,
            faturamento_liquido: acc.faturamento_liquido + curr.faturamento_liquido,
            numero_vendas: acc.numero_vendas + curr.numero_vendas,
            quantidade_vendida: acc.quantidade_vendida + curr.quantidade_vendida,
            desconto_total: acc.desconto_total + curr.desconto_total,
            custo_total: acc.custo_total + curr.custo_total,
        }), {
            faturamento_bruto: 0,
            faturamento_liquido: 0,
            numero_vendas: 0,
            quantidade_vendida: 0,
            desconto_total: 0,
            custo_total: 0
        });

        return {
            periodo: 'TOTAL',
            ...total,
            ticket_medio: total.numero_vendas > 0 ? total.faturamento_liquido / total.numero_vendas : 0,
            indice_desconto: total.faturamento_bruto > 0 ? (total.desconto_total / total.faturamento_bruto) * 100 : 0,
            margem_bruta: total.faturamento_liquido > 0 ? ((total.faturamento_liquido - total.custo_total) / total.faturamento_liquido) * 100 : 0
        };
    }, [tableData, isCompareMode]);

    // Partial Month Detection (Visual Warning at bottom)
    const partialMonthWarning = useMemo(() => {
        if (!isCompareMode || !dateRange || !tableData.length) return null;

        const messages: string[] = [];
        // Use T12:00:00 to avoid timezone shifts
        const filterStart = typeof dateRange.start === 'string' ? new Date(dateRange.start + 'T12:00:00') : new Date(dateRange.start);
        const filterEnd = typeof dateRange.end === 'string' ? new Date(dateRange.end + 'T12:00:00') : new Date(dateRange.end);

        // Helper for formatting date as DD/MM/YYYY
        const formatDateLong = (date: Date) => {
            return new Intl.DateTimeFormat('pt-BR').format(date);
        };

        // Check if start date is not the 1st
        if (filterStart.getDate() > 1) {
            messages.push(`mês inicial considera dados a partir de ${formatDateLong(filterStart)}`);
        }

        // Check if end date is not the last day
        const monthEnd = new Date(filterEnd.getFullYear(), filterEnd.getMonth() + 1, 0);
        if (filterEnd.getDate() < monthEnd.getDate()) {
            messages.push(`mês final considera dados até ${formatDateLong(filterEnd)}`);
        }

        if (messages.length === 0) return null;

        // Capitalize first letter of combined message and join
        const combined = messages.join('. ') + '.';
        return combined.charAt(0).toUpperCase() + combined.slice(1);

    }, [tableData, dateRange, isCompareMode]);

    return (
        <>
            <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#0F4C5C]/20 flex flex-row items-center justify-between">
                    <h3 className="text-base font-semibold text-white">Indicadores de Faturamento</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">Comparar</span>
                        <button
                            onClick={() => setIsCompareMode(!isCompareMode)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${isCompareMode ? 'bg-[#0F4C5C]' : 'bg-gray-600'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isCompareMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-200 uppercase bg-[#0F172A]">
                            <tr>
                                {isCompareMode && <th className="px-4 py-3">Período</th>}
                                <th className="px-4 py-3 text-center">Faturamento Bruto</th>
                                <th className="px-4 py-3 text-center">Faturamento Líquido</th>
                                <th className="px-4 py-3 text-center">Nº Vendas</th>
                                <th className="px-4 py-3 text-right">Ticket Médio</th>

                                <th className="px-4 py-3 text-right">Desconto Total</th>
                                <th className="px-4 py-3 text-center">% Desc. Médio</th>
                                <th className="px-4 py-3 text-center">Margem Bruta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row: any, index) => (
                                <tr key={index} className="border-b border-[#0F4C5C]/10 hover:bg-[#0F4C5C]/5">
                                    {isCompareMode && <td className="px-4 py-3 font-medium text-white">{row.periodo}</td>}
                                    <td className="px-4 py-3 text-center text-cyan-400">
                                        <div className="inline-block min-w-[120px] text-right">{formatCurrency(row.faturamento_bruto)}</div>
                                        {isCompareMode && (
                                            <VariationIndicator
                                                current={row.faturamento_bruto}
                                                previous={row.previousData?.faturamento_bruto}
                                                isPartial={row.isPartial || row.previousData?.isPartial}
                                                label="Faturamento Bruto"
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-emerald-400">
                                        <div className="inline-block min-w-[120px] text-right">{formatCurrency(row.faturamento_liquido)}</div>
                                        {isCompareMode && (
                                            <VariationIndicator
                                                current={row.faturamento_liquido}
                                                previous={row.previousData?.faturamento_liquido}
                                                isPartial={row.isPartial || row.previousData?.isPartial}
                                                label="Faturamento Líquido"
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-white">
                                        {formatNumber(row.numero_vendas)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(row.ticket_medio)}</td>

                                    <td className="px-4 py-3 text-right text-red-400">{formatCurrency(row.desconto_total)}</td>
                                    <td className="px-4 py-3 text-center text-orange-400">{row.indice_desconto.toFixed(2)}%</td>
                                    <td className="px-4 py-3 text-center text-cyan-400">{row.margem_bruta.toFixed(2)}%</td>
                                </tr>
                            ))}

                            {/* Total Row for Compare Mode */}
                            {isCompareMode && totalRow && (
                                <tr className="bg-[#0F172A]/50 font-bold border-t border-[#0F4C5C]/30 text-white">
                                    <td className="px-4 py-3 text-white">TOTAL</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-block min-w-[120px] text-right">{formatCurrency(totalRow.faturamento_bruto)}</div>
                                        {isCompareMode && <span className="ml-2 inline-flex w-[60px]"></span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-block min-w-[120px] text-right">{formatCurrency(totalRow.faturamento_liquido)}</div>
                                        {isCompareMode && <span className="ml-2 inline-flex w-[60px]"></span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">{formatNumber(totalRow.numero_vendas)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(totalRow.ticket_medio)}</td>

                                    <td className="px-4 py-3 text-right">{formatCurrency(totalRow.desconto_total)}</td>
                                    <td className="px-4 py-3 text-center">{totalRow.indice_desconto.toFixed(2)}%</td>
                                    <td className="px-4 py-3 text-center">{totalRow.margem_bruta.toFixed(2)}%</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {partialMonthWarning && (
                    <div className="p-3 bg-[#0F172A] border-t border-[#0F4C5C]/20">
                        <p className="text-xs text-amber-400/80 flex items-center gap-2">
                            <Info size={14} />
                            {partialMonthWarning}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};
