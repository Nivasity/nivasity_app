import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import Text from '../components/AppText';
import AppIcon from '../components/AppIcon';
import BellaRateCard from '../components/BellaRateCard';
import BellaAvatar from '../components/BellaAvatar';
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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'team', label: 'With the team' },
  { key: 'ended', label: 'Ended' },
] as const;

export const BellaChatsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [items, setItems] = useState<BellaSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');

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
        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityState={{ selected: on }}
                style={[styles.filter, on ? { backgroundColor: colors.text, borderColor: colors.text } : { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: on ? colors.background : colors.text, fontWeight: '800', fontSize: 13 }}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {items === null ? (
          <ActivityIndicator color={colors.accent} style={{ margin: 20 }} />
        ) : (
          (() => {
            const shown = items.filter((s) =>
              filter === 'team' ? s.end_reason === 'resolved' : filter === 'ended' ? !!s.ended_at && s.end_reason !== 'resolved' : true,
            );
            if (!shown.length) {
              return (
                <View style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.textMuted }}>{error || 'No chats here yet.'}</Text>
                </View>
              );
            }
            return shown.map((s) => {
              const open = !s.ended_at;
              const team = s.end_reason === 'resolved';
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => (open ? navigation.navigate('Bella') : navigation.navigate('BellaChat', { id: s.id }))}
                  style={[
                    styles.item,
                    open
                      ? { borderColor: 'rgba(168,85,199,0.45)', backgroundColor: 'rgba(107,45,116,0.12)' }
                      : { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                >
                  {team ? (
                    <View style={[styles.teamIcon, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
                      <AppIcon name="people-outline" size={20} color="#d97706" />
                    </View>
                  ) : (
                    <BellaAvatar size={44} animated={false} />
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '800', flexShrink: 1 }}>{s.preview || 'Chat'}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{when(s.started_at)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <View style={[styles.tag, { backgroundColor: open || team ? colors.successSoft : colors.surfaceAlt }]}>
                        <Text style={{ color: open || team ? colors.success : colors.textMuted, fontSize: 11, fontWeight: '800' }}>
                          {open ? 'Open' : team ? 'Resolved by team' : 'Ended'}
                        </Text>
                      </View>
                      {s.rating ? (
                        <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '800' }}>★ {s.rating}</Text>
                      ) : !open ? (
                        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>Not rated</Text>
                      ) : null}
                    </View>
                  </View>
                  <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            });
          })()
        )}
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Ended chats are read-only and kept for 7 days. You can delete your history in Bella settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export const BellaChatScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const id = Number(route?.params?.id || 0);
  const [data, setData] = useState<{ session: BellaSession; messages: BellaMessage[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const opened = useRef(false);

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
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.body, { gap: 12 }]}
        onContentSizeChange={() => {
          // Open at the latest message, like the live chat
          if (data && !opened.current) {
            opened.current = true;
            scrollRef.current?.scrollToEnd({ animated: false });
          }
        }}
      >
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
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10 },
  teamIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
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
