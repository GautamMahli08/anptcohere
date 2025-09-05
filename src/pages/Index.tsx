import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '@/types/truck';

// ⬇️ Adjust this import to wherever your login.tsx lives
import LoginScreen from '@/components/LoginScreen';

const Index: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = (role: UserRole, name: string) => {
    const route =
      role === 'manager'  ? '/manager'  :
      role === 'client'   ? '/client'   :
      role === 'operator' ? '/operator' :
      role === 'driver'   ? '/driver'   : '/';
    // Save the user in sessionStorage so dashboards can read it if needed
    sessionStorage.setItem('currentUser', JSON.stringify({ role, name }));
    navigate(route);
  };

  return <LoginScreen onLogin={handleLogin} />;
};

export default Index;
