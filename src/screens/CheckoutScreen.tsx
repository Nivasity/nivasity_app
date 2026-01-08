import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import Button from '../components/Button';
import AppIcon from '../components/AppIcon';
import { orderAPI, paymentAPI } from '../services/api';
import { CartItem, Order } from '../types';

interface CheckoutScreenProps {
  navigation: any;
  route: any;
}

WebBrowser.maybeCompleteAuthSession();

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { items: cartItemsFromContext, clear: clearCart } = useCart();
  const cartItems = (route?.params?.cartItems as CartItem[] | undefined) ?? cartItemsFromContext;
  const [loading, setLoading] = useState(false);
  const [paymentOverlay, setPaymentOverlay] = useState(false);
  const [gateway, setGateway] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    paymentAPI
      .getGateway()
      .then((res) => {
        if (!mounted) return;
        setGateway((res.active || '').trim().toLowerCase() || null);
      })
      .catch(() => {
        if (!mounted) return;
        setGateway(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const total = useMemo(
    () =>
      (cartItems as CartItem[]).reduce(
        (sum: number, item: CartItem) => sum + item.price * item.quantity,
        0
      ),
    [cartItems]
  );

  const handlePayment = async () => {
    if (!cartItems || cartItems.length === 0) {
      console.log('[Checkout] Cart is empty');
      appMessage.alert({ title: 'Cart is empty', message: 'Add at least one item to checkout.' });
      return;
    }

    setLoading(true);
    setPaymentOverlay(true);
    console.log('[Checkout] Starting payment process...');
    try {
      const returnUrl = ExpoLinking.createURL('payment', { scheme: 'nivasity' });
      console.log('[Checkout] Created returnUrl:', returnUrl);
      const payment = await paymentAPI.initPayment({ redirectUrl: returnUrl });
      console.log('[Checkout] Payment initialized:', payment);

      const result = await WebBrowser.openAuthSessionAsync(payment.payment_url, returnUrl, {
        showInRecents: true,
      });
      console.log('[Checkout] WebBrowser.openAuthSessionAsync result:', result);

      if (result.type !== 'success') {
        console.log('[Checkout] Payment flow canceled/dismissed, staying on checkout');
        setPaymentOverlay(false);
        return;
      }

      const returnedUrl = (result as any)?.url as string | undefined;
      const parsed = returnedUrl ? ExpoLinking.parse(returnedUrl) : null;
      const statusRaw = parsed?.queryParams?.status;
      const status = typeof statusRaw === 'string' ? statusRaw.trim().toLowerCase() : '';

      if (status && status !== 'success') {
        console.log('[Checkout] Payment returned non-success status:', status);
        setPaymentOverlay(false);
        return;
      }

      const txRefRaw = parsed?.queryParams?.tx_ref;
      const txRef =
        (typeof txRefRaw === 'string' ? txRefRaw.trim() : '') || (payment.tx_ref || '').trim();

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const fallbackOrder: Order = {
        id: txRef,
        userId: String(user?.id || ''),
        items: cartItems.map((item) => ({
          id: String(item.id),
          name: item.name,
          description: item.description || '',
          price: item.price,
          category: item.category || '',
          quantity: item.quantity,
          courseCode: item.courseCode,
        })),
        total,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      let nextOrder: Order | null = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const orders = await orderAPI.getOrders({ page: 1, limit: 20 });
          nextOrder = orders.find((o) => o.id === txRef) || null;
          if (nextOrder) break;
        } catch {
          // ignore
        }
        await delay(900);
      }

      clearCart();
      navigation.replace('OrderReceipt', { order: nextOrder || fallbackOrder });
      return;
    } catch (error: any) {
      console.log('[Checkout] Payment failed:', error);
      appMessage.alert({
        title: 'Payment Failed',
        message: error.response?.data?.message || 'Failed to initiate payment',
      });
    } finally {
      setLoading(false);
      setPaymentOverlay(false);
      console.log('[Checkout] Payment process finished. Loading set to false.');
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconButton]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <AppIcon name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: colors.text }]}>Checkout</Text>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: 'transparent' }]}
          >
          </TouchableOpacity>
        </View>

        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.detailsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailsTitle, { color: colors.text }]}>Secure payment</Text>
            </View>
            <Text style={[styles.detailsSubtitle, { color: colors.textMuted }]}>
              Powered by {gateway ? gateway.charAt(0).toUpperCase() + gateway.slice(1) : 'Payment'}
            </Text>
          </View>

          <Text style={[styles.paragraph, { color: colors.textMuted }]}>
            Confirm your items and proceed to payment. You can return to the app after completing the payment.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order summary</Text>
        </View>

        <View style={styles.list}>
          {cartItems.map((item: CartItem, index: number) => (
            <View
              key={`${item.id}-${index}`}
              style={[styles.itemRow, { borderColor: colors.border }]}
            >
              <View style={[styles.itemIcon]}>
                <AppIcon name="book-outline" size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {item.courseCode || item.category || item.name}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                  Qty {item.quantity} · ₦{item.price.toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.text }]}>
                ₦{(item.price * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TotalRow label="Subtotal" value={`₦${total.toLocaleString()}`} />
          <TotalRow label="Handling Fee" value="₦0" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TotalRow label="Total" value={`₦${total.toLocaleString()}`} bold />
        </View>

        <Button title="Proceed to Payment" onPress={handlePayment} loading={loading} />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.cancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {paymentOverlay ? (
        <View
          pointerEvents="auto"
          style={[
            styles.paymentOverlay,
            { backgroundColor: 'rgba(0,0,0,0.40)' },
          ]}
        >
          <View style={[styles.paymentOverlayCard, { backgroundColor: "transparent" }]}>
            <ActivityIndicator color={colors.accent} size={150} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const MetaPill = ({ title, value }: { title: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaPill, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.metaTitle, { color: colors.textMuted }]}>{title}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const TotalRow = ({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: colors.textMuted }, bold && { color: colors.text }]}>
        {label}
      </Text>
      <Text style={[styles.totalValue, { color: colors.text }, bold && { fontWeight: '900' }]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  mediaCard: {
    borderRadius: 22,
    padding: 12,
    shadowOpacity: 0,
    elevation: 0,
  },
  media: {
    height: 180,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playButton: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  detailsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  metaPill: {
    flex: 1,
    borderRadius: 20,
    padding: 10,
  },
  metaTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 15,
  },
  list: {
    gap: 10,
    marginBottom: 12,
  },
  itemRow: {
    borderBottomWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  cancel: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  paymentOverlayCard: {
    width: '100%',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});

export default CheckoutScreen;
