import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { BELLA_PRIVACY_URL, BELLA_TERMS_URL, BellaCard, BellaMessage, bellaAPI, cartAPI, paymentAPI } from '../services/api';
import PinConfirmSheet from '../components/PinConfirmSheet';
import BellaWalletCard from '../components/BellaWalletCard';
import BellaRateCard from '../components/BellaRateCard';
import BellaAvatar, { BellaGradient } from '../components/BellaAvatar';

// Support is a chat with Bella (Nivasity's assistant, a Cloudflare Worker). She finds materials,
// adds them to the cart and shows "Go to checkout"; the student pays there with their PIN.
// When she hands over, a teammate replies in the same chat (polled while the screen is open).
const naira = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const when = (v: string) => {
  const d = new Date(v.replace(' ', 'T') + 'Z');
  return `${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}, ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
};
const SINGLE_CARDS = new Set(['checkout', 'fund_wallet', 'pay_wallet', 'wallet_account']);
const QUICK_REPLIES = ["What's in my cart?", 'Fund my wallet', 'My receipts'];
const PLUM = { border: 'rgba(168,85,199,0.45)', fill: 'rgba(107,45,116,0.14)', text: '#6b2d74', textDark: '#f0d4f7' };

// Three dots that bounce while Bella writes
const TypingDots: React.FC<{ color: string }> = ({ color }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', height: 12 }}>
      {[0, 0.12, 0.24].map((d) => (
        <Animated.View
          key={d}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            opacity: v.interpolate({ inputRange: [0, d, d + 0.25, d + 0.5, 1], outputRange: [0.4, 0.4, 1, 0.4, 0.4] }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, d, d + 0.25, d + 0.5, 1], outputRange: [0, 0, -4, 0, 0] }) }],
          }}
        />
      ))}
    </View>
  );
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
  if (a === 'material-requests') return navigation.navigate('MaterialRequests');
  return navigation.navigate('StudentMain', { screen: 'Profile' });
};

const BellaScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
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

  // Live updates. Bella's own replies come back with each message, so waiting is only needed for
  // the team: while they have the chat, one long-poll stays open (replies show in ~2 s). With
  // Bella, a check about once a minute catches rare events (a teammate joining, the chat ending).
  // No checks once the chat has ended, or after 15 minutes without a tap or keypress (any
  // interaction resumes them). Keeps Worker requests down.
  const statusRef = useRef(status);
  statusRef.current = status;
  const lastActive = useRef(Date.now());
  useEffect(() => {
    lastActive.current = Date.now();
  }, [text, messages.length]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') lastActive.current = Date.now();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    let alive = true;
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      while (alive) {
        const st = statusRef.current;
        const idle = Date.now() - lastActive.current > 15 * 60_000;
        if (AppState.currentState !== 'active' || !lastId.current || st === 'resolved' || idle) {
          await pause(2000);
          continue;
        }
        try {
          const r = await bellaAPI.history(lastId.current, { wait: 20, status: st });
          if (!alive) break;
          setStatus(r.status);
          statusRef.current = r.status;
          merge(r.messages);
        } catch {
          await pause(5000);
        }
        // With Bella: rest about a minute between checks (cut short if the team takes over)
        for (let t = 0; alive && t < 40_000 && statusRef.current === 'bella'; t += 2000) await pause(2000);
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

  // Cart and wallet buttons show only on the latest message that has them (older copies hide)
  const latestCardOwner = useMemo(() => {
    const owner: Record<string, number> = {};
    for (const m of messages) for (const c of m.cards) if (SINGLE_CARDS.has(c.type)) owner[c.type] = m.id;
    return owner;
  }, [messages]);
  const lastStudentId = useMemo(() => messages.reduce((id, m) => (m.role === 'student' ? m.id : id), 0), [messages]);
  const visibleCards = (m: BellaMessage) =>
    m.cards.filter((c) => {
      if (SINGLE_CARDS.has(c.type)) return latestCardOwner[c.type] === m.id;
      // Goodbye rating card: gone once they tap Not yet or keep chatting
      if (c.type === 'rate_chat' && c.ends && !c.rating) return !c.dismissed && !(lastStudentId > m.id || lastStudentId < 0);
      return true;
    });
  // The chat ended (rated, or resolved by the team): no more messages in it, only a new chat
  const ended = status === 'resolved' && messages.length > 0;

  // Not yet: Bella's goodbye rating card goes away and the chat carries on
  const notYet = (messageId: number) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, cards: m.cards.map((c) => (c.type === 'rate_chat' ? { ...c, dismissed: true } : c)) } : m)));
    bellaAPI.notYet(messageId).catch(() => {});
  };

  // End chat: only the student's tap ends the session; then the divider and rating card arrive
  const [ending, setEnding] = useState(false);
  const endChat = async () => {
    setEnding(true);
    setError(null);
    try {
      const r = await bellaAPI.end();
      setStatus(r.status);
      setMessages((prev) =>
        prev.map((m) => (m.id === r.updated_message_id ? { ...m, cards: m.cards.map((c) => (c.type === 'end_chat' ? { ...c, status: 'ended' as const } : c)) } : m)),
      );
      merge(r.messages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnding(false);
    }
  };

  // Rate this chat: the card turns into the stars they gave
  const rateChat = async (rating: number, comment: string) => {
    setError(null);
    try {
      const r = await bellaAPI.rate(rating, comment);
      setStatus(r.status);
      const updated = new Map(r.messages.map((m) => [m.id, m]));
      setMessages((prev) =>
        prev.map(
          (m) =>
            updated.get(m.id) ??
            (m.id === r.updated_message_id ? { ...m, cards: m.cards.map((c) => (c.type === 'rate_chat' ? { ...c, rating: r.rating } : c)) } : m),
        ),
      );
      merge(r.messages);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Pay now: refresh the cart so the PIN sheet shows the real amount, then pay from the wallet
  // straight through the Nivasity API (the PIN never goes to Bella) and let Bella confirm
  const [pay, setPay] = useState<{ open: boolean; total: number; items: number }>({ open: false, total: 0, items: 0 });
  const openPay = async () => {
    setError(null);
    try {
      const c = await cartAPI.view();
      if (!c.totalItems) {
        setError('Your cart is empty.');
        return;
      }
      setPay({ open: true, total: Number(c.wallet?.walletTotalAmount ?? c.totalAmount ?? 0), items: Number(c.totalItems || 0) });
    } catch (e: any) {
      setError(e.message || 'Could not load your cart');
    }
  };
  const payNow = async (pin: string) => {
    let txRef = '';
    try {
      const p = await paymentAPI.initPayment({ paymentChannel: 'wallet', walletPin: pin });
      txRef = (p.tx_ref || '').trim();
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e?.message || 'Payment failed. Please try again.');
    }
    setPay((x) => ({ ...x, open: false }));
    if (!txRef) return;
    try {
      const r = await bellaAPI.paid(txRef);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === r.updated_message_id
            ? { ...m, cards: m.cards.filter((c) => c.type !== 'checkout').map((c) => (c.type === 'pay_wallet' ? { ...c, status: 'paid' as const } : c)) }
            : m,
        ),
      );
      merge(r.messages);
    } catch {
      /* paid; Bella's confirmation is optional */
    }
  };

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

  const renderCard = (card: BellaCard, i: number, messageId: number) => {
    if (card.type === 'end_chat') {
      if (card.status === 'ended') return null;
      return (
        <TouchableOpacity key={i} onPress={endChat} disabled={ending} style={[styles.cardBtn, { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, justifyContent: 'center' }]}>
          {ending ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={[styles.cardBtnText, { color: colors.text }]}>End chat</Text>}
        </TouchableOpacity>
      );
    }
    if (card.type === 'rate_chat') {
      return (
        <BellaRateCard
          key={i}
          rated={card.rating}
          onRate={rateChat}
          onExpand={() => listRef.current?.scrollToEnd({ animated: true })}
          title={card.by === 'team' ? 'How did the Nivasity team do?' : 'How did Bella do?'}
          onLater={card.ends && !card.rating ? () => notYet(messageId) : undefined}
        />
      );
    }
    if (card.type === 'wallet_account') {
      return <BellaWalletCard key={i} onOpenWallet={() => navigation.navigate('WalletTransactions')} onActivate={() => navigation.navigate('WalletFund')} />;
    }
    if (card.type === 'pay_wallet') {
      return card.status === 'paid' ? (
        <View key={i} style={[styles.cardBtn, { backgroundColor: 'rgba(5,150,105,0.12)' }]}>
          <AppIcon name="checkmark-circle" size={18} color="#059669" />
          <Text style={[styles.cardBtnText, { color: '#059669' }]}>Paid</Text>
        </View>
      ) : (
        <TouchableOpacity key={i} onPress={openPay} style={[styles.cardBtn, { backgroundColor: colors.accent, paddingVertical: 13 }]}>
          <AppIcon name="lock-closed" size={17} color={colors.onAccent} />
          <Text style={[styles.cardBtnText, { color: colors.onAccent, flex: 1 }]}>Pay with PIN</Text>
          <Text style={[styles.cardBtnText, { color: colors.onAccent }]}>{naira(card.total)}</Text>
        </TouchableOpacity>
      );
    }
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

  // Handover: amber pill. Resolved / ended: a divider. Anything else: small centred text.
  const renderSystem = (text: string) => {
    if (/^Handed to the Nivasity team/.test(text)) {
      return (
        <View style={[styles.notePill, { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.10)' }]}>
          <AppIcon name="people-outline" size={12} color="#d97706" />
          <Text style={{ color: '#d97706', fontSize: 11, fontWeight: '700' }}>{text}</Text>
        </View>
      );
    }
    const resolved = /^Marked as resolved/.test(text);
    if (resolved || /^Chat ended/.test(text)) {
      return (
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          {resolved ? <AppIcon name="checkmark-circle" size={13} color={colors.success} /> : null}
          <Text style={{ color: resolved ? colors.success : colors.textMuted, fontSize: 11, fontWeight: '700' }}>{resolved ? 'Resolved by the Nivasity team' : text}</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>
      );
    }
    return <Text style={[styles.system, { color: colors.textMuted }]}>{text}</Text>;
  };

  // Search results: one card with a row per material
  const renderMaterials = (cards: BellaCard[]) => (
    <View style={[styles.resultCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {cards.map((c, i) =>
        c.type === 'material' ? (
          <TouchableOpacity
            key={i}
            onPress={() => openPath(navigation, c.path)}
            style={[styles.resultRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
          >
            <View style={[styles.resultTile, { backgroundColor: colors.accentSoft }]}>
              <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '900' }}>{(c.course_code || '').split(/\s+/)[0].slice(0, 4)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{c.course_code}</Text>
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>{c.title}</Text>
            </View>
            {c.bought ? (
              <Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>Bought</Text>
            ) : (
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{naira(c.price)}</Text>
            )}
          </TouchableOpacity>
        ) : null,
      )}
    </View>
  );

  const renderItem = ({ item: m }: { item: BellaMessage }) => {
    if (m.role === 'system') return renderSystem(m.content);
    const mine = m.role === 'student';
    const cards = visibleCards(m);
    const materials = cards.filter((c) => c.type === 'material');
    const hasPay = cards.some((c) => c.type === 'pay_wallet');
    const rest = cards.filter((c) => c.type !== 'material' && c.type !== 'pay_wallet' && !(c.type === 'checkout' && hasPay));
    return (
      <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }]}>
        {!mine ? (
          <View style={{ marginBottom: 20 }}>
            {m.role === 'agent' ? (
              <View style={[styles.agentIcon, { backgroundColor: colors.successSoft }]}>
                <AppIcon name="headset-outline" size={14} color={colors.success} />
              </View>
            ) : (
              <BellaAvatar size={28} animated={false} />
            )}
          </View>
        ) : null}
        <View style={{ maxWidth: '82%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {m.role === 'agent' && <Text style={[styles.agent, { color: colors.textMuted }]}>{m.agent_name || 'Nivasity team'}</Text>}
          <View
            style={[
              styles.bubble,
              mine
                ? { backgroundColor: colors.accent, borderBottomRightRadius: 6 }
                : m.role === 'agent'
                  ? { backgroundColor: colors.successSoft, borderColor: 'rgba(16,185,129,0.35)', borderWidth: 1, borderBottomLeftRadius: 6 }
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
          {cards.length > 0 && (
            <View style={styles.cards}>
              {materials.length > 0 ? renderMaterials(materials) : null}
              {hasPay ? (
                <View style={[styles.payCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  {cards.filter((c) => c.type === 'pay_wallet').map((c, i) => renderCard(c, i, m.id))}
                  {cards.some((c) => c.type === 'checkout') ? (
                    <TouchableOpacity onPress={() => navigation.navigate('Checkout')} style={{ alignItems: 'center', paddingTop: 2 }}>
                      <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>Review in checkout</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
              {rest.map((c, i) => renderCard(c, i, m.id))}
            </View>
          )}
          <Text style={[styles.time, { color: colors.textMuted }]}>{when(m.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: isDark ? 'rgba(107,45,116,0.16)' : 'rgba(107,45,116,0.06)' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Back">
          <AppIcon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <BellaAvatar size={40} />
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.text }]}>Bella</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {status !== 'resolved' ? (
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: human ? '#fbbf24' : '#4ade80' }} />
            ) : null}
            <Text style={{ color: colors.textMuted, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
              {status === 'waiting'
                ? "Passed to the Nivasity team · they'll reply here"
                : status === 'human'
                  ? 'The Nivasity team is in this chat'
                  : status === 'resolved'
                    ? 'Nivasity assistant'
                    : 'Nivasity assistant · replies in seconds'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconBtn} accessibilityLabel="Bella menu">
          <AppIcon name="ellipsis-vertical" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { icon: 'chatbubbles-outline' as const, label: 'Chat history', to: 'BellaChats' },
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
            extraData={latestCardOwner}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <BellaAvatar size={64} style={{ marginBottom: 12 }} />
                <Text style={[styles.hello, { color: colors.text }]}>Hi, I'm Bella</Text>
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                  I can find your materials, add them to your cart, and help with your wallet, orders and receipts.
                </Text>
                <View style={styles.chips}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity key={s} onPress={() => send(s)} style={[styles.chip, { borderColor: PLUM.border, backgroundColor: PLUM.fill }]}>
                      <Text style={{ color: isDark ? PLUM.textDark : PLUM.text, fontSize: 13, fontWeight: '700' }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
            ListFooterComponent={
              sending ? (
                human ? (
                  <View style={styles.typing}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Sending…</Text>
                  </View>
                ) : (
                  <View style={styles.typing} accessibilityLabel="Bella is typing">
                    <BellaAvatar size={28} animated={false} />
                    <View style={[styles.typingBubble, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <TypingDots color={colors.textMuted} />
                    </View>
                  </View>
                )
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
        {ended && !consent.required ? (
          <View style={[styles.endedBar, { borderTopColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, flex: 1, fontSize: 13 }}>This chat has ended. Need something else?</Text>
            <TouchableOpacity
              onPress={() => {
                setError(null);
                setMessages([]);
              }}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
            >
              <BellaGradient width={176} height={46} radius={23}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="add" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Start a new chat</Text>
                </View>
              </BellaGradient>
            </TouchableOpacity>
          </View>
        ) : null}
        {!consent.required && !ended && !human && messages.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.quickRow}>
            {QUICK_REPLIES.map((q) => (
              <TouchableOpacity
                key={q}
                disabled={sending}
                onPress={() => send(q)}
                style={[styles.quick, { borderColor: PLUM.border, backgroundColor: PLUM.fill, opacity: sending ? 0.5 : 1 }]}
              >
                <Text style={{ color: isDark ? PLUM.textDark : PLUM.text, fontSize: 13, fontWeight: '700' }}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
        <View style={[styles.inputBar, { borderTopColor: colors.border }, (consent.required || ended) && { display: 'none' }]}>
          <TouchableOpacity onPress={pickFile} style={[styles.attachBtn, { backgroundColor: colors.surfaceAlt }]} accessibilityLabel="Attach a photo or PDF">
            <AppIcon name="add" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={human ? 'Write to the team…' : 'Message Bella'}
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
      <PinConfirmSheet
        visible={pay.open}
        onClose={() => setPay((x) => ({ ...x, open: false }))}
        title="Confirm payment"
        description={`${pay.items} item${pay.items === 1 ? '' : 's'} from your wallet`}
        amount={naira(pay.total)}
        onConfirm={payNow}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  endedBar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { padding: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  list: { padding: 16, gap: 14, flexGrow: 1 },
  row: { flexDirection: 'row' },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
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
  attachBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notePill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  agentIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  resultTile: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  payCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  typingBubble: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12 },
  quickRow: { gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  quick: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  image: { width: 200, height: 200, borderRadius: 12 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 12, marginBottom: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '90%' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export default BellaScreen;
