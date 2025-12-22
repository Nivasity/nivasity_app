import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import { useTheme } from '../contexts/ThemeContext';

const SavedScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.content, { paddingBottom: 110 + insets.bottom }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
          <AppIcon name="heart-outline" size={22} color={colors.accent} />
        </View>
        <AppText style={[styles.title, { color: colors.text }]}>Saved</AppText>
        <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
          Items you like will show up here.
        </AppText>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 260,
  },
});

export default SavedScreen;
