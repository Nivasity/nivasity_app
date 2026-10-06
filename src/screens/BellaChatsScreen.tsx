import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import Text from '../components/AppText';
import AppIcon from '../components/AppIcon';
import BellaRateCard from '../components/BellaRateCard';
import { useTheme } from '../contexts/ThemeContext';
import { BellaMessage, BellaSession, bellaAPI } from '../services/api';

// Bella menu > Chat history: past sessions (read-only) and one session's messages.
const when = (v: string) => {
  const d = new Date(v.replace(' ', 'T') + 'Z');
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

const Header: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.back} accessibilityLabel="Back">
        <AppIcon name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
};

export const BellaChatsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [items, setItems] = useState<BellaSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      bellaAPI
        .sessions()
        .then((r) => {
          setItems(r);
          setError(null);
        })
        .catch((e) => {
          setItems([]);
          setError(e.message);
        });
    }, []),
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Header title="Chat history" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={{ color: colors.textMuted, marginBottom: 14 }}>Your chats from the last 7 days. Ended chats are read-only.</Text>
        <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {items === null ? (
            <ActivityIndicator color={colors.accent} style={{ margin: 20 }} />
          ) : items.length === 0 ? (
            <Text style={{ color: colors.textMuted, padding: 16 }}>{error || 'No chats yet.'}</Text>
          ) : (
            items.map((s, i) => {
              const open = !s.ended_at;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => (open ? navigation.navigate('Bella') : navigation.navigate('BellaChat', { id: s.id }))}
                  style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                >
                  <AppIcon name="chatbubble-ellipses-outline" size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>{s.preview || 'Chat'}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>
                      <Text style={{ color: open ? '#059669' : colors.textMuted, fontWeight: '800' }}>{open ? 'Current chat' : 'Ended'}</Text>
                      {` · ${when(s.started_at)}`}
                      {s.rating ? ` · ★ ${s.rating}/5` : ''}
                    </Text>
                  </View>
                  <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export const BellaChatScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const id = Number(route?.params?.id || 0);
  const [data, setData] = useState<{ session: BellaSession; messages: BellaMessage[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      bellaAPI
        .session(id)
        .then(setData)
        .catch((e) => setError(e.message));
    }, [id]),
  );

  const rate = async (rating: number, comment: string) => {
    if (!data) return;
    await bellaAPI.rate(rating, comment, data.session.id);
    setData({ ...data, session: { ...data.session, rating } });
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Header title={data?.session.preview || 'Chat'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.body, { gap: 12 }]}>
        {error ? <Text style={{ color: '#dc2626' }}>{error}</Text> : null}
        {!data && !error ? <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /> : null}
        {data ? (
          <>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{when(data.session.started_at)} · ended, read-only</Text>
            {data.messages.length === 0 ? <Text style={{ color: colors.textMuted }}>These messages were deleted after 7 days.</Text> : null}
            {data.messages.map((m) => {
              if (m.role === 'system') {
                return (
                  <Text key={m.id} style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
                    {m.content}
                  </Text>
                );
              }
              const mine = m.role === 'student';
              return (
                <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'agent' ? <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>{m.agent_name || 'Nivasity team'}</Text> : null}
                  <View
                    style={[
                      styles.bubble,
                      mine ? { backgroundColor: colors.accent } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                    ]}
                  >
                    {m.content ? <Text style={{ color: mine ? colors.onAccent : colors.text }}>{m.content}</Text> : null}
                    {m.attachment ? (
                      <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(m.attachment!.url)} style={{ marginTop: m.content ? 8 : 0 }}>
                        {m.attachment.type.startsWith('image/') ? (
                          <Image source={{ uri: m.attachment.url }} style={{ width: 180, height: 180, borderRadius: 12 }} />
                        ) : (
                          <Text style={{ color: mine ? colors.onAccent : colors.accent, fontWeight: '700' }}>📎 {m.attachment.name}</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}>{when(m.created_at)}</Text>
                </View>
              );
            })}
            <BellaRateCard rated={data.session.rating ?? undefined} onRate={rate} />
            <TouchableOpacity onPress={() => navigation.navigate('Bella')} style={[styles.newChat, { backgroundColor: colors.accent }]}>
              <AppIcon name="chatbubble-ellipses" size={18} color={colors.onAccent} />
              <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Start a new chat with Bella</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 6 },
  title: { fontSize: 17, fontWeight: '700', flex: 1 },
  body: { padding: 16 },
  list: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  newChat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 13, marginTop: 6 },
});
