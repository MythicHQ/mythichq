import { Navigate } from 'react-router-dom';
import { useAuth } from '../pages/Admin/AuthContext';
import LoadingIndicator from './LoadingIndicator';

const ProtectedRoute = ({ children, adminOnly = false, redirectTo = '/login' }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-container auth-page-shell"><LoadingIndicator label="Verifying your access..." /></div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
