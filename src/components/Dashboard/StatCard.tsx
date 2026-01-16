import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  color: 'cyan' | 'red' | 'orange' | 'purple' | 'green' | 'blue';
}

const colorClasses = {
  cyan: 'from-[#0F4C5C] to-[#0F4C5C]',
  red: 'from-[#9A031E] to-[#9A031E]',
  orange: 'from-[#FB8B24] to-[#E36414]',
  purple: 'from-[#5F0F40] to-[#5F0F40]',
  green: 'from-[#16A34A] to-[#16A34A]',
  blue: 'from-[#2563EB] to-[#2563EB]',
};

const iconBgClasses = {
  cyan: 'bg-[#0F4C5C]/20',
  red: 'bg-[#9A031E]/20',
  orange: 'bg-[#FB8B24]/20',
  purple: 'bg-[#5F0F40]/20',
  green: 'bg-[#16A34A]/20',
  blue: 'bg-[#2563EB]/20',
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  return (
    <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4 hover:border-[#0F4C5C]/40 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`${iconBgClasses[color]} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span className="font-semibold">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-gray-400 text-xs mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>

      <div className={`mt-3 h-1 bg-gradient-to-r ${colorClasses[color]} rounded-full opacity-50 group-hover:opacity-100 transition-opacity`}></div>
    </div>
  );
};
