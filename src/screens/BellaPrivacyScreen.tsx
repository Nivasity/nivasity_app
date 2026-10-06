import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Text from '../components/AppText';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { BELLA_PRIVACY_URL, bellaAPI } from '../services/api';

// Profile > Security > Bella AI assistant: see whether Bella is on, turn her off (optionally deleting
// the chat history), or turn her on again (through the consent screen in the chat).
const BellaPrivacyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [state, setState] = useState<{ accepted: boolean; accepted_at: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteHistory, setDeleteHistory] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      bellaAPI
        .consentStatus()
        .then(setState)
        .catch((e) => setError(e.message));
    }, []),
  );

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await bellaAPI.withdraw(deleteHistory);
      setState({ accepted: false, accepted_at: null });
      setDeleteHistory(false);
      appMessage.toast({ status: 'success', message: r.deleted ? 'Bella is off and your chat history is deleted.' : 'Bella is off.' });
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
        <Text style={[styles.title, { color: colors.text }]}>Bella AI assistant</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={{ color: colors.textMuted, lineHeight: 21 }}>
          Bella answers support questions and can look up your cart, wallet, transactions and purchases to help. She never sees your PIN or password. Chats are
          kept for 7 days and the Nivasity team can read them.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL(BELLA_PRIVACY_URL)}>
          <Text style={{ color: colors.accent, fontWeight: '700', marginTop: 8 }}>Read the Privacy Policy</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!state && !error ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : state?.accepted ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              <Text style={{ color: '#059669', fontWeight: '800' }}>On</Text>
              {since ? ` since ${since}` : ''}
            </Text>
            <TouchableOpacity
              onPress={() => setDeleteHistory(!deleteHistory)}
              style={styles.checkRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: deleteHistory }}
            >
              <View style={[styles.checkbox, { borderColor: deleteHistory ? '#dc2626' : colors.textMuted, backgroundColor: deleteHistory ? '#dc2626' : 'transparent' }]}>
                {deleteHistory ? <AppIcon name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text }}>Also delete my chat history, attachments and the notes Bella keeps about past chats</Text>
                {deleteHistory ? (
                  <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '700', marginTop: 4 }}>Your chat history will be deleted. This can't be undone.</Text>
                ) : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={turnOff}
              disabled={busy}
              style={[styles.offBtn, { backgroundColor: colors.text, opacity: busy ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color={colors.background} /> : <AppIcon name="power" size={18} color={colors.background} />}
              <Text style={[styles.offText, { color: colors.background }]}>{busy ? 'Turning off…' : 'Turn off Bella'}</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10 }}>
              You can turn her back on any time from Help & Support. Payments and orders are not affected.
            </Text>
          </View>
        ) : state ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.text, marginBottom: 14 }}>
              <Text style={{ fontWeight: '800' }}>Off. </Text>
              You'll be asked to agree before chatting with Bella.
            </Text>
            <Button title="Turn on Bella" onPress={() => navigation.navigate('Bella')} />
          </View>
        ) : null}
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
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginVertical: 14 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  error: { color: '#dc2626', fontWeight: '600', marginTop: 16 },
  offBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 14 },
  offText: { fontWeight: '800', fontSize: 15 },
});

export default BellaPrivacyScreen;
