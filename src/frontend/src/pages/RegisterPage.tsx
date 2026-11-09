import React from 'react';
import { useNavigate } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate('/login?mode=register', { replace: true });
  }, [navigate]);

  return null;
};
