import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import AppIcon from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { BELLA_PRIVACY_URL, BELLA_TERMS_URL, BellaCard, BellaMessage, bellaAPI } from '../services/api';

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
  const [file, setFile] = useState<{ uri: string; name: string; type: string; size?: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<{ required: boolean; version: string }>({ required: false, version: '' });
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastId = useRef(0);
  const listRef = useRef<FlatList<BellaMessage>>(null);

  const merge = useCallback((incoming: BellaMessage[]) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      // Once the saved copy of the student's message arrives, drop the on-screen placeholder
      const base = incoming.some((m) => m.role === 'student') ? prev.filter((m) => m.id > 0) : prev;
      const next = [...base, ...incoming.filter((m) => !seen.has(m.id))];
      const real = next.filter((m) => m.id > 0);
      lastId.current = real.length ? real[real.length - 1].id : 0;
      return next;
    });
  }, []);

  useEffect(() => {
    bellaAPI
      .history()
      .then((r) => {
        setStatus(r.status);
        setConsent({ required: !!r.consent_required, version: r.consent_version || '' });
        merge(r.messages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [merge]);

  // Live updates: keep one long-poll open while the chat is on screen, so team replies and status
  // changes show within about 2 seconds
  const statusRef = useRef(status);
  statusRef.current = status;
  useEffect(() => {
    let alive = true;
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      while (alive) {
        if (AppState.currentState !== 'active' || !lastId.current) {
          await pause(2000);
          continue;
        }
        try {
          const r = await bellaAPI.history(lastId.current, { wait: 20, status: statusRef.current });
          if (!alive) break;
          setStatus(r.status);
          merge(r.messages);
        } catch {
          await pause(5000);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [merge]);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length, sending]);

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if ((a.size || 0) > 5 * 1024 * 1024) {
      setError('That file is too big. The limit is 5 MB.');
      return;
    }
    const ext = (a.name.split('.').pop() || '').toLowerCase();
    const type = a.mimeType || (ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    setError(null);
    setFile({ uri: a.uri, name: a.name, type, size: a.size });
  };

  const send = async (msg: string, attach: typeof file = null) => {
    const body = msg.trim();
    if ((!body && !attach) || sending) return;
    setSending(true);
    setError(null);
    setText('');
    setFile(null);
    // Show the student's message right away; the saved copy replaces it when Bella answers
    const tempId = -Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: 'student',
        content: body,
        cards: [],
        attachment: attach ? { name: attach.name, type: attach.type, size: attach.size || 0, url: attach.uri } : null,
        agent_name: null,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
    ]);
    const dropTemp = () => setMessages((prev) => prev.filter((m) => m.id !== tempId));
    try {
      const r = await bellaAPI.send(body, attach ? { uri: attach.uri, name: attach.name, type: attach.type } : null);
      dropTemp();
      setStatus(r.status);
      merge(r.messages);
    } catch (e: any) {
      dropTemp();
      if (e.code === 'consent_required') setConsent((c) => ({ ...c, required: true }));
      setText(body);
      setFile(attach);
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await bellaAPI.consent(consent.version);
      setConsent((c) => ({ ...c, required: false }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAccepting(false);
    }
  };

  const human = status === 'waiting' || status === 'human';

  // The student confirms a swap Bella proposed; the card turns into "Swapped" / "Not swapped"
  const [confirming, setConfirming] = useState<string | null>(null);
  const confirmAction = async (token: string) => {
    setConfirming(token);
    setError(null);
    try {
      const r = await bellaAPI.action(token);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === r.updated_message_id
            ? { ...m, cards: m.cards.map((c) => (c.type === 'confirm_change' && c.token === token ? { ...c, token: '', status: r.ok ? 'done' : 'failed' } : c)) }
            : m,
        ),
      );
      merge(r.messages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirming(null);
    }
  };

  const renderCard = (card: BellaCard, i: number) => {
    if (card.type === 'confirm_change') {
      const busy = confirming === card.token;
      return (
        <View key={i} style={[styles.swapCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>SWAP MATERIAL</Text>
          <Text style={{ color: colors.textMuted, marginTop: 8, textDecorationLine: 'line-through' }}>{card.from.course_code} · {card.from.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <AppIcon name="arrow-forward" size={16} color={colors.accent} />
            <Text style={{ color: colors.text, fontWeight: '700', flexShrink: 1 }}>{card.to.course_code} · {card.to.title}</Text>
          </View>
          {card.status === 'done' ? (
            <Text style={{ color: '#059669', fontWeight: '800', marginTop: 10 }}>Swapped</Text>
          ) : card.status === 'failed' ? (
            <Text style={{ color: colors.textMuted, fontWeight: '800', marginTop: 10 }}>Not swapped</Text>
          ) : (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Same price, nothing to pay. A purchase can only be swapped once.</Text>
              <TouchableOpacity
                onPress={() => confirmAction(card.token)}
                disabled={!!confirming}
                style={[styles.cardBtn, { backgroundColor: colors.accent, justifyContent: 'center', marginTop: 10, opacity: confirming ? 0.6 : 1 }]}
              >
                {busy ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Text style={[styles.cardBtnText, { color: colors.onAccent }]}>Confirm swap</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    }
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
            {!!m.content && <Text style={{ color: mine ? colors.onAccent : colors.text, fontSize: 15 }}>{m.content}</Text>}
            {m.attachment && (
              <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(m.attachment!.url)} style={{ marginTop: m.content ? 8 : 0 }}>
                {m.attachment.type.startsWith('image/') ? (
                  <Image source={{ uri: m.attachment.url }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.fileRow}>
                    <AppIcon name="document-attach-outline" size={16} color={mine ? colors.onAccent : colors.accent} />
                    <Text numberOfLines={1} style={{ color: mine ? colors.onAccent : colors.accent, fontWeight: '600', flexShrink: 1 }}>{m.attachment.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
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
          <AppIcon name="chatbubble-ellipses" size={18} color={colors.onAccent} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.text }]}>Bella</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
            {status === 'waiting' ? "Passed to the Nivasity team · they'll reply here" : status === 'human' ? 'The Nivasity team is in this chat' : 'Your Nivasity assistant'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconBtn} accessibilityLabel="Bella menu">
          <AppIcon name="ellipsis-vertical" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { icon: 'time-outline' as const, label: 'My handovers & tickets', to: 'BellaHistory' },
              { icon: 'book-outline' as const, label: 'Help articles', to: 'BellaHelp' },
              { icon: 'settings-outline' as const, label: 'Bella settings', to: 'BellaPrivacy' },
            ].map((item) => (
              <TouchableOpacity
                key={item.to}
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  navigation.navigate(item.to);
                }}
              >
                <AppIcon name={item.icon} size={18} color={colors.accent} />
                <Text style={{ color: colors.text, fontWeight: '600' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : consent.required ? (
          <View style={styles.list}>
            <View style={[styles.consent, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="shield-checkmark-outline" size={20} color={colors.accent} />
                <Text style={[styles.title, { color: colors.text }]}>Before you chat with Bella</Text>
              </View>
              {[
                'Bella is an AI assistant. She can make mistakes, so check items and amounts before you pay.',
                'To help you, she can look up your profile, cart, wallet, transactions and purchases. Never your PIN or password.',
                'Messages and the photos or PDFs you attach are processed by our AI provider (Google) and kept for 7 days. The Nivasity team can read them and is alerted when Bella hands your chat over.',
                'Never share your PIN or password in a chat.',
              ].map((t) => (
                <Text key={t} style={{ color: colors.textMuted, marginTop: 8, lineHeight: 20 }}>{`•  ${t}`}</Text>
              ))}
              <View style={styles.agreeRow}>
                <TouchableOpacity
                  onPress={() => setAgreed(!agreed)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreed }}
                  style={[styles.checkbox, { borderColor: agreed ? colors.accent : colors.textMuted, backgroundColor: agreed ? colors.accent : 'transparent' }]}
                >
                  {agreed ? <AppIcon name="checkmark" size={16} color={colors.onAccent} /> : null}
                </TouchableOpacity>
                <Text style={{ color: colors.text, flex: 1 }}>
                  I agree to the{' '}
                  <Text style={{ color: colors.accent, fontWeight: '700' }} onPress={() => Linking.openURL(BELLA_TERMS_URL)}>Terms</Text> and{' '}
                  <Text style={{ color: colors.accent, fontWeight: '700' }} onPress={() => Linking.openURL(BELLA_PRIVACY_URL)}>Privacy Policy</Text>, including how
                  Bella handles my data.
                </Text>
              </View>
              <TouchableOpacity
                onPress={accept}
                disabled={!agreed || accepting}
                style={[styles.cardBtn, { backgroundColor: colors.accent, justifyContent: 'center', opacity: !agreed || accepting ? 0.5 : 1 }]}
              >
                {accepting ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Text style={[styles.cardBtnText, { color: colors.onAccent }]}>Start chatting</Text>}
              </TouchableOpacity>
            </View>
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
        {!consent.required && file && (
          <View style={[styles.filePill, { backgroundColor: colors.surfaceAlt }]}>
            <AppIcon name="attach" size={14} color={colors.text} />
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>{file.name}</Text>
            <TouchableOpacity onPress={() => setFile(null)} accessibilityLabel="Remove attachment">
              <AppIcon name="close" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputBar, { borderTopColor: colors.border }, consent.required && { display: 'none' }]}>
          <TouchableOpacity onPress={pickFile} style={styles.attachBtn} accessibilityLabel="Attach a photo or PDF">
            <AppIcon name="attach" size={22} color={colors.textMuted} />
          </TouchableOpacity>
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
            onPress={() => send(text, file)}
            disabled={sending || (!text.trim() && !file)}
            style={[styles.sendBtn, { backgroundColor: colors.accent, opacity: sending || (!text.trim() && !file) ? 0.5 : 1 }]}
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
  consent: { borderWidth: 1, borderRadius: 20, padding: 16 },
  swapCard: { borderWidth: 1, borderRadius: 18, padding: 14 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  menu: { position: 'absolute', top: 70, right: 12, borderWidth: 1, borderRadius: 16, paddingVertical: 6, minWidth: 240 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  attachBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  image: { width: 200, height: 200, borderRadius: 12 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 12, marginBottom: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '90%' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export default BellaScreen;
