import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import BellaAvatar from '../components/BellaAvatar';
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
import StoreScreen from '../screens/StoreScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderReceiptScreen from '../screens/OrderReceiptScreen';
import WalletFundScreen from '../screens/WalletFundScreen';
import WalletTransactionsScreen from '../screens/WalletTransactionsScreen';
import WalletTransactionReceiptScreen from '../screens/WalletTransactionReceiptScreen';
import WalletPinScreen from '../screens/WalletPinScreen';
import SupportTicketsScreen from '../screens/SupportTicketsScreen';
import SupportChatScreen from '../screens/SupportChatScreen';
import BellaScreen from '../screens/BellaScreen';
import BellaPrivacyScreen from '../screens/BellaPrivacyScreen';
import BellaHistoryScreen from '../screens/BellaHistoryScreen';
import BellaHelpScreen from '../screens/BellaHelpScreen';
import { BellaChatScreen, BellaChatsScreen } from '../screens/BellaChatsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MaterialRequestsScreen from '../screens/MaterialRequestsScreen';
import ClassRepScreen from '../screens/ClassRepScreen';
import BulkPaymentScreen from '../screens/BulkPaymentScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// The Ask Bella tab opens the Bella chat (a stack screen without the tab bar); this is never shown
const AskBellaPlaceholder = () => null;

// Ask Bella: raised in the middle of the tab bar, with Bella's animated avatar
const BellaTabButton: React.FC<{ onPress?: (e: any) => void }> = ({ onPress }) => {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Ask Bella" style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ marginTop: -26, padding: 4, borderRadius: 40, backgroundColor: colors.surface, shadowColor: '#6b2d74', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
        <BellaAvatar size={56} />
      </View>
      <Text style={{ fontFamily: 'Geist-SemiBold', fontSize: 11, marginTop: 2, color: colors.text }}>Ask Bella</Text>
    </Pressable>
  );
};


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

// Student Tab Navigator: full-width bar with labels; the active tab gets a raised orange pill.
const TABS: { name: string; label: string; icon: AppIconName; activeIcon: AppIconName; component: React.ComponentType<any> }[] = [
  { name: 'Dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home', component: StudentDashboardScreen },
  { name: 'Store', label: 'Store', icon: 'storefront-outline', activeIcon: 'storefront', component: StoreScreen },
  { name: 'Orders', label: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt', component: OrderHistoryScreen },
  { name: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', component: ProfileScreen },
];

const StudentTabs = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        // Tablets would put labels beside the icon pill, where they overlap it
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: 'Geist-SemiBold', fontSize: 11, marginTop: 2 },
        tabBarIconStyle: { height: 30 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          // Phones without a bottom inset (3-button navigation, web) still get room for labels
          height: 66 + Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          elevation: 0,
        },
      }}
    >
      {TABS.slice(0, 2).map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{
            tabBarLabel: t.label,
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={focused ? t.activeIcon : t.icon} />,
          }}
        />
      ))}
      <Tab.Screen
        name="AskBella"
        component={AskBellaPlaceholder}
        options={{ tabBarButton: (props) => <BellaTabButton onPress={props.onPress as any} /> }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Bella');
          },
        })}
      />
      {TABS.slice(2).map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{
            tabBarLabel: t.label,
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={focused ? t.activeIcon : t.icon} />,
          }}
        />
      ))}
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
              name="WalletFund"
              component={WalletFundScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WalletTransactions"
              component={WalletTransactionsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WalletTransactionReceipt"
              component={WalletTransactionReceiptScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WalletPin"
              component={WalletPinScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Bella"
              component={BellaScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BellaPrivacy"
              component={BellaPrivacyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BellaHistory"
              component={BellaHistoryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BellaHelp"
              component={BellaHelpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BellaChats"
              component={BellaChatsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BellaChat"
              component={BellaChatScreen}
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
            <Stack.Screen
              name="MaterialRequests"
              component={MaterialRequestsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ClassRep"
              component={ClassRepScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BulkPayment"
              component={BulkPaymentScreen}
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
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.tabPill,
        focused && {
          backgroundColor: colors.accent,
          borderBottomWidth: 3,
          borderBottomColor: colors.accentLip,
        },
      ]}
    >
      <AppIcon name={icon} size={20} color={focused ? colors.onAccent : colors.textMuted} />
    </View>
  );
};

const styles = StyleSheet.create({
  tabPill: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
