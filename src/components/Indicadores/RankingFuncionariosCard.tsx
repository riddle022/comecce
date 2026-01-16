import React from 'react';
import { Trophy } from 'lucide-react';
import { RankingVendedor } from '../../hooks/useOperacionalData';

interface RankingVendedoresCardProps {
  vendedores: RankingVendedor[];
}

export const RankingVendedoresCard: React.FC<RankingVendedoresCardProps> = ({ vendedores }) => {
  const maxOs = vendedores.length > 0 ? Math.max(...vendedores.map(v => v.total_os)) : 1;

  return (
    <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Trophy className="w-5 h-5 text-[#0F4C5C]" />
        <h3 className="text-lg font-semibold text-white">Ranking de Vendedores</h3>
      </div>
      <div className="space-y-4">
        {vendedores && vendedores.length > 0 ? (
          vendedores.map((vendedor, index) => {
            const percentage = (vendedor.total_os / maxOs) * 100;
            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300 font-medium">{vendedor.vendedor}</span>
                  <span className="text-sm text-gray-400">{vendedor.total_os} OS</span>
                </div>
                <div className="w-full bg-[#0F172A] rounded-full h-8 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#0F4C5C] to-[#1a7a8f] h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-3"
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 15 && (
                      <span className="text-xs font-semibold text-white">
                        {vendedor.total_os}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 text-center py-8 text-sm">Nenhum dado disponível</p>
        )}
      </div>
    </div>
  );
};
