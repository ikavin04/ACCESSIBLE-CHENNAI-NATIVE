import React, { lazy, Suspense } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PreferencesProvider, usePreferences, THEMES } from './src/context/PreferencesContext';
import { VoiceProvider } from './src/voice/VoiceContext';

import ModeSelectionScreen from './src/screens/ModeSelectionScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

// Lazy-load heavy screens for faster startup
const NavigateScreen = lazy(() => import('./src/screens/NavigateScreen'));
const AlertsScreen = lazy(() => import('./src/screens/AlertsScreen'));
const CommunityScreen = lazy(() => import('./src/screens/CommunityScreen'));
const SettingsScreen = lazy(() => import('./src/screens/SettingsScreen'));
const AIAssistantScreen = lazy(() => import('./src/screens/AIAssistantScreen'));

// Wrapper for lazy-loaded screens
const withSuspense = (Component) => (props) => (
  <Suspense fallback={<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator size="large" color="#1976d2" /></View>}>
    <Component {...props} />
  </Suspense>
);

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { preferences, theme } = usePreferences();

  return (
    <>
      <StatusBar style={preferences.theme === 'light' ? 'dark' : 'light'} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="ModeSelection"
          screenOptions={{
            headerStyle: { backgroundColor: theme.navBg },
            headerTintColor: theme.textPrimary,
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
            contentStyle: { backgroundColor: theme.bgPrimary },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="ModeSelection"
            component={ModeSelectionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Accessible Chennai', headerShown: false }}
          />
          <Stack.Screen
            name="Navigate"
            component={withSuspense(NavigateScreen)}
            options={{ title: 'Navigate' }}
          />
          <Stack.Screen
            name="Alerts"
            component={withSuspense(AlertsScreen)}
            options={{ title: 'Real-Time Alerts' }}
          />
          <Stack.Screen
            name="Community"
            component={withSuspense(CommunityScreen)}
            options={{ title: 'Community' }}
          />
          <Stack.Screen
            name="Settings"
            component={withSuspense(SettingsScreen)}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="AIAssistant"
            component={withSuspense(AIAssistantScreen)}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <PreferencesProvider>
      <VoiceProvider>
        <AppNavigator />
      </VoiceProvider>
    </PreferencesProvider>
  );
}
