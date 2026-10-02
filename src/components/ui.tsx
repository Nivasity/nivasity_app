import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import AppText from './AppText';
import AppIcon, { AppIconName } from './AppIcon';
import { useTheme } from '../contexts/ThemeContext';

// Fintech building blocks shared by the screens (same look as the web portal):
// raised cards with a bottom lip, a plum-to-orange wallet card, round icon actions and chips.
// No drop shadows anywhere (AGENTS.md).

/** Raised card: border plus a slightly darker bottom lip. Pass onPress to make it tappable. */
export function Card({
  children,
  style,
  onPress,
  padded = true,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    padded && styles.cardPadded,
    { backgroundColor: colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      {children}
    </Pressable>
  );
}

/** Plum-to-orange gradient card (wallet balance). Drawn with SVG so no native module is needed. */
export function GradientCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.gradientCard, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="wallet" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.gradientFrom} />
            <Stop offset="0.55" stopColor={colors.gradientVia} />
            <Stop offset="1" stopColor={colors.gradientTo} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wallet)" />
        <Circle cx="92%" cy="8%" r="90" fill="rgba(255,255,255,0.10)" />
        <Circle cx="98%" cy="70%" r="55" fill="rgba(255,255,255,0.08)" />
      </Svg>
      {children}
    </View>
  );
}

/** Round coloured action (dashboard quick actions) with the raised lip. */
export function RoundAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.roundAction}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.roundIcon,
              {
                backgroundColor: color,
                borderBottomWidth: pressed ? 1 : 3,
                borderBottomColor: 'rgba(0,0,0,0.22)',
                transform: [{ translateY: pressed ? 2 : 0 }],
              },
            ]}
          >
            <AppIcon name={icon} size={24} color="#FFFFFF" />
          </View>
          <AppText style={[styles.roundLabel, { color: colors.text }]}>{label}</AppText>
        </>
      )}
    </Pressable>
  );
}

/** Small round icon on a soft colour. */
export function IconCircle({
  icon,
  size = 36,
  color,
  background,
}: {
  icon: AppIconName;
  size?: number;
  color?: string;
  background?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background ?? colors.accentSoft,
      }}
    >
      <AppIcon name={icon} size={Math.round(size * 0.47)} color={color ?? colors.accent} />
    </View>
  );
}

/** Filter chip. Active chips are solid orange with the raised lip. */
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.accent, borderColor: colors.accent, borderBottomColor: colors.accentLip, borderBottomWidth: 3 }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <AppText style={[styles.chipText, { color: active ? colors.onAccent : colors.textMuted }]}>{label}</AppText>
    </Pressable>
  );
}

/** Section title with an optional orange action on the right. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <AppText style={[styles.sectionTitle, { color: colors.text }]}>{title}</AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText style={[styles.sectionAction, { color: colors.accent }]}>{action}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** List row: icon circle, title/subtitle, optional right text and chevron. */
export function ListRow({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  right,
  rightColor,
  onPress,
  danger,
  chevron = true,
}: {
  icon?: AppIconName;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  subtitle?: string;
  right?: string;
  rightColor?: string;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      {icon ? (
        <IconCircle
          icon={icon}
          color={danger ? colors.danger : iconColor ?? colors.text}
          background={danger ? colors.dangerSoft : iconBackground ?? colors.surfaceAlt}
        />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText numberOfLines={1} style={[styles.rowTitle, { color: danger ? colors.danger : colors.text }]}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText numberOfLines={1} style={[styles.rowSubtitle, { color: colors.textMuted }]}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <AppText style={[styles.rowRight, { color: rightColor ?? colors.text }]}>{right}</AppText> : null}
      {onPress && chevron && !danger ? <AppIcon name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      {content}
    </Pressable>
  );
}

/** Thin divider for lists inside a Card. */
export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

/** Big screen title like the web PageHeader. */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.screenTitleRow}>
      <View style={{ flex: 1 }}>
        <AppText style={[styles.screenTitle, { color: colors.text }]}>{title}</AppText>
        {subtitle ? <AppText style={[styles.screenSubtitle, { color: colors.textMuted }]}>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

/** Round icon button for headers (back, notifications, refresh...). */
export function IconButton({
  icon,
  onPress,
  label,
  badge,
  tone = 'surface',
}: {
  icon: AppIconName;
  onPress: () => void;
  label: string;
  badge?: number;
  tone?: 'surface' | 'onGradient';
}) {
  const { colors } = useTheme();
  const onGradient = tone === 'onGradient';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        onGradient
          ? { backgroundColor: pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)' }
          : { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border, borderWidth: 1 },
      ]}
    >
      <AppIcon name={icon} size={20} color={onGradient ? '#FFFFFF' : colors.text} />
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.background }]}>
          <AppText style={[styles.badgeText, { color: colors.onAccent }]}>{badge > 9 ? '9+' : String(badge)}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Course code tile coloured per course (same 8 colours as the web). */
const COURSE_COLORS = ['#F59E0B', '#2563EB', '#0D9488', '#7A3B73', '#DB2777', '#7C3AED', '#059669', '#EA580C'];
export const courseColor = (code: string) => {
  let h = 0;
  for (const ch of String(code || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
};
/** Leading letters (max 4) and first number, e.g. "CHM 101/PHY 101" -> CHM / 101. */
export const splitCourseCode = (code: string): [string, string] => {
  const raw = String(code || '').trim();
  const letters = raw.match(/[A-Za-z]+/)?.[0] ?? '';
  const digits = raw.match(/\d+/)?.[0] ?? '';
  if (!letters && !digits) return [raw.slice(0, 4) || '?', ''];
  return [letters.toUpperCase().slice(0, 4), digits.slice(0, 4)];
};

export function CourseTile({ code, size = 48 }: { code: string; size?: number }) {
  const [letters, digits] = splitCourseCode(code);
  const bg = courseColor(code);
  return (
    <View style={[styles.courseTile, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg }]}>
      <AppText style={[styles.courseLetters, { fontSize: Math.max(9, size * 0.2) }]}>{letters}</AppText>
      {digits ? <AppText style={[styles.courseDigits, { fontSize: Math.max(11, size * 0.29) }]}>{digits}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 3,
    overflow: 'hidden',
  },
  cardPadded: {
    padding: 16,
  },
  gradientCard: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: 20,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(40,10,38,0.55)',
  },
  roundAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  roundIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  rowRight: {
    fontSize: 14,
    fontWeight: '700',
  },
  screenTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  courseTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseLetters: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  courseDigits: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 1,
  },
});
