import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { CartItem, Order } from '../types';

interface OrderReceiptScreenProps {
  navigation: any;
  route: { params?: { order?: Order } };
}

const sanitizeFilePart = (value: string) => value.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);

const OrderReceiptScreen: React.FC<OrderReceiptScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const appMessage = useAppMessage();
  const insets = useSafeAreaInsets();
  const receiptRef = useRef<View>(null);

  const order = route.params?.order;
  const [working, setWorking] = useState(false);
  const [savedUri, setSavedUri] = useState<string | null>(null);

  const derived = useMemo(() => {
    if (!order) return null;
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      itemCount,
      createdLabel: new Date(order.createdAt).toLocaleString(),
    };
  }, [order]);

  const ensureReceiptImage = async (): Promise<string> => {
    if (!order) throw new Error('Missing order');

    if (savedUri) {
      const file = new FileSystem.File(savedUri);
      if (file.exists) return savedUri;
    }

    if (!receiptRef.current) throw new Error('Receipt not ready');

    const tmpUri = (await captureRef(receiptRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    })) as unknown as string;

    const fileName = `receipt-${sanitizeFilePart(order.id)}-${Date.now()}.png`;
    const destFile = new FileSystem.File(FileSystem.Paths.document, fileName);
    new FileSystem.File(tmpUri).copy(destFile);
    setSavedUri(destFile.uri);
    return destFile.uri;
  };

  const shareReceipt = async () => {
    if (working) return;
    setWorking(true);
    try {
      const uri = await ensureReceiptImage();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        appMessage.alert({ title: 'Sharing not available', message: `Saved at: ${uri}` });
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Order Receipt' });
    } catch (e: any) {
      appMessage.alert({ title: 'Failed', message: e?.message || 'Could not share receipt' });
    } finally {
      setWorking(false);
    }
  };

  if (!order || !derived) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.missing}>
          <AppText style={[styles.missingTitle, { color: colors.text }]}>No order found</AppText>
          <AppText style={[styles.missingText, { color: colors.textMuted }]}>
            Go back and select an order.
          </AppText>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.primaryAction, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppText style={[styles.primaryActionText, { color: colors.onAccent }]}>Back</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconButton, { backgroundColor: colors.background }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <AppIcon name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.topTitle, { color: colors.text }]}>Receipt</AppText>
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={shareReceipt}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Share receipt image"
            disabled={working}
          >
            <AppIcon name="share-social-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          ref={receiptRef}
          collapsable={false}
          style={[
            styles.receiptCard,
            { backgroundColor: colors.surface, borderColor: colors.secondary },
          ]}
        >
          <View style={[styles.receiptHeader, { borderBottomColor: colors.border }]}>
            <View style={{ alignItems: 'flex-start' }}>
              <Image
                source={require('../../assets/image.png')}
                style={{ width: 100, height: 32, resizeMode: 'contain', marginBottom: 2 }}
                accessible
                accessibilityLabel="Nivasity logo"
              />
              <AppText style={[styles.brandSub, { color: colors.secondary }]}>Payment receipt</AppText>
            </View>

            <View style={styles.receiptStampRow}>
              {(() => {
                const stamp =
                  order.status === 'completed' ? 'PAID' : order.status.toUpperCase();
                const tint = (() => {
                  switch (order.status) {
                    case 'completed':
                      return colors.success;
                    case 'processing':
                      return colors.warning;
                    case 'pending':
                      return colors.warning;
                    case 'cancelled':
                      return colors.danger;
                    default:
                      return colors.secondary;
                  }
                })();
                const bg = (() => {
                  switch (order.status) {
                    case 'completed':
                      return isDark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.12)';
                    case 'processing':
                      return isDark ? 'rgba(245,158,11,0.20)' : 'rgba(245,158,11,0.14)';
                    case 'pending':
                      return isDark ? 'rgba(245,158,11,0.20)' : 'rgba(245,158,11,0.14)';
                    case 'cancelled':
                      return isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)';
                    default:
                      return isDark ? 'rgba(122,59,115,0.18)' : 'rgba(122,59,115,0.12)';
                  }
                })();
                return (
                  <View style={[styles.receiptStamp, { backgroundColor: bg, borderColor: tint }]}>
                    <Text style={[styles.receiptStampText, { color: tint }]}>{stamp}</Text>
                  </View>
                );
              })()}
            </View>
          </View>

          <View style={styles.metaGrid}>
            <Meta label="Paid by" value={order.userId} />
            <Meta label="Order ID" value={order.id} />
            <Meta label="Date" value={derived.createdLabel} />
            <Meta label="Items" value={`${derived.itemCount}`} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>Items</AppText>
          </View>

          <View style={styles.itemsList}>
            {order.items.map((item, index) => (
              <LineItem key={`${item.id}-${index}`} item={item} />
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.totalRow}>
            <AppText style={[styles.totalLabel, { color: colors.textMuted }]}>Total</AppText>
            <AppText style={[styles.totalValue, { color: colors.text }]}>
              ₦{order.total.toLocaleString()}
            </AppText>
          </View>

          <View style={[styles.footerNote, { backgroundColor: colors.surfaceAlt }]}>
            <AppText style={[styles.footerNoteText, { color: colors.textMuted }]}>
              Keep this receipt for your records. We hope you enjoy your purchase!
            </AppText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Meta = ({ label, value }: { label: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaPill, { backgroundColor: colors.surfaceAlt }]}>
      <AppText style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</AppText>
      <AppText style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
};
const MetaFull = ({ label, value }: { label: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaPillFull, { backgroundColor: colors.surfaceAlt }]}>
      <AppText style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</AppText>
      <AppText style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
};

const LineItem = ({ item }: { item: CartItem }) => {
  const { colors } = useTheme();
  const lineTotal = item.price * item.quantity;
  return (
    <View style={styles.line}>
      <View style={[styles.lineIcon]}>
        <AppIcon name="book-outline" size={16} color={colors.secondary} />
      </View>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <AppText style={[styles.lineTitle, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText style={[styles.lineSub, { color: colors.textMuted }]} numberOfLines={1}>
          Qty {item.quantity} • ₦{item.price.toLocaleString()}
        </AppText>
      </View>
      <AppText style={[styles.lineTotal, { color: colors.text }]} numberOfLines={1}>
        ₦{lineTotal.toLocaleString()}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  receiptCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  receiptHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: '900',
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaPill: {
    width: '48%',
    borderRadius: 16,
    padding: 12,
  },
  metaPillFull: {
    width: '100%',
    borderRadius: 16,
    padding: 12,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  divider: {
    height: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  itemsList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineIcon: {
    width: 34,
    height: 34,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  lineSub: {
    fontSize: 13,
    fontWeight: '700',
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '900',
  },
  totalRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  footerNote: {
    padding: 14,
  },
  footerNoteText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
  receiptStampRow: {
    padding: 16,
    alignItems: 'flex-end',
  },
  receiptStamp: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  receiptStampText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  missingTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  missingText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  primaryAction: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '900',
  },
});

export default OrderReceiptScreen;
