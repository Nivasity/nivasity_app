import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { BellaCard, BellaMessage, bellaAPI } from '../services/api';

// Support is a chat with Bella (Nivasity's assistant, a Cloudflare Worker). She finds materials,
// adds them to the cart and shows "Go to checkout"; the student pays there with their PIN.
// When she hands over, a teammate replies in the same chat (polled while the screen is open).
const naira = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const when = (v: string) => {
  const d = new Date(v.replace(' ', 'T') + 'Z');
  return `${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}, ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
};
const SUGGESTIONS = ['Find my course materials', "What's in my cart?", 'Where is my receipt?', 'How do I fund my wallet?'];

// Bella's links are web routes; open the matching app screen.
const openPath = (navigation: any, path: string) => {
  const [, a, b] = path.split('?')[0].split('/');
  if (a === 'checkout') return navigation.navigate('Checkout');
  if (a === 'store') return navigation.navigate('StudentMain', { screen: 'Store' });
  if (a === 'material' && b) return navigation.navigate('StudentMain', { screen: 'Store', params: { materialId: decodeURIComponent(b) } });
  if (a === 'orders' && b) return navigation.navigate('OrderReceipt', { txRef: decodeURIComponent(b) });
  if (a === 'orders') return navigation.navigate('StudentMain', { screen: 'Orders' });
  if (a === 'wallet' && b === 'fund') return navigation.navigate('WalletFund');
  if (a === 'wallet' && b === 'pin') return navigation.navigate('WalletPin');
  if (a === 'wallet') return navigation.navigate('WalletTransactions');
  if (a === 'profile' && b === 'edit') return navigation.navigate('ProfileEdit');
  if (a === 'notifications') return navigation.navigate('Notifications');
  return navigation.navigate('StudentMain', { screen: 'Profile' });
};

const BellaScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<BellaMessage[]>([]);
  const [status, setStatus] = useState('bella');
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef(0);
  const listRef = useRef<FlatList<BellaMessage>>(null);

  const merge = useCallback((incoming: BellaMessage[]) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      lastId.current = next.length ? next[next.length - 1].id : 0;
      return next;
    });
  }, []);

  useEffect(() => {
    bellaAPI
      .history()
      .then((r) => {
        setStatus(r.status);
        merge(r.messages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [merge]);

  // A teammate may reply: check for new messages while the chat is open
  useEffect(() => {
    const t = setInterval(() => {
      if (sending || AppState.currentState !== 'active') return;
      bellaAPI
        .history(lastId.current)
        .then((r) => {
          setStatus(r.status);
          merge(r.messages);
        })
        .catch(() => undefined);
    }, status === 'waiting' || status === 'human' ? 8000 : 30000);
    return () => clearInterval(t);
  }, [status, sending, merge]);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length, sending]);

  const send = async (msg: string) => {
    const body = msg.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    setText('');
    try {
      const r = await bellaAPI.send(body);
      setStatus(r.status);
      merge(r.messages);
    } catch (e: any) {
      setText(body);
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const human = status === 'waiting' || status === 'human';

  const renderCard = (card: BellaCard, i: number) => {
    const press = () => openPath(navigation, card.path);
    if (card.type === 'checkout') {
      return (
        <TouchableOpacity key={i} onPress={press} style={[styles.cardBtn, { backgroundColor: colors.accent }]}>
          <AppIcon name="cart-outline" size={18} color={colors.onAccent} />
          <Text style={[styles.cardBtnText, { color: colors.onAccent }]}>Go to checkout</Text>
          <Text style={[styles.cardBtnText, { color: colors.onAccent }]}>{naira(card.total)}</Text>
        </TouchableOpacity>
      );
    }
    const label =
      card.type === 'material'
        ? `${card.course_code} · ${card.title}`
        : card.type === 'fund_wallet'
          ? 'Fund wallet'
          : card.label;
    const sub =
      card.type === 'material' ? (card.bought ? 'Already bought' : naira(card.price)) : card.type === 'fund_wallet' && card.shortfall > 0 ? `${naira(card.shortfall)} more needed` : '';
    const icon = card.type === 'material' ? 'book-outline' : card.type === 'fund_wallet' ? 'wallet-outline' : 'arrow-forward';
    return (
      <TouchableOpacity key={i} onPress={press} style={[styles.cardBtn, { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface }]}>
        <AppIcon name={icon} size={18} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.cardBtnText, { color: colors.text }]}>{label}</Text>
          {!!sub && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{sub}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item: m }: { item: BellaMessage }) => {
    if (m.role === 'system') {
      return <Text style={[styles.system, { color: colors.textMuted }]}>{m.content}</Text>;
    }
    const mine = m.role === 'student';
    return (
      <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <View style={{ maxWidth: '85%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {m.role === 'agent' && <Text style={[styles.agent, { color: colors.textMuted }]}>{m.agent_name || 'Nivasity team'}</Text>}
          <View
            style={[
              styles.bubble,
              mine
                ? { backgroundColor: colors.accent, borderBottomRightRadius: 6 }
                : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 6 },
            ]}
          >
            <Text style={{ color: mine ? colors.onAccent : colors.text, fontSize: 15 }}>{m.content}</Text>
          </View>
          {m.cards.length > 0 && <View style={styles.cards}>{m.cards.map(renderCard)}</View>}
          <Text style={[styles.time, { color: colors.textMuted }]}>{when(m.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Back">
          <AppIcon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <AppIcon name={human ? 'headset-outline' : 'sparkles'} size={18} color={colors.onAccent} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.text }]}>{human ? 'Nivasity team' : 'Bella'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {status === 'waiting' ? 'A teammate will reply here' : status === 'human' ? "You're chatting with the team" : 'Your Nivasity assistant'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SupportTickets')} style={styles.iconBtn}>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Past tickets</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.hello, { color: colors.text }]}>Hi, I'm Bella 👋</Text>
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                  I can find your materials, add them to your cart, and help with your wallet, orders and receipts.
                </Text>
                <View style={styles.chips}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity key={s} onPress={() => send(s)} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Text style={{ color: colors.text, fontSize: 13 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
            ListFooterComponent={
              sending ? (
                <View style={styles.typing}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{human ? 'Sending…' : 'Bella is typing…'}</Text>
                </View>
              ) : null
            }
          />
        )}

        {!!error && <Text style={[styles.error, { color: '#dc2626' }]}>{error}</Text>}
        <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={human ? 'Write to the team…' : 'Ask Bella…'}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1500}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
          />
          <TouchableOpacity
            onPress={() => send(text)}
            disabled={sending || !text.trim()}
            style={[styles.sendBtn, { backgroundColor: colors.accent, opacity: sending || !text.trim() ? 0.5 : 1 }]}
            accessibilityLabel="Send"
          >
            {sending ? <ActivityIndicator size="small" color={colors.onAccent} /> : <AppIcon name="send" size={18} color={colors.onAccent} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { padding: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  list: { padding: 16, gap: 14, flexGrow: 1 },
  row: { flexDirection: 'row' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  agent: { fontSize: 11, fontWeight: '600', marginBottom: 4, marginLeft: 4 },
  time: { fontSize: 10, marginTop: 4, marginHorizontal: 4 },
  system: { textAlign: 'center', fontSize: 11, fontWeight: '600' },
  cards: { marginTop: 8, gap: 8, width: 280, maxWidth: '100%' },
  cardBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 11 },
  cardBtnText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  hello: { fontSize: 20, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  error: { paddingHorizontal: 16, paddingBottom: 6, fontSize: 13, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export default BellaScreen;
