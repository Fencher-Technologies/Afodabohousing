import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './AppProviders';
import { RootNavigator } from '../navigation/RootNavigator';

export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
      <StatusBar style="dark" />
    </AppProviders>
  );
}
