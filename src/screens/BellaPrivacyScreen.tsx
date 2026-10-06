import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Text from '../components/AppText';
import AppIcon from '../components/AppIcon';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { BELLA_PRIVACY_URL, bellaAPI } from '../services/api';

// Profile > Security > Bella & your data: what Bella can see, when the student agreed, and deleting
// their chat history. Bella cannot be turned off: she is how students reach support.
const BellaPrivacyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [state, setState] = useState<{ accepted: boolean; accepted_at: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      setConfirming(false);
      bellaAPI
        .consentStatus()
        .then(setState)
        .catch((e) => setError(e.message));
    }, []),
  );

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await bellaAPI.deleteHistory();
      setConfirming(false);
      appMessage.toast({ status: 'success', message: 'Your Bella chat history is deleted.' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const since = state?.accepted_at
    ? new Date(state.accepted_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <AppIcon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bella & your data</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={{ color: colors.textMuted, lineHeight: 21 }}>
          Bella answers your support questions and can look up your cart, wallet, transactions and purchases to help. She never sees your PIN or password.
          Chats are kept for 7 days and the Nivasity team can read them.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL(BELLA_PRIVACY_URL)}>
          <Text style={{ color: colors.accent, fontWeight: '700', marginTop: 8 }}>Read the Privacy Policy</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!state && !error ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            {state?.accepted && since ? <Text style={{ color: colors.text, marginBottom: 14 }}>You agreed to the Bella terms on {since}.</Text> : null}
            {confirming ? (
              <View style={[styles.confirm, { borderColor: 'rgba(220,38,38,0.45)' }]}>
                <Text style={{ color: colors.text, lineHeight: 20 }}>
                  This deletes your Bella messages, attachments, handovers and the notes Bella keeps about your past chats.{' '}
                  <Text style={{ color: '#dc2626', fontWeight: '800' }}>This can't be undone.</Text>
                </Text>
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => setConfirming(false)} disabled={busy} style={[styles.btn, styles.outline, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={remove} disabled={busy} style={[styles.btn, { backgroundColor: colors.text, opacity: busy ? 0.6 : 1 }]}>
                    {busy ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontWeight: '800' }}>Delete</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setConfirming(true)} style={[styles.mainBtn, { backgroundColor: colors.text }]} accessibilityRole="button">
                <AppIcon name="trash-outline" size={18} color={colors.background} />
                <Text style={{ color: colors.background, fontWeight: '800', fontSize: 15 }}>Delete my chat history</Text>
              </TouchableOpacity>
            )}
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10 }}>Bella stays available for support. Payments and orders are not affected.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { padding: 16 },
  card: { marginTop: 20, borderWidth: 1, borderRadius: 20, padding: 16 },
  confirm: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 12 },
  outline: { borderWidth: 1 },
  mainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 14 },
  error: { color: '#dc2626', fontWeight: '600', marginTop: 16 },
});

export default BellaPrivacyScreen;
