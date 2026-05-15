/**
 * App.tsx — Kalam Spark Mobile
 * React Native entry point with bottom tab navigation and Cactus model management.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import MentorScreen from './src/screens/MentorScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Services
import { initCactusModel, isModelDownloaded } from './src/services/llmService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Theme Colors (matching web cosmic theme) ──
const COLORS = {
  bg: '#070e20',
  card: '#0a1838',
  border: 'rgba(255,140,66,0.22)',
  primary: '#ff8c42',
  primaryLight: '#ffb380',
  text: '#ffb380',
  textMuted: 'rgba(255,160,100,0.50)',
  accent: '#00d4ff',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Dashboard') iconName = 'home';
          else if (route.name === 'Roadmap') iconName = 'map';
          else if (route.name === 'Planner') iconName = 'checkmark-circle';
          else if (route.name === 'Mentor') iconName = 'chatbubbles';
          else if (route.name === 'Settings') iconName = 'settings';
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Roadmap" component={RoadmapScreen} />
      <Tab.Screen name="Planner" component={PlannerScreen} />
      <Tab.Screen name="Mentor" component={MentorScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [modelStatus, setModelStatus] = useState<'checking' | 'ready' | 'missing'>('checking');

  useEffect(() => {
    async function init() {
      // Check onboarding status
      const onboarded = await AsyncStorage.getItem('onboarded');
      setIsOnboarded(onboarded === 'true');

      // Check if GGUF model is available
      const hasModel = await isModelDownloaded();
      if (hasModel) {
        const loaded = await initCactusModel();
        setModelStatus(loaded ? 'ready' : 'missing');
        if (loaded) {
          console.log('[App] ✓ Gemma 4 Q2_K loaded — offline mode available');
        }
      } else {
        setModelStatus('missing');
        console.log('[App] ⚠ GGUF model not found — online-only mode');
      }

      // Splash delay
      setTimeout(() => setIsLoading(false), 2500);
    }
    init();
  }, []);

  if (isLoading) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <SplashScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: COLORS.primary,
            background: COLORS.bg,
            card: COLORS.card,
            text: COLORS.text,
            border: COLORS.border,
            notification: COLORS.accent,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '900' },
          },
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isOnboarded ? (
            <Stack.Screen name="Onboarding">
              {(props) => (
                <OnboardingScreen
                  {...props}
                  onComplete={() => {
                    AsyncStorage.setItem('onboarded', 'true');
                    setIsOnboarded(true);
                  }}
                />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
