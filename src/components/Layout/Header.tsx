import React from 'react';
import { Menu, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onToggleSidebar }) => {
  const { perfil } = useAuth();

  return (
    <header className="h-14 bg-[#0F172A] border-b border-[#0F4C5C]/20 flex items-center justify-between px-4">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-all"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>

      <div className="flex items-center space-x-2">


        <div className="flex items-center space-x-2 ml-3 pl-3 border-l border-[#0F4C5C]/30">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0F4C5C] to-[#0F4C5C]/80 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-medium text-white">
              {perfil?.nome || 'Usuário'}
            </p>
            <p className="text-[10px] text-gray-400">
              {perfil?.grupo?.nome || 'Perfil'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
