import React from 'react';
import FloatingAIChat from './components/AI/FloatingAIChat';
import { LoginPage } from './components/Auth/LoginPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { EmpresasPage } from './components/Gerenciador/EmpresasPage';
import { GruposPage } from './components/Gerenciador/GruposPage';
import { UsuariosPage } from './components/Gerenciador/UsuariosPage';
import { ComercialPage } from './components/Indicadores/ComercialPage';
import { ComprasPage } from './components/Indicadores/ComprasPage';
import { FinanceiroPage } from './components/Indicadores/FinanceiroPage';
import { OperacionalPage } from './components/Indicadores/OperacionalPage';
import { ProdutosPage } from './components/Indicadores/ProdutosPage';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { HistorialPage } from './components/Upload/HistorialPage';
import { UploadPage } from './components/Upload/UploadPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalFiltersProvider } from './contexts/GlobalFiltersContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { usePermissions } from './hooks/usePermissions';

const menuTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  comercial: 'Indicadores de Faturamento',
  operacional: 'Indicadores de Ordem de Serviço',
  compras: 'Indicadores de Compras',
  produtos: 'Indicadores de Produtos',
  financeiro: 'Indicadores Financeiros',
  upload: 'Upload de Arquivos',
  historial: 'Histórico de Uploads',
  usuarios: 'Gestão de Usuários',
  grupos: 'Gestão de Grupos',
  empresas: 'Gestão de Empresas',
};

const AppContent: React.FC = () => {
  const { user, perfil, loading: authLoading } = useAuth();
  const { canViewMenu, loading: permissionsLoading } = usePermissions();
  const [activeMenu, setActiveMenu] = React.useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const loading = authLoading || permissionsLoading;

  const hasPermission = React.useCallback((menuId: string): boolean => {
    return canViewMenu(menuId);
  }, [canViewMenu]);

  const getDefaultMenu = React.useCallback((): string => {
    const allMenus = ['dashboard', 'comercial', 'operacional', 'compras', 'produtos', 'financeiro', 'upload', 'historial', 'usuarios', 'grupos', 'empresas'];
    for (const menu of allMenus) {
      if (hasPermission(menu)) {
        return menu;
      }
    }
    return 'dashboard';
  }, [hasPermission]);

  React.useEffect(() => {
    if (!permissionsLoading && !hasPermission(activeMenu)) {
      setActiveMenu(getDefaultMenu());
    }
  }, [permissionsLoading, activeMenu, hasPermission, getDefaultMenu]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white text-xl font-medium">Verificando credenciais...</div>
        </div>
      </div>
    );
  }

  if (!user || !perfil) {
    return <LoginPage />;
  }

  const handleMenuClick = (menu: string) => {
    if (hasPermission(menu)) {
      setActiveMenu(menu);
    }
  };

  const renderContent = () => {
    if (!hasPermission(activeMenu)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Acesso Negado</h2>
            <p className="text-gray-400">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      );
    }

    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'comercial':
        return <ComercialPage />;
      case 'operacional':
        return <OperacionalPage />;
      case 'compras':
        return <ComprasPage />;
      case 'produtos':
        return <ProdutosPage />; // Added case
      case 'financeiro':
        return <FinanceiroPage />;
      case 'upload':
        return <UploadPage />;
      case 'historial':
        return <HistorialPage />;
      case 'usuarios':
        return <UsuariosPage />;
      case 'grupos':
        return <GruposPage />;
      case 'empresas':
        return <EmpresasPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#0F172A] flex">
        <Sidebar
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          isOpen={sidebarOpen}
        />

        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-0'
          }`}>
          <Header
            title={menuTitles[activeMenu]}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="p-4">
            {renderContent()}
          </main>
        </div>
      </div>

      <FloatingAIChat />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <GlobalFiltersProvider>
          <AppContent />
        </GlobalFiltersProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;
