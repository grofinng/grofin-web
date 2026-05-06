import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface RoleRouteProps {
  children: ReactNode;
  allow: UserRole[];
}

function RoleRoute({ children, allow }: RoleRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <span className="spinner dark" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!allow.includes(user.role)) {
    const fallback = user.role === 'user' ? '/dashboard' : '/admin';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return <RoleRoute allow={['admin']}>{children}</RoleRoute>;
}

export function StaffRoute({ children }: { children: ReactNode }) {
  return <RoleRoute allow={['admin', 'manager']}>{children}</RoleRoute>;
}
