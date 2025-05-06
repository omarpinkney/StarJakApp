// App.js
import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from 'react-native-splash-screen';
import Toast from 'react-native-toast-message';

// Import screens
import LoadingScreen from './screens/LoadingScreen';
import SetupWizardScreen from './screens/SetupWizardScreen';
import MainScreen from './screens/MainScreen';
import SettingsScreen from './screens/SettingsScreen';
import ContactScreen from './screens/ContactScreen';

// Import services
import { initBleManager } from './services/BleService';
import { loadPairedRims } from './services/StorageService';

// Ignore specific warnings
LogBox.ignoreLogs(['new NativeEventEmitter']);

const Stack = createStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [pairedRims, setPairedRims] = useState([]);
  const [initialSetupComplete, setInitialSetupComplete] = useState(false);

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      try {
        // Initialize BLE
        await initBleManager();
        
        // Load stored paired rims
        const storedRims = await loadPairedRims();
        setPairedRims(storedRims);
        
        // Check if initial setup is complete
        setInitialSetupComplete(storedRims.length > 0);
        
        // Hide the native splash screen
        if (Platform.OS === 'android') {
          SplashScreen.hide();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // Determine initial route based on setup status
  const initialRouteName = isLoading 
    ? 'Loading' 
    : !initialSetupComplete 
      ? 'SetupWizard' 
      : 'Main';

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Stack.Navigator 
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="SetupWizard" component={SetupWizardScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Contact" component={ContactScreen} />
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
};

export default App;