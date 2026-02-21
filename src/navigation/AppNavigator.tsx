import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as ExpoLinking from 'expo-linking';
import AppIcon, { AppIconName } from '../components/AppIcon';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { createNavigationTheme } from '../theme/navigationTheme';
import { flushPendingNavigation, navigationRef } from './navigationRef';
import Loading from '../components/Loading';
import AcademicDetailsDialog from '../components/AcademicDetailsDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { referenceAPI } from '../services/api';
import { getCountryOptions } from '../utils/country';

// Auth Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';

// Dashboard Screens
import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import ProfileSectionScreen from '../screens/ProfileSectionScreen';
import StaticPageScreen from '../screens/StaticPageScreen';
import StoreScreen from '../screens/StoreScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderReceiptScreen from '../screens/OrderReceiptScreen';
import SupportTicketsScreen from '../screens/SupportTicketsScreen';
import SupportChatScreen from '../screens/SupportChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_BAR_BG = '#0B0B0C';
const TAB_BAR_HEIGHT = 65;
const TAB_BAR_WIDTH_RATIO = 0.68;
const TAB_BAR_MAX_WIDTH = 420;

const linking = {
  prefixes: [
    ExpoLinking.createURL('/', { scheme: 'nivasity' }),
    'nivasity://',
    'https://nivasity.com',
    'https://www.nivasity.com',
  ],
  config: {
    screens: {
      StudentMain: {
        screens: {
          Store: {
            path: 'material/:materialId',
          },
        },
      },
    },
  },
};

// Auth Stack Navigator
const AuthStack = ({ initialRouteName }: { initialRouteName: 'Welcome' | 'Login' }) => {
  useEffect(() => {
    referenceAPI.getSchools({ page: 1, limit: 100 }).catch(() => undefined);
  }, []);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

// Student Tab Navigator
const StudentTabs = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const tabBarWidth = Math.min(windowWidth * TAB_BAR_WIDTH_RATIO, TAB_BAR_MAX_WIDTH);
  const sideInset = Math.max((windowWidth - tabBarWidth) / 2, 0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          start: sideInset,
          end: sideInset,
          bottom: 10 + insets.bottom,
          borderRadius: TAB_BAR_HEIGHT / 2,
          backgroundColor: isDark ? TAB_BAR_BG : colors.surface,
          borderWidth: 2,
          borderColor: colors.border,
          overflow: 'visible',
          height: TAB_BAR_HEIGHT,
          elevation: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          padding: 18,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={StudentDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="home-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="Store"
        component={StoreScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="bag-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrderHistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="receipt-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="person-outline" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading, authEntryRoute } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // Prefetch local country dialing codes so the picker opens instantly.
    getCountryOptions();
  }, []);

  if (isLoading) {
    return <Loading message="Loading..." />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushPendingNavigation}
      theme={createNavigationTheme(colors, isDark)}
      linking={linking as any}
    >
      {!isAuthenticated ? (
        <AuthStack initialRouteName={authEntryRoute} />
      ) : (
        <>
          <Stack.Navigator>
            <Stack.Screen
              name="StudentMain"
              component={StudentTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfileEdit"
              component={ProfileEditScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfileSection"
              component={ProfileSectionScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="StaticPage"
              component={StaticPageScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderReceipt"
              component={OrderReceiptScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SupportTickets"
              component={SupportTicketsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SupportChat"
              component={SupportChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
          <AcademicDetailsDialog />
        </>
      )}
    </NavigationContainer>
  );
};

const TabIcon = ({ focused, icon }: { focused: boolean; icon: AppIconName }) => {
  const { colors, isDark } = useTheme();
  const color = focused ? colors.onAccent : 'rgba(255,255,255,0.65)';
  return (
    <View style={[styles.tabPill, focused && { backgroundColor: colors.accent }]}>
      <AppIcon name={icon} size={22} color={focused ? colors.onAccent : colors.text} />
    </View>
  );
};

const styles = StyleSheet.create({
  tabPill: {
    width: 50,
    height: 50,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
