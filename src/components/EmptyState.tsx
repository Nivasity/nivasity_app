import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppIcon, { AppIconName } from './AppIcon';
import AppText from './AppText';
import { useTheme } from '../contexts/ThemeContext';

type EmptyStateProps = {
  icon: AppIconName;
  title: string;
  subtitle: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card]}>
      <View style={[styles.iconWrap]}>
        <AppIcon name={icon} size={32} color={colors.secondary} />
      </View>
      <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
      <AppText style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default EmptyState;

