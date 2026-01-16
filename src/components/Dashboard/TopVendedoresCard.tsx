import React from 'react';
import { Trophy } from 'lucide-react';
import { TopVendedor } from '../../hooks/useDashboardData';

interface TopVendedoresCardProps {
  vendedores: TopVendedor[];
}

export const TopVendedoresCard: React.FC<TopVendedoresCardProps> = ({ vendedores }) => {
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
        <Trophy className="w-4 h-4 text-[#0F4C5C]" />
        <h3 className="text-base font-semibold text-white">Top Vendedores</h3>
      </div>
      <div className="space-y-2">
        {vendedores && vendedores.length > 0 ? (
          vendedores.map((vendedor, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2.5 bg-[#0F172A] rounded-lg hover:bg-[#0F172A]/70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold ${getMedalColor(index)}`}>
                  #{index + 1}
                </span>
                <div>
                  <p className="text-white font-medium text-sm">{vendedor.vendedor}</p>
                  <p className="text-xs text-gray-400">{vendedor.vendas} vendas</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#0F4C5C] font-semibold text-sm">{formatCurrency(vendedor.valor)}</p>
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
