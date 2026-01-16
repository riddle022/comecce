import React from 'react';
import { Package } from 'lucide-react';
import { RankingGroup } from '../../hooks/useOperacionalData';

interface TopGroupsCardProps {
    grupos: RankingGroup[];
}

export const TopGroupsCard: React.FC<TopGroupsCardProps> = ({ grupos = [] }) => {
    return (
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6 hover:border-[#0F4C5C]/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <div className="p-2 bg-[#0F4C5C]/10 rounded-lg">
                        <Package className="w-5 h-5 text-[#4CC9F0]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Top OS por Grupos</h3>
                </div>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {grupos.length === 0 ? (
                    <div className="text-center py-4 text-gray-400">
                        Nenhum dado disponível
                    </div>
                ) : (
                    grupos.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-[#0F4C5C]/10">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0F4C5C]/20 text-[#4CC9F0] text-sm font-medium">
                                    {index + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{item.grupo}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-[#4CC9F0]">{item.total_os} OS</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
