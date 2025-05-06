import { useNavigationState } from '@react-navigation/native';
import { useEffect } from 'react';

const NavigationLogger = () => {
  const routes = useNavigationState(state => state.routes);

  useEffect(() => {
    console.log('--- Navigation Stack ---');
    routes.forEach((route, index) => {
      console.log(`${index + 1}: ${route.name}`, route.params || '');
    });
  }, [routes]);

  return null; // No visible UI
};

export default NavigationLogger;