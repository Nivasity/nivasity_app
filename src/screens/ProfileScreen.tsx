import React, { useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();

  const initials = useMemo(
    () => (user?.name || 'U').trim().charAt(0).toUpperCase(),
    [user?.name]
  );

  const headerBackground = isDark ? colors.surfaceAlt : colors.secondary;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: headerBackground }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={toggle}
              style={styles.headerIcon}
              accessibilityRole="button"
              accessibilityLabel="Toggle theme"
              activeOpacity={0.85}
            >
              <AppIcon
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>Profile</AppText>
            <TouchableOpacity
              onPress={logout}
              style={styles.headerIcon}
              accessibilityRole="button"
              accessibilityLabel="Logout"
              activeOpacity={0.85}
            >
              <AppIcon name="log-out-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.fireworks}>
            <View style={[styles.spark, styles.sparkOne]} />
            <View style={[styles.spark, styles.sparkTwo]} />
            <View style={[styles.spark, styles.sparkThree]} />
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View
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
          </View>

          <AppText style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {user?.name || 'Student'}
          </AppText>
          <AppText style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
            {(user?.email || '').toLowerCase()}
          </AppText>

          <View style={styles.statsRow}>
            <Stat value="0" label="Likes" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Stat value="0" label="Orders" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Stat value="0" label="Following" />
          </View>

          <View style={[styles.promoCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.promoTitle, { color: colors.text }]}>
                Customize your experience
              </AppText>
              <AppText style={[styles.promoText, { color: colors.textMuted }]}>
                Get recommendations based on your interests.
              </AppText>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel="Add preferences"
              activeOpacity={0.85}
            >
              <AppIcon name="add" size={18} color={colors.text} />
              <AppText style={[styles.addText, { color: colors.text }]}>Add</AppText>
            </TouchableOpacity>
          </View>

          <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Row
              icon="location-outline"
              label="Primary city"
              value="Not set"
              onPress={() => undefined}
            />
            <Divider />
            <Row
              icon="settings-outline"
              label="Account settings"
              onPress={() => navigation.navigate('ProfileEdit')}
            />
            <Divider />
            <Row icon="link-outline" label="Linked accounts" onPress={() => undefined} />
            <Divider />
            <Row icon="help-circle-outline" label="Support" onPress={() => undefined} />
          </View>
        </View>
      </ScrollView>
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
  onPress,
}: {
  icon: React.ComponentProps<typeof AppIcon>['name'];
  label: string;
  value?: string;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.row}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt }]}>
        <AppIcon name={icon} size={18} color={colors.secondary} />
      </View>
      <View style={styles.rowBody}>
        <AppText style={[styles.rowLabel, { color: colors.text }]}>{label}</AppText>
        {value ? (
          <AppText style={[styles.rowValue, { color: colors.textMuted }]} numberOfLines={1}>
            {value}
          </AppText>
        ) : null}
      </View>
      <AppIcon name="chevron-forward" size={18} color={colors.textMuted} />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
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
    borderColor: 'rgba(255,255,255,0.14)',
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
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 16,
    paddingTop: 70,
    paddingBottom: 24,
  },
  avatarWrap: {
    position: 'absolute',
    top: -52,
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 10,
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
