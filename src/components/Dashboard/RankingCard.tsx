import React from 'react';
import { LucideIcon } from 'lucide-react';

interface RankingItem {
    label: string;
    value: number;
    subValue: number | string;
    subLabel: string;
}

interface RankingCardProps {
    title: string;
    icon: LucideIcon;
    items: RankingItem[];
}

export const RankingCard: React.FC<RankingCardProps> = ({ title, icon: Icon, items }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const getMedalColor = (index: number) => {
        switch (index) {
            case 0:
                return 'text-yellow-400';
            case 1:
                return 'text-gray-300';
            case 2:
                return 'text-orange-400';
            default:
                return 'text-gray-500';
        }
    };

    return (
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
                <Icon className="w-4 h-4 text-[#0F4C5C]" />
                <h3 className="text-base font-semibold text-white">{title}</h3>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {items && items.length > 0 ? (
                    items.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-2.5 bg-[#0F172A] rounded-lg hover:bg-[#0F172A]/70 transition-colors"
                        >
                            <div className="flex items-center space-x-2 overflow-hidden">
                                <span className={`text-lg font-bold ${getMedalColor(index)} flex-shrink-0`}>
                                    #{index + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-white font-medium text-sm truncate" title={item.label}>{item.label}</p>
                                    <p className="text-xs text-gray-400">{item.subValue} {item.subLabel}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <p className="text-[#0F4C5C] font-semibold text-sm">{formatCurrency(item.value)}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 text-center py-4 text-sm">Nenhum dado disponível</p>
                )}
            </div>
        </div>
    );
};
