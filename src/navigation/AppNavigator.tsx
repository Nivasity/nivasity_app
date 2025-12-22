import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
import SavedScreen from '../screens/SavedScreen';
import CheckoutScreen from '../screens/CheckoutScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_BAR_BG = '#0B0B0C';
const TAB_BAR_HEIGHT = 64;

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16 + insets.bottom,
          height: TAB_BAR_HEIGHT,
          borderRadius: TAB_BAR_HEIGHT / 2,
          backgroundColor: TAB_BAR_BG,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.12,
          shadowRadius: 18,
          elevation: 10,
          overflow: 'visible',
        },
        tabBarItemStyle: {
          height: TAB_BAR_HEIGHT,
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
        name="Saved"
        component={SavedScreen}
        options={{
          tabBarButton: (props) => <CenterTabButton {...props} />,
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
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const TabIcon = ({ focused, icon }: { focused: boolean; icon: AppIconName }) => {
  const { colors } = useTheme();
  const color = focused ? '#FFFFFF' : 'rgba(255,255,255,0.65)';
  return (
    <View style={[styles.tabPill, focused && { backgroundColor: colors.secondary }]}>
      <AppIcon name={icon} size={22} color={color} />
    </View>
  );
};

const CenterTabButton = ({ onPress, accessibilityState }: BottomTabBarButtonProps) => {
  const { colors } = useTheme();
  const focused = accessibilityState?.selected;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.centerButton,
        { backgroundColor: colors.secondary, borderColor: TAB_BAR_BG },
        focused && styles.centerButtonFocused,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Saved"
    >
      <AppIcon name="heart-outline" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tabPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 12,
  },
  centerButtonFocused: {
    transform: [{ scale: 1.02 }],
  },
});

export default AppNavigator;
