import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIconName } from './AppIcon';
import AppText from './AppText';
import Button from './Button';
import { IconCircle } from './ui';
import { useTheme } from '../contexts/ThemeContext';

type EmptyStateProps = {
  icon: AppIconName;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Empty list message in a raised card, with an optional call to action.
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, actionLabel, onAction }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip }]}>
      <IconCircle icon={icon} size={56} />
      <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
      <AppText style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</AppText>
      {actionLabel && onAction ? <Button title={actionLabel} size="sm" onPress={onAction} style={{ marginTop: 14 }} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default EmptyState;
