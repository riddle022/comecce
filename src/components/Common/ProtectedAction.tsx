import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface ProtectedActionProps {
  children: React.ReactNode;
  requiredPermission: 'edit' | 'delete' | 'admin';
  fallback?: React.ReactNode;
}

export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  children,
  requiredPermission,
  fallback = null,
}) => {
  const { canEdit, canDelete, isAdmin } = usePermissions();

  let hasPermission = false;

  switch (requiredPermission) {
    case 'edit':
      hasPermission = canEdit();
      break;
    case 'delete':
      hasPermission = canDelete();
      break;
    case 'admin':
      hasPermission = isAdmin();
      break;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
