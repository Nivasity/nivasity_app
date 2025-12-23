import React from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarButtonProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AppIcon, { AppIconName } from '../components/AppIcon';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { createNavigationTheme } from '../theme/navigationTheme';
import Loading from '../components/Loading';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Auth Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Dashboard Screens
import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import StoreScreen from '../screens/StoreScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderReceiptScreen from '../screens/OrderReceiptScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_BAR_BG = '#0B0B0C';
const TAB_BAR_HEIGHT = 65;
const TAB_BAR_WIDTH_RATIO = 0.68;
const TAB_BAR_MAX_WIDTH = 420;

// Auth Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
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
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: 'visible',
          height: TAB_BAR_HEIGHT,
          elevation: 0,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
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
            <TabIcon focused={focused} icon="search-outline" />
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
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, isDark } = useTheme();

  if (isLoading) {
    return <Loading message="Loading..." />;
  }

  return (
    <NavigationContainer theme={createNavigationTheme(colors, isDark)}>
      {!isAuthenticated ? (
        <AuthStack />
      ) : (
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
            name="Checkout"
            component={CheckoutScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrderReceipt"
            component={OrderReceiptScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
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
