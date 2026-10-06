import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
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
            <View style={styles.switchRow}>
              <Text style={{ color: colors.text, flex: 1 }}>Also delete my chat history, attachments and the notes Bella keeps about past chats</Text>
              <Switch value={deleteHistory} onValueChange={setDeleteHistory} trackColor={{ true: colors.accent }} />
            </View>
            <Button title={busy ? 'Turning off...' : 'Turn off Bella'} onPress={turnOff} disabled={busy} />
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
  error: { color: '#dc2626', fontWeight: '600', marginTop: 16 },
});

export default BellaPrivacyScreen;
