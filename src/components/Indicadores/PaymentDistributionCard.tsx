import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PaymentMethod } from '../../hooks/useSalesData';

interface PaymentDistributionCardProps {
    data: PaymentMethod[];
}

const COLORS = [
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
];

export const PaymentDistributionCard: React.FC<PaymentDistributionCardProps> = ({ data }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const groupedData = useMemo(() => {
        if (!data) return [];

        const categories: Record<string, { label: string; valor: number; originalMethods: string[] }> = {
            'Crédito': { label: 'Cartão de Crédito', valor: 0, originalMethods: [] },
            'Débito': { label: 'Cartão de Débito', valor: 0, originalMethods: [] },
            'Dinheiro': { label: 'Dinheiro', valor: 0, originalMethods: [] },
            'Pix': { label: 'Pix', valor: 0, originalMethods: [] },
            'Boleto': { label: 'Boleto', valor: 0, originalMethods: [] },
            'Outros': { label: 'Outros', valor: 0, originalMethods: [] },
        };

        data.forEach(item => {
            const forma = item.forma.toUpperCase();
            if (forma.includes('CREDITO')) {
                categories['Crédito'].valor += item.valor;
                categories['Crédito'].originalMethods.push(item.forma);
            } else if (forma.includes('DEBITO')) {
                categories['Débito'].valor += item.valor;
                categories['Débito'].originalMethods.push(item.forma);
            } else if (forma.includes('CARTAO') || forma.includes('VISA') || forma.includes('MASTER') || forma.includes('ELO') || forma.includes('AMERICAN')) {
                // If it's a card but doesn't specify, default to Crédito as it's the most common
                categories['Crédito'].valor += item.valor;
                categories['Crédito'].originalMethods.push(item.forma);
            } else if (forma.includes('DINHEIRO') || forma.includes('ESPECIE')) {
                categories['Dinheiro'].valor += item.valor;
                categories['Dinheiro'].originalMethods.push(item.forma);
            } else if (forma.includes('PIX')) {
                categories['Pix'].valor += item.valor;
                categories['Pix'].originalMethods.push(item.forma);
            } else if (forma.includes('BOLETO')) {
                categories['Boleto'].valor += item.valor;
                categories['Boleto'].originalMethods.push(item.forma);
            } else {
                categories['Outros'].valor += item.valor;
                categories['Outros'].originalMethods.push(item.forma);
            }
        });

        const totalValue = Object.values(categories).reduce((acc, cat) => acc + cat.valor, 0);

        return Object.values(categories)
            .filter(cat => cat.valor > 0)
            .map(cat => ({
                ...cat,
                porcentagem: totalValue > 0 ? (cat.valor / totalValue) * 100 : 0
            }))
            .sort((a, b) => b.valor - a.valor);
    }, [data]);

    return (
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-500 rounded-full" />
                Distribuição por Forma de Pagamento
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Chart Section */}
                <div className="lg:col-span-5 h-[280px]">
                    {groupedData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={groupedData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="valor"
                                    nameKey="label"
                                >
                                    {groupedData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0F172A',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                    itemStyle={{ color: '#E2E8F0' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Valor']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 italic">
                            Sem dados de pagamento
                        </div>
                    )}
                </div>

                {/* List Section */}
                <div className="lg:col-span-7">
                    <div className="space-y-4">
                        {groupedData.map((item, index) => (
                            <div key={index} className="group flex flex-col space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-sm font-medium text-white">{item.label}</span>
                                        <span className="text-xs text-gray-400">({item.porcentagem.toFixed(1)}%)</span>
                                    </div>
                                    <span className="text-sm font-semibold text-cyan-400">
                                        {formatCurrency(item.valor)}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div className="w-full bg-[#0F172A] rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${item.porcentagem}%`,
                                            backgroundColor: COLORS[index % COLORS.length]
                                        }}
                                    />
                                </div>
                                {/* Optional small detail on original methods */}
                                {item.originalMethods.length > 0 && (
                                    <div className="text-[10px] text-gray-500 truncate max-w-full">
                                        {item.originalMethods.join(', ')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
