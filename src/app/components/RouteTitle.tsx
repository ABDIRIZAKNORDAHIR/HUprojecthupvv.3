import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { pageTitleFor } from '../utils/pageTitles';

export function RouteTitle() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    document.title = pageTitleFor(pathname, Boolean(user));
  }, [pathname, user]);

  return null;
}
