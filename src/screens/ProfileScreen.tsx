import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import ThemeModeDrawer from '../components/ThemeModeDrawer';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { profileAPI, referenceAPI } from '../services/api';
import { AppThemeMode } from '../theme/colors';
import { DashboardStats } from '../types';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const { colors, isDark, mode, setMode } = useTheme();
  const appMessage = useAppMessage();
  const insets = useSafeAreaInsets();
  const [themeVisible, setThemeVisible] = useState(false);
  const [avatarMode, setAvatarMode] = useState<'idle' | 'armed' | 'uploading'>('idle');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [resolvedSchoolName, setResolvedSchoolName] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await profileAPI.getProfile(); // Ensure user is up-to-date
        updateUser(res);
        const dash = await (await import('../services/api')).dashboardAPI.getStudentStats();
        if (mounted && dash) {
          setStats({
            totalOrders: dash.totalOrders ?? 0,
            totalSpent: dash.totalSpent ?? 0,
            pendingOrders: dash.pendingOrders ?? 0,
          });
        }
      } catch {
        if (mounted) setStats({ totalOrders: 0, totalSpent: 0, pendingOrders: 0 });
      }
    })();
    return () => { mounted = false; };
  }, [updateUser]);

  useEffect(() => {
    const direct = (user?.school || user?.institutionName || '').trim();
    if (direct) {
      setResolvedSchoolName(direct);
      return;
    }

    const rawSchoolId = user?.schoolId;
    const schoolId = rawSchoolId != null ? Number(rawSchoolId) : NaN;
    if (!Number.isFinite(schoolId)) {
      setResolvedSchoolName('');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const data = await referenceAPI.getSchools({ page: 1, limit: 100 });
        const match = (data.schools || []).find((s: any) => Number(s?.id) === schoolId);
        const name = String(match?.name || '').trim();
        if (!mounted) return;
        setResolvedSchoolName(name);
        if (name && user && !user.school) updateUser({ ...user, school: name });
      } catch {
        if (!mounted) return;
        setResolvedSchoolName('');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [updateUser, user, user?.institutionName, user?.school, user?.schoolId]);

  const initials = useMemo(
    () => (user?.name || 'U').trim().charAt(0).toUpperCase(),
    [user?.name]
  );

  const themeLabel = useMemo(() => {
    const map: Record<AppThemeMode, string> = {
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    };
    return map[mode];
  }, [mode]);

  useEffect(() => {
    if (avatarMode !== 'armed') return;
    const handle = setTimeout(() => setAvatarMode('idle'), 4500);
    return () => clearTimeout(handle);
  }, [avatarMode]);

  const toImageMimeType = (uri: string, mimeType?: string | null) => {
    const trimmed = (mimeType || '').trim();
    if (trimmed) return trimmed;
    const clean = (uri || '').split('?')[0].split('#')[0];
    const ext = clean.split('.').pop()?.toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'heic') return 'image/heic';
    if (ext === 'heif') return 'image/heif';
    return 'image/jpeg';
  };

  const pickAndUploadAvatar = async () => {
    if (!user) return;

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        appMessage.toast({ status: 'failed', message: 'Allow photo access to upload a profile picture.' });
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (res.canceled || !res.assets?.[0]?.uri) {
        setAvatarMode('idle');
        return;
      }

      const asset = res.assets[0];
      const uri = asset.uri;
      const name = (asset.fileName || `profile-${Date.now()}.jpg`).trim();
      const type = toImageMimeType(uri, (asset as any).mimeType);

      setAvatarMode('uploading');

      const updatedUser = await profileAPI.updateProfilePhoto({ file: { uri, name, type }, fallback: user });
      updateUser(updatedUser);
      appMessage.toast({ status: 'success', message: 'Profile photo updated.' });
    } catch (error: any) {
      appMessage.toast({
        status: 'failed',
        message: error?.response?.data?.message || error?.message || 'Failed to update profile photo.',
      });
    } finally {
      setAvatarMode('idle');
    }
  };

  const handleAvatarPress = () => {
    if (avatarMode === 'uploading') return;
    if (avatarMode === 'idle') setAvatarMode('armed');
    else pickAndUploadAvatar();
  };

  const confirmLogout = () => {
    appMessage.confirm({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      destructive: true,
      onConfirm: logout,
    });
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.secondary }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.secondary }]}>
          <View style={styles.fireworks}>
            <View style={[styles.spark, styles.sparkOne]} />
            <View style={[styles.spark, styles.sparkTwo]} />
            <View style={[styles.spark, styles.sparkThree]} />
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={handleAvatarPress}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={avatarMode === 'armed' ? 'Tap again to upload profile photo' : 'Edit profile photo'}
            style={[
              styles.avatarWrap,
              { borderColor: colors.surface, backgroundColor: colors.surface },
            ]}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <AppText style={[styles.avatarText, { color: colors.secondary }]}>{initials}</AppText>
            )}

            {avatarMode !== 'idle' ? (
              <View
                style={[
                  styles.avatarOverlay,
                  { backgroundColor: isDark ? 'rgba(0,0,0,0.34)' : 'rgba(255,255,255,0.45)' },
                ]}
                pointerEvents="none"
              >
                {avatarMode === 'uploading' ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <View style={[styles.avatarEditPill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <AppIcon name="create-outline" size={18} color={colors.secondary} />
                  </View>
                )}
              </View>
            ) : null}
          </TouchableOpacity>

          <AppText style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {user?.name || 'Student'}
          </AppText>
          <AppText style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
            {user?.matricNumber || 'matricNumber'}
          </AppText>

          <View style={styles.statsRow}>
            <Stat value={String(stats?.totalOrders ?? 0)} label="Materials bought" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Stat value={stats ? `₦${(stats.totalSpent ?? 0).toLocaleString()}` : '₦0'} label="Total spent" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Stat value={user?.admissionYear ? (/^\d{4}$/.test(user.admissionYear) ? `${user.admissionYear}/${Number(user.admissionYear) + 1}` : user.admissionYear) : 'Not set'} label="Academic Year" />
          </View>

          <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Row
              icon="person-outline"
              label="My Account"
              value={resolvedSchoolName || 'Not set'}
              onPress={() => navigation.navigate('ProfileSection', { section: 'myAccount' })}
            />
            <Divider />
            <Row
              icon="shield-checkmark-outline"
              label="Security"
              onPress={() => navigation.navigate('ProfileSection', { section: 'security' })}
            />
            <Divider />
            <Row icon="help-circle-outline" label="Support" onPress={() => undefined} />
          </View>

          <View style={{ height: 14 }} />

          <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Row
              icon="sunny-outline"
              label="Theme"
              value={themeLabel}
              onPress={() => setThemeVisible(true)}
            />
          </View>

          <View style={{ height: 14 }} />

          <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Row
              icon="shield-checkmark-outline"
              label="Privacy policy"
              onPress={() => navigation.navigate('StaticPage', { page: 'privacy' })}
            />
            <Divider />
            <Row
              icon="book-outline"
              label="Terms and conditions"
              onPress={() => navigation.navigate('StaticPage', { page: 'terms' })}
            />
            <Divider />
            <Row
              icon="help-circle-outline"
              label="About"
              onPress={() => navigation.navigate('StaticPage', { page: 'about' })}
            />
          </View>

          <View style={{ height: 14 }} />

          <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Row icon="log-out-outline" label="Logout" tone="danger" onPress={confirmLogout} />
          </View>
        </View>
      </ScrollView>

      <ThemeModeDrawer
        visible={themeVisible}
        mode={mode}
        onClose={() => setThemeVisible(false)}
        onSelect={(next) => {
          setMode(next);
          setThemeVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <AppText style={[styles.statValue, { color: colors.text }]}>{value}</AppText>
      <AppText style={[styles.statLabel, { color: colors.textMuted }]}>{label}</AppText>
    </View>
  );
};

const Row = ({
  icon,
  label,
  value,
  tone = 'default',
  onPress,
}: {
  icon: React.ComponentProps<typeof AppIcon>['name'];
  label: string;
  value?: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  const accentColor = tone === 'danger' ? colors.danger : colors.secondary;
  const labelColor = tone === 'danger' ? colors.danger : colors.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.row}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.rowIcon]}>
        <AppIcon name={icon} size={18} color={accentColor} />
      </View>
      <View style={styles.rowBody}>
        <AppText style={[styles.rowLabel, { color: labelColor }]}>{label}</AppText>
        {value ? (
          <AppText style={[styles.rowValue, { color: colors.textMuted }]} numberOfLines={1}>
            {value}
          </AppText>
        ) : null}
      </View>
      <AppIcon name="chevron-forward" size={18} color={tone === 'danger' ? colors.danger : colors.textMuted} />
    </TouchableOpacity>
  );
};

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: 250,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  fireworks: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 36,
  },
  spark: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
  },
  sparkOne: {
    left: -60,
    bottom: -40,
    opacity: 0.8,
  },
  sparkTwo: {
    right: -80,
    top: 50,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.7,
  },
  sparkThree: {
    left: 90,
    top: 110,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.65,
  },
  sheet: {
    marginTop: -70,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 70,
    paddingBottom: 20,
  },
  avatarWrap: {
    position: 'absolute',
    top: -52,
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 104,
    height: 104,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  email: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 28,
    opacity: 0.9,
  },
  promoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  promoText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    maxWidth: 220,
  },
  addButton: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addText: {
    fontSize: 14,
    fontWeight: '900',
  },
  list: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
});

export default ProfileScreen;
