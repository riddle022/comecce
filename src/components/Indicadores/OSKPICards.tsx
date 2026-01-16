import React from 'react';
import { FileCheck, Truck, ShoppingCart, XCircle } from 'lucide-react';
import { OperacionalData } from '../../hooks/useOperacionalData';

interface OSKPICardsProps {
  kpis: OperacionalData;
}

export const OSKPICards: React.FC<OSKPICardsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-5 relative overflow-hidden">
        <div className="mb-3">
          <FileCheck className="w-6 h-6 text-cyan-400" />
        </div>
        <p className="text-xs text-gray-400 mb-1">OS Não Entregues</p>
        <p className="text-3xl font-bold text-white mb-4">{kpis.os_nao_entregues}</p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-500"></div>
      </div>

      <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-5 relative overflow-hidden">
        <div className="mb-3">
          <Truck className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-xs text-gray-400 mb-1">OS Entregues</p>
        <p className="text-3xl font-bold text-white mb-4">{kpis.os_entregues}</p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500"></div>
      </div>

      <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-5 relative overflow-hidden">
        <div className="mb-3">
          <ShoppingCart className="w-6 h-6 text-blue-400" />
        </div>
        <p className="text-xs text-gray-400 mb-1">OS Vendidas</p>
        <p className="text-3xl font-bold text-white mb-4">{kpis.os_vendidas}</p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
      </div>

      <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-5 relative overflow-hidden">
        <div className="mb-3">
          <XCircle className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-xs text-gray-400 mb-1">OS Não Vendidas</p>
        <p className="text-3xl font-bold text-white mb-4">{kpis.os_nao_vendidas}</p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500"></div>
      </div>
    </div>
  );
};
