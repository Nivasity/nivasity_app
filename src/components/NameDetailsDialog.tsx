import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import AppText from './AppText';
import Button from './Button';
import Input from './Input';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { profileAPI } from '../services/api';

// Google sign-up uses the name on the Google account, which is sometimes just the email
// username (e.g. "Info2abdurahmon2025") or has no surname. Such students confirm their real
// first and last name once (it goes on their receipts). Shown before the academic details.
export const nameNeedsFix = (first?: string | null, last?: string | null) => {
  const f = String(first || '').trim();
  const l = String(last || '').trim();
  return !f || !l || /[\d@_]/.test(f + l);
};

const cleanName = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s'-])\S/g, (c) => c.toUpperCase());

const NameDetailsDialog = () => {
  const { colors, isDark } = useTheme();
  const appMessage = useAppMessage();
  const { user, updateUser, logout } = useAuth();
  const visible = !!user && nameNeedsFix(user.firstName, user.lastName);

  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [errors, setErrors] = useState<{ first?: string; last?: string }>({});
  const [saving, setSaving] = useState(false);

  // Prefill what looks like a real name; leave out usernames with digits
  useEffect(() => {
    if (!visible || !user) return;
    setFirst(/[\d@_]/.test(user.firstName || '') ? '' : user.firstName || '');
    setLast(/[\d@_]/.test(user.lastName || '') ? '' : user.lastName || '');
  }, [visible, user]);

  const save = async () => {
    const f = cleanName(first);
    const l = cleanName(last);
    const next: typeof errors = {};
    if (!f) next.first = 'Enter your first name';
    else if (/[\d@_]/.test(f)) next.first = 'Use your real name, without numbers or symbols';
    if (!l) next.last = 'Enter your last name';
    else if (/[\d@_]/.test(l)) next.last = 'Use your real name, without numbers or symbols';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const updated = await profileAPI.updateProfile({ firstName: f, lastName: l });
      updateUser({ ...user!, ...updated, firstName: updated?.firstName || f, lastName: updated?.lastName || l, name: `${updated?.firstName || f} ${updated?.lastName || l}` });
      appMessage.toast({ status: 'success', message: `Thanks, ${updated?.firstName || f}!` });
    } catch (error: any) {
      appMessage.alert({ title: 'Error', message: error?.response?.data?.message || error?.message || 'Could not save your name' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} accessible={false}>
          <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)' }]} />
        </Pressable>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={[styles.title, { color: colors.text }]}>What's your name?</AppText>
          <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
            Your Google account didn't give us your full name. Add it as it appears on your school records; it goes on your receipts.
          </AppText>
          <Input label="First name" value={first} onChangeText={setFirst} errorText={errors.first} autoCapitalize="words" autoComplete="name-given" />
          <Input label="Last name" value={last} onChangeText={setLast} errorText={errors.last} autoCapitalize="words" autoComplete="name-family" />
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => logout()} activeOpacity={0.85}>
              <AppText style={[styles.actionLink, { color: colors.textMuted }]}>Sign out</AppText>
            </TouchableOpacity>
            <Button title={saving ? 'Saving...' : 'Save'} onPress={save} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18 },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  subtitle: { marginTop: 6, marginBottom: 14, fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 2 },
  actionLink: { fontSize: 14, fontWeight: '800' },
});

export default NameDetailsDialog;
