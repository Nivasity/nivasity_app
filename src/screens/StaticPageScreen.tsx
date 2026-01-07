import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import { useTheme } from '../contexts/ThemeContext';

type StaticPage = 'privacy' | 'terms' | 'about';

type StaticPageScreenProps = {
  navigation: any;
  route: { params?: { page?: StaticPage } };
};

const CONTENT: Record<StaticPage, { title: string; blocks: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Privacy policy',
    blocks: [
      {
        heading: 'Overview',
        body:
          'We respect your privacy. This policy explains what data we collect, why we collect it, and how you can manage it.',
      },
      {
        heading: 'Data we collect',
        body:
          'Account details (such as name, email, phone), academic info you provide, and app usage data needed to deliver core features.',
      },
      {
        heading: 'How we use data',
        body:
          'To create and secure your account, process orders, improve the experience, and communicate important updates.',
      },
      {
        heading: 'Your choices',
        body:
          'You can update your profile information at any time. You can also delete your account from the Security screen.',
      },
    ],
  },
  terms: {
    title: 'Terms & conditions',
    blocks: [
      {
        heading: 'Acceptance',
        body: 'By using this app, you agree to these terms and to follow all applicable laws and policies.',
      },
      {
        heading: 'Accounts',
        body:
          'You are responsible for keeping your login credentials secure and for activities carried out under your account.',
      },
      {
        heading: 'Orders and payments',
        body:
          'Payment processing may be handled by third-party providers. Ensure your details are accurate before confirming payment.',
      },
      {
        heading: 'Changes',
        body: 'We may update these terms from time to time. Continued use of the app means you accept the updated terms.',
      },
    ],
  },
  about: {
    title: 'About',
    blocks: [
      {
        heading: 'Nivasity',
        body:
          'Nivasity helps students discover and purchase academic materials with a smooth checkout experience and personalized browsing.',
      },
      {
        heading: 'Support',
        body: 'Need help? Reach out via the Support option in your Profile screen.',
      },
      {
        heading: 'Theme',
        body: 'Switch between Light, Dark, or System theme from Profile > Theme.',
      },
    ],
  },
};

const StaticPageScreen: React.FC<StaticPageScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const page = (route?.params?.page as StaticPage | undefined) ?? 'about';
  const content = useMemo(() => CONTENT[page], [page]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <AppIcon name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {content.title}
        </AppText>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {content.blocks.map((block) => (
          <View
            key={block.heading}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <AppText style={[styles.heading, { color: colors.text }]}>{block.heading}</AppText>
            <AppText style={[styles.body, { color: colors.textMuted }]}>{block.body}</AppText>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
    maxWidth: '70%',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
  },
  heading: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  body: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});

export default StaticPageScreen;

