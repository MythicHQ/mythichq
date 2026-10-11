import { useEffect, useState } from 'react';

export const useLocalDate = () => {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeoutId = window.setTimeout(() => setToday(new Date()), nextDay.getTime() - now.getTime() + 100);
    return () => window.clearTimeout(timeoutId);
  }, [today]);

  return today;
};
