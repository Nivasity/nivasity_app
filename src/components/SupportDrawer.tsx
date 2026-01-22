import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import AppIcon from './AppIcon';
import { referenceAPI } from '../services/api';

type SupportDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onSearchHelp: () => void;
  onMessages: () => void;
};

type SupportContacts = {
  whatsapp?: string;
  email?: string;
};

const SupportOption = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof AppIcon>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.optionIcon, { backgroundColor: colors.surfaceAlt }]}>
        <AppIcon name={icon} size={20} color={colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.optionSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <AppIcon name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const SupportContactOption = ({
  title,
  subtitle,
  rightIcon,
  onPress,
}: {
  title: string;
  subtitle: string;
  rightIcon: React.ComponentProps<typeof AppIcon>['name'];
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.optionSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <AppIcon name={rightIcon} size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const SupportDrawer: React.FC<SupportDrawerProps> = ({ visible, onClose, onSearchHelp, onMessages }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<SupportContacts>({});
  const [contactsLoaded, setContactsLoaded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (contactsLoaded) return;

    let mounted = true;
    (async () => {
      try {
        const res = await referenceAPI.getSupportDetails();
        if (!mounted) return;
        setContacts({ whatsapp: res.whatsapp, email: res.email });
        setContactsLoaded(true);
      } catch (e: any) {
        if (__DEV__) {
          console.log('[SupportDrawer] support details not available:', e?.response?.data?.message || e?.message);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [contactsLoaded, visible]);

  const whatsappValue = (contacts.whatsapp || '').trim();
  const emailValue = (contacts.email || '').trim();
  const hasContacts = !!whatsappValue || !!emailValue;

  const toWhatsAppDigits = (raw: string) => raw.replace(/[^\d]/g, '');

  const openWhatsApp = useCallback(async () => {
    const digits = toWhatsAppDigits(whatsappValue);
    if (!digits) return;
    const deepLink = `whatsapp://send?phone=${digits}`;
    const webLink = `https://wa.me/${digits}`;
    try {
      const can = await Linking.canOpenURL(deepLink);
      await Linking.openURL(can ? deepLink : webLink);
    } catch {
      try {
        await Linking.openURL(webLink);
      } catch {
        // ignore
      }
    }
  }, [whatsappValue]);

  const openEmail = useCallback(async () => {
    const email = emailValue;
    if (!email) return;
    const url = `mailto:${encodeURIComponent(email)}`;
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  }, [emailValue]);

  const divider = useMemo(() => {
    if (!hasContacts) return null;
    return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
  }, [colors.border, hasContacts]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close support options"
        >
          <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)' },
            ]}
          />
        </Pressable>

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: 14 + insets.bottom,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.title, { color: colors.text }]}>Help & Support</Text>
          </View>

          <SupportOption
            icon="search-outline"
            title="Search for Help"
            subtitle="Browse answers in the help center."
            onPress={onSearchHelp}
          />
          <SupportOption
            icon="chatbubbles-outline"
            title="Messages"
            subtitle="View your support tickets and chat with support."
            onPress={onMessages}
          />

          {divider}

          {whatsappValue ? (
            <SupportContactOption
              title="Chat us on WhatsApp"
              subtitle={whatsappValue}
              rightIcon="logo-whatsapp"
              onPress={openWhatsApp}
            />
          ) : null}

          {emailValue ? (
            <SupportContactOption
              title="Email Support"
              subtitle={emailValue}
              rightIcon="mail-outline"
              onPress={openEmail}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  handle: {
    width: 46,
    height: 4,
    borderRadius: 99,
    opacity: 0.9,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  option: {
    minHeight: 70,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.55,
    marginVertical: 8,
    marginHorizontal: 6,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default SupportDrawer;
