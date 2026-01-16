import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  DollarSign,
  Upload,
  History,
  Users,
  Shield,
  Building2,
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight,
  ShoppingBag // Added import
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
  activeMenu: string;
  onMenuClick: (menu: string) => void;
  isOpen: boolean;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'comercial', label: 'Faturamento', icon: TrendingUp },
  { id: 'operacional', label: 'Ordem de Serviço', icon: Package },
  { id: 'produtos', label: 'Produtos', icon: ShoppingBag }, // Added item
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'historial', label: 'Histórico', icon: History },
];

const gerenciadorItems = [
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'grupos', label: 'Grupos', icon: Shield },
  { id: 'empresas', label: 'Empresas', icon: Building2 },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onMenuClick, isOpen }) => {
  const { signOut } = useAuth();
  const { canViewMenu, permissions } = usePermissions();
  const [gerenciadorOpen, setGerenciadorOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const visibleMenuItems = menuItems.filter(item => canViewMenu(item.id));
  const visibleGerenciadorItems = gerenciadorItems.filter(item => canViewMenu(item.id));

  const isGerenciadorActive = ['usuarios', 'grupos', 'empresas'].includes(activeMenu);

  return (
    <aside className={`w-56 h-screen bg-[#0F172A] border-r border-[#0F4C5C]/20 flex flex-col fixed left-0 top-0 transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="p-4 border-b border-[#0F4C5C]/20">
        <div className="flex items-center space-x-2">
          <img
            src="/logo-removebg-preview.png"
            alt="COMECCE Logo"
            className="w-8 h-8 object-contain"
          />
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              COMECCE
            </h1>
            <p className="text-[10px] text-gray-500">Análise Contábil</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onMenuClick(item.id)}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${isActive
                  ? 'bg-gradient-to-r from-[#0F4C5C] to-[#0F4C5C] text-white shadow-lg shadow-[#0F4C5C]/30'
                  : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}

        {visibleGerenciadorItems.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setGerenciadorOpen(!gerenciadorOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${isGerenciadorActive
                  ? 'bg-[#1E293B] text-white'
                  : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'
                }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Gerenciador</span>
              </div>
              {gerenciadorOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {gerenciadorOpen && (
              <div className="mt-1 ml-3 space-y-1">
                {visibleGerenciadorItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onMenuClick(item.id)}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${isActive
                          ? 'bg-gradient-to-r from-[#0F4C5C] to-[#0F4C5C] text-white shadow-lg shadow-[#0F4C5C]/30'
                          : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-[#0F4C5C]/20">
        <div className="flex items-center space-x-2 mb-3 px-1">
          <div className="w-8 h-8 bg-gradient-to-br from-[#5F0F40] to-[#9A031E] rounded-full flex items-center justify-center text-white text-xs font-bold">
            {permissions?.perfil?.nome?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{permissions?.perfil?.nome || 'Usuário'}</p>
            <p className="text-[10px] text-gray-500 truncate">{permissions?.perfil?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-[#1E293B] hover:bg-[#9A031E]/20 text-gray-400 hover:text-[#9A031E] rounded-lg transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};
