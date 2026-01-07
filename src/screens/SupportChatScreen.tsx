import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AppIcon from '../components/AppIcon';
import Loading from '../components/Loading';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SupportTicketDetails, SupportTicketMessage, supportAPI } from '../services/api';

type SupportChatScreenProps = {
  navigation: any;
  route: any;
};

const toMimeType = (uri: string, mimeType?: string | null) => {
  const trimmed = (mimeType || '').trim();
  if (trimmed) return trimmed;
  const clean = (uri || '').split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
};

const BASE_INPUT_HEIGHT = 52;
const MAX_INPUT_HEIGHT = 140;
const SUPPORT_ATTACHMENT_BASE_URL = 'https://funaab.nivasity.com/';

const SupportChatScreen: React.FC<SupportChatScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const appMessage = useAppMessage();

  const formatMessageTimestamp = useCallback((date: Date) => {
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${time}, ${day}`;
  }, []);

  const ticketIdParam = route?.params?.ticketId;
  const ticketCodeParam = route?.params?.ticketCode;
  const initialSubject = route?.params?.subject;

  const ticketId = useMemo(() => (ticketIdParam != null ? Number(ticketIdParam) : NaN), [ticketIdParam]);
  const ticketCode = useMemo(() => (ticketCodeParam ? String(ticketCodeParam) : ''), [ticketCodeParam]);

  const [ticket, setTicket] = useState<SupportTicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [inputHeight, setInputHeight] = useState(BASE_INPUT_HEIGHT);
  const [expandedTimes, setExpandedTimes] = useState<Record<string, boolean>>({});

  const listRef = useRef<FlatList<SupportTicketMessage> | null>(null);

  const loadDetails = useCallback(async () => {
    try {
      const details = await supportAPI.getTicketDetails({
        id: Number.isFinite(ticketId) ? ticketId : undefined,
        code: !Number.isFinite(ticketId) ? ticketCode : undefined,
      });
      setTicket(details);
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Failed to load ticket.' });
      setTicket(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appMessage, ticketCode, ticketId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useFocusEffect(
    useCallback(() => {
      const handle = setInterval(() => {
        if (sending) return;
        loadDetails();
      }, 60_000);

      return () => {
        clearInterval(handle);
      };
    }, [loadDetails, sending])
  );

  const myUserId = useMemo(() => {
    const v = user?.id != null ? Number(user.id) : NaN;
    return Number.isFinite(v) ? v : null;
  }, [user?.id]);

  const title = (ticket?.subject || initialSubject || 'Support Ticket').trim();

  const statusMeta = useMemo(() => {
    const map: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
      open: { label: 'Open', tone: 'success' },
      in_progress: { label: 'In progress', tone: 'warning' },
      closed: { label: 'Closed', tone: 'muted' },
    };
    return map;
  }, []);

  const statusStyle = useMemo(() => {
    const raw = (ticket?.status || '').toLowerCase();
    const meta = statusMeta[raw] || { label: ticket?.status || 'Unknown', tone: 'muted' };
    const bg =
      meta.tone === 'success'
        ? isDark
          ? 'rgba(34,197,94,0.18)'
          : 'rgba(34,197,94,0.12)'
        : meta.tone === 'warning'
          ? isDark
            ? 'rgba(245,158,11,0.18)'
            : 'rgba(245,158,11,0.12)'
          : isDark
            ? 'rgba(148,163,184,0.14)'
            : 'rgba(148,163,184,0.10)';
    const fg =
      meta.tone === 'success' ? colors.success : meta.tone === 'warning' ? colors.warning : colors.textMuted;
    return { label: meta.label, bg, fg };
  }, [colors.success, colors.textMuted, colors.warning, isDark, statusMeta, ticket?.status]);

  const messages = useMemo(() => (ticket?.messages || []).slice(), [ticket?.messages]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    if (!loading) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appMessage.toast({ status: 'failed', message: 'Allow photo access to attach an image.' });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    const asset = res.assets[0];
    const uri = asset.uri;
    const name = (asset.fileName || `attachment-${Date.now()}.jpg`).trim();
    const type = toMimeType(uri, (asset as any).mimeType);
    setAttachment({ uri, name, type });
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/*'],
    });
    if (res.canceled) return;
    const uri = res.assets?.[0]?.uri;
    if (!uri) return;
    const name = (res.assets?.[0]?.name || `attachment-${Date.now()}`).trim();
    const type = toMimeType(uri, res.assets?.[0]?.mimeType);
    setAttachment({ uri, name, type });
  };

  const openAttachment = async (value?: SupportTicketMessage['attachment']) => {
    const raw =
      typeof value === 'string'
        ? value
        : value && typeof value === 'object'
          ? String((value as any).path || '')
          : '';

    const cleaned = raw.trim();
    if (!cleaned) return;

    const url = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `${SUPPORT_ATTACHMENT_BASE_URL}${cleaned.replace(/^\/+/, '')}`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      appMessage.toast({ status: 'failed', message: 'Failed to open attachment.' });
    }
  };

  const sendMessage = async () => {
    if (!ticket?.id) return;
    const clean = draft.trim();
    if (!clean) {
      appMessage.toast({ status: 'failed', message: 'Type a message first.' });
      return;
    }

    setSending(true);
    try {
      await supportAPI.replyToTicket({ ticketId: ticket.id, message: clean, attachment });
      setDraft('');
      setInputHeight(BASE_INPUT_HEIGHT);
      setAttachment(null);
      await loadDetails();
      scrollToBottom();
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Failed to send message.' });
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: SupportTicketMessage }) => {
    const fromMe = myUserId != null && item.user_id != null && Number(item.user_id) === myUserId;
    const role = (item.user_role || '').toLowerCase();
    const fromSupport = !fromMe && (role === 'admin' || /support/i.test(item.user_name || ''));
    const bubbleBg = fromMe ? colors.accent : colors.surfaceAlt;
    const bubbleBorder = fromMe ? 'transparent' : colors.border;
    const textColor = fromMe ? colors.onAccent : colors.text;
    const subColor = fromMe ? (isDark ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.88)') : colors.textMuted;
    const label = (item.user_name || (fromSupport ? 'Support' : 'Support')).trim() || 'Support';
    const rawCreated = (item.created_at || '').trim();
    const createdAt = rawCreated ? new Date(rawCreated.replace(' ', 'T')) : null;
    const createdLabel =
      createdAt && !Number.isNaN(createdAt.getTime()) ? formatMessageTimestamp(createdAt) : '';
    const relative = createdAt && !Number.isNaN(createdAt.getTime())
      ? (() => {
          const diffMs = Date.now() - createdAt.getTime();
          const mins = Math.floor(diffMs / 60000);
          if (mins < 1) return 'now';
          if (mins < 60) return `${mins}m ago`;
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) return `${hrs}h ago`;
          const days = Math.floor(hrs / 24);
          if (days < 7) return `${days}d ago`;
          const weeks = Math.floor(days / 7);
          if (weeks < 52) return `${weeks}w ago`;
          const years = Math.floor(weeks / 52);
          return `${years}y ago`;
        })()
      : '';
    const messageId = String(item.id);
    const showTime = !!expandedTimes[messageId];

    return (
      <View style={[styles.msgRow, { justifyContent: fromMe ? 'flex-end' : 'flex-start' }]}>
        <View style={{ maxWidth: '86%' }}>
          <TouchableOpacity
            onPress={() =>
              setExpandedTimes((prev) => ({
                ...prev,
                [messageId]: !prev[messageId],
              }))
            }
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="Toggle message timestamp"
          >
            <View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: bubbleBorder, maxWidth: '100%' }]}>
              {!fromMe ? (
                <View style={styles.supportHeader}>
                  <Text style={[styles.supportName, { color: colors.text }]} numberOfLines={1}>
                    {label}
                  </Text>
                  {relative ? (
                    <Text style={[styles.supportMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {' • '}{relative}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Text style={[styles.msgText, { color: textColor }]}>{item.message}</Text>

              {item.attachment ? (
                <TouchableOpacity
                  onPress={() => openAttachment(item.attachment)}
                  style={[
                    styles.attachmentRow,
                    {
                      borderColor: fromMe ? 'rgba(255,255,255,0.45)' : colors.border,
                      backgroundColor: fromMe
                        ? isDark
                          ? 'rgba(0,0,0,0.12)'
                          : 'rgba(255,255,255,0.12)'
                        : colors.surfaceAlt,
                    },
                  ]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Open attachment"
                >
                  <AppIcon name="attach-outline" size={14} color={fromMe ? colors.onAccent : colors.textMuted} />
                  <Text
                    style={[styles.attachmentLabel, { color: fromMe ? colors.onAccent : colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {typeof item.attachment === 'object' && item.attachment
                      ? String((item.attachment as any).original_name || 'Attachment')
                      : 'Attachment'}
                  </Text>
                  <AppIcon name="open-outline" size={14} color={fromMe ? colors.onAccent : colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>

          {showTime && createdLabel ? (
            <Text
              style={[
                styles.timeBelow,
                { color: colors.textMuted, textAlign: fromMe ? 'right' : 'left' },
              ]}
              numberOfLines={1}
            >
              {createdLabel}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) return <Loading message="Loading conversation..." />;

  const isClosed = (ticket?.status || '').toLowerCase() === 'closed';
  const isTyping = draft.trim().length > 0;
  const inlineActionStyle =
    inputHeight > 40 ? { alignSelf: 'flex-end' as const } : { alignSelf: 'center' as const };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconButton]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={[styles.codeText, { color: colors.textMuted }]} numberOfLines={1}>
              #{ticket?.code || ticketCode}
            </Text>
          </View>
        </View>


        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: colors.border }]}>
          <Text style={[styles.statusText, { color: statusStyle.fg }]} numberOfLines={1}>
            {statusStyle.label}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={(r) => {
            listRef.current = r;
          }}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={[styles.listContent, { paddingBottom: 12 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
        />

        {!isClosed ? (
          <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            {attachment ? (
              <TouchableOpacity
                onPress={() => setAttachment(null)}
                style={[styles.attachmentPill, { borderColor: colors.border }]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Remove attachment"
              >
                <AppIcon name="attach-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.attachmentName, { color: colors.textMuted }]} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <AppIcon name="close-outline" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}

            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Type your message..."
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, height: inputHeight}]}
                multiline
                editable={!sending}
                textAlignVertical={inputHeight > 40 ? 'top' : 'center'}
                scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
                onContentSizeChange={(e) => {
                  const nextHeight = e?.nativeEvent?.contentSize?.height;
                  if (typeof nextHeight !== 'number' || !Number.isFinite(nextHeight)) return;
                  const padded = Math.ceil(nextHeight + 5);
                  const next = Math.max(BASE_INPUT_HEIGHT, Math.min(MAX_INPUT_HEIGHT, padded));
                  setInputHeight((prev) => (prev === next ? prev : next));
                }}
              />

              {isTyping ? (
                <TouchableOpacity
                  onPress={sendMessage}
                  style={[
                    styles.sendInline,
                    {
                      backgroundColor: sending ? colors.surfaceAlt : 'transparent',
                    },
                    inlineActionStyle,
                  ]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  disabled={sending}
                >
                  <AppIcon name="arrow-up" size={20} color={sending ? colors.textMuted : colors.accent} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.actionsInline, inlineActionStyle]}>
                  <TouchableOpacity
                    onPress={pickPhoto}
                    style={[styles.gifPill, { borderColor: colors.border }]}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Attach GIF"
                  >
                    <Text style={[styles.gifText, { color: colors.textMuted }]}>GIF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={pickFile}
                    style={[styles.plusButton, { borderColor: colors.border }]}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Attach file"
                  >
                    <AppIcon name="add" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.closedFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.closedText, { color: colors.textMuted }]}>
              This ticket is closed.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingBottom: 0 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  supportName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
    maxWidth: '70%',
  },
  supportMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  msgText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  timeBelow: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
  },
  attachmentRow: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    // marginBottom: -50,
  },
  attachmentPill: {
    width: '60%',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentName: {
    maxWidth: 180,
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrap: {
    width: '100%',
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 32,
    paddingStart: 14,
    paddingEnd: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 32,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 13,
    fontWeight: '600',
  },
  actionsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gifPill: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  plusButton: {
    width: 34,
    height: 34,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendInline: {
    width: 34,
    height: 34,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default SupportChatScreen;
