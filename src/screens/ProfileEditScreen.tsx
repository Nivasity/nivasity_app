import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Input from '../components/Input';
import AppIcon from '../components/AppIcon';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { profileAPI } from '../services/api';
import { AppThemeMode } from '../theme/colors';
import { User } from '../types';

interface ProfileEditScreenProps {
  navigation: any;
}

const ProfileEditScreen: React.FC<ProfileEditScreenProps> = () => {
  const { user, updateUser, logout } = useAuth();
  const { colors, isDark, toggle, mode, setMode } = useTheme();
  const appMessage = useAppMessage();
  const insets = useSafeAreaInsets();
  const [profileData, setProfileData] = useState<Partial<User>>({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);

  const initials = useMemo(() => (user?.name || 'U').charAt(0).toUpperCase(), [user?.name]);

  const validate = (): boolean => {
    const newErrors: Partial<User> = {};

    if (!profileData.name) {
      newErrors.name = 'Name is required';
    }

    if (!profileData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const updatedUser = await profileAPI.updateProfile(profileData);
      updateUser(updatedUser);
      appMessage.toast({ message: 'Profile updated successfully.' });
    } catch (error: any) {
      appMessage.alert({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
            <TouchableOpacity
              onPress={toggle}
              style={[styles.iconButton, { backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel="Toggle theme"
            >
              <AppIcon name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.secondary }]}>{initials}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {user?.name || 'Student'}
                </Text>
                <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
                  {(user?.email || '').toLowerCase()}
                </Text>
              </View>
            </View>

            <View style={styles.themeRow}>
              <ThemePill label="System" value="system" current={mode} onSelect={setMode} />
              <ThemePill label="Light" value="light" current={mode} onSelect={setMode} />
              <ThemePill label="Dark" value="dark" current={mode} onSelect={setMode} />
            </View>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={profileData.name}
              onChangeText={(text) => setProfileData({ ...profileData, name: text })}
              errorText={errors.name as string | undefined}
              autoCapitalize="words"
              autoComplete="name"
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text })}
              errorText={errors.email as string | undefined}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Button title="Save Changes" onPress={handleSave} loading={loading} />
            <View style={{ height: 10 }} />
            <Button title="Logout" onPress={handleLogout} variant="outline" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const ThemePill = ({
  label,
  value,
  current,
  onSelect,
}: {
  label: string;
  value: AppThemeMode;
  current: AppThemeMode;
  onSelect: (mode: AppThemeMode) => void;
}) => {
  const { colors } = useTheme();
  const active = current === value;
  return (
    <TouchableOpacity
      onPress={() => onSelect(value)}
      style={[
        styles.themePill,
        {
          backgroundColor: active ? colors.accent : colors.surfaceAlt,
        },
      ]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Theme ${label}`}
    >
      <Text style={[styles.themePillText, { color: active ? colors.onAccent : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 54,
    height: 54,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themePill: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
});

export default ProfileEditScreen;
