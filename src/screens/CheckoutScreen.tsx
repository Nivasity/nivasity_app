import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useWallet } from '../contexts/WalletContext';
import Button from '../components/Button';
import AppIcon from '../components/AppIcon';
import OtpInput from '../components/OtpInput';
import { cartAPI, orderAPI, paymentAPI } from '../services/api';
import { CartItem, Order, PaymentChannel } from '../types';

interface CheckoutScreenProps {
  navigation: any;
  route: any;
}

WebBrowser.maybeCompleteAuthSession();

const formatMoney = (value: number) => `₦ ${Number(value || 0).toLocaleString()}`;

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const appMessage = useAppMessage();
  const { items: cartItemsFromContext, clear: clearCart } = useCart();
  const { summary, hasWallet, hasPin, refreshCreditsAndSummary } = useWallet();
  const cartItems = (route?.params?.cartItems as CartItem[] | undefined) ?? cartItemsFromContext ?? [];
  const highlightColor = isDark ? colors.accentMuted : colors.secondary;
  const supportColor = isDark ? colors.accentMuted : colors.secondary;
  const [loading, setLoading] = useState(false);
  const [paymentOverlay, setPaymentOverlay] = useState(false);
  const [gateway, setGateway] = useState<string | null>(null);
  const [handlingFee, setHandlingFee] = useState(0);
  const [walletFee, setWalletFee] = useState(0);
  const [walletTotal, setWalletTotal] = useState(0);
  const [walletCanPay, setWalletCanPay] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentChannel>('gateway');
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [walletPin, setWalletPin] = useState('');
  const [pricingReady, setPricingReady] = useState(false);

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

  const subtotal = useMemo(
    () =>
      (cartItems as CartItem[]).reduce(
        (sum: number, item: CartItem) => sum + item.price * item.quantity,
        0
      ),
    [cartItems]
  );
  const total = useMemo(() => subtotal + handlingFee, [subtotal, handlingFee]);

  useEffect(() => {
    let mounted = true;

    if (!cartItems || cartItems.length === 0) {
      setHandlingFee(0);
      setWalletFee(0);
      setWalletTotal(0);
      setWalletCanPay(false);
      setPricingReady(true);
      return () => {
        mounted = false;
      };
    }

    setPricingReady(false);
    void refreshCreditsAndSummary();
    cartAPI
      .view()
      .then((cart) => {
        if (!mounted) return;
        const subtotalFromApi = typeof cart.subtotal === 'number' ? cart.subtotal : subtotal;
        const totalFromApi = typeof cart.totalAmount === 'number' ? cart.totalAmount : subtotalFromApi;
        const feeFromApi = typeof cart.charge === 'number' ? cart.charge : Math.max(0, totalFromApi - subtotalFromApi);
        setHandlingFee(feeFromApi);
        setWalletFee(Number(cart.wallet?.walletCharge ?? 0));
        setWalletTotal(Number(cart.wallet?.walletTotalAmount ?? subtotalFromApi));
        setWalletCanPay(Boolean(cart.wallet?.canPayWithWallet));
        setPaymentMethod((current) => {
          if (current === 'wallet' && !(cart.wallet?.hasWallet && hasPin)) return 'gateway';
          if (cart.wallet?.hasWallet && hasPin && cart.wallet.canPayWithWallet) return 'wallet';
          return current;
        });
        setPricingReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setHandlingFee(0);
        setWalletFee(0);
        setWalletTotal(subtotal);
        setWalletCanPay(false);
        setPricingReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [cartItems, hasPin, refreshCreditsAndSummary, subtotal]);

  const completeCheckout = async (args: { txRef: string; finalTotal: number; paymentChannel: PaymentChannel }) => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const fallbackOrder: Order = {
      id: args.txRef,
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
      total: args.finalTotal,
      status: 'completed',
      createdAt: new Date().toISOString(),
      paymentChannel: args.paymentChannel,
      medium: args.paymentChannel === 'wallet' ? 'NIVASITY' : gateway || undefined,
    };

    let nextOrder: Order | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const orders = await orderAPI.getOrders({ page: 1, limit: 20 });
        nextOrder = orders.find((order) => order.id === args.txRef) || null;
        if (nextOrder) break;
      } catch {
        // ignore
      }
      await delay(900);
    }

    clearCart();
    navigation.replace('OrderReceipt', { order: nextOrder || fallbackOrder });
  };

  const runGatewayCheckout = async () => {
    const returnUrl = ExpoLinking.createURL('payment', { scheme: 'nivasity' });
    const payment = await paymentAPI.initPayment({ redirectUrl: returnUrl, paymentChannel: 'gateway' });
    if (!payment.payment_url) {
      throw new Error('Payment link unavailable');
    }

    const result = await WebBrowser.openAuthSessionAsync(payment.payment_url, returnUrl, {
      showInRecents: true,
    });

    if (result.type !== 'success') {
      setPaymentOverlay(false);
      return;
    }

    const returnedUrl = (result as any)?.url as string | undefined;
    const parsed = returnedUrl ? ExpoLinking.parse(returnedUrl) : null;
    const statusRaw = parsed?.queryParams?.status;
    const status = typeof statusRaw === 'string' ? statusRaw.trim().toLowerCase() : '';

    if (status && status !== 'success') {
      setPaymentOverlay(false);
      return;
    }

    const txRefRaw = parsed?.queryParams?.tx_ref;
    const txRef = (typeof txRefRaw === 'string' ? txRefRaw.trim() : '') || (payment.tx_ref || '').trim();
    await completeCheckout({ txRef, finalTotal: total, paymentChannel: 'gateway' });
  };

  const runWalletCheckout = async (pin: string) => {
    const payment = await paymentAPI.initPayment({ paymentChannel: 'wallet', walletPin: pin });
    const txRef = (payment.tx_ref || '').trim();
    if (!txRef) {
      throw new Error('Wallet transaction reference missing');
    }
    await completeCheckout({
      txRef,
      finalTotal: Number(payment.total_amount ?? walletTotal ?? subtotal),
      paymentChannel: 'wallet',
    });
  };

  const handlePayment = async () => {
    if (!cartItems || cartItems.length === 0) {
      appMessage.alert({ title: 'Cart is empty', message: 'Add at least one item to checkout.' });
      return;
    }
    if (!pricingReady) return;

    if (paymentMethod === 'wallet') {
      if (!hasWallet) {
        navigation.navigate('WalletFund');
        return;
      }
      if (!hasPin) {
        navigation.navigate('WalletPin');
        return;
      }
      if (!walletCanPay) {
        appMessage.alert({ title: 'Wallet balance low', message: 'Fund wallet to continue.' });
        return;
      }
      setWalletPin('');
      setPinModalVisible(true);
      return;
    }

    setLoading(true);
    setPaymentOverlay(true);
    try {
      await runGatewayCheckout();
    } catch (error: any) {
      appMessage.alert({
        title: 'Payment Failed',
        message: error.response?.data?.message || error?.message || 'Failed to initiate payment',
      });
    } finally {
      setLoading(false);
      setPaymentOverlay(false);
    }
  };

  const confirmWalletPayment = async () => {
    if (walletPin.trim().length !== 4) {
      appMessage.alert({ title: 'Enter your PIN', message: 'Use your 4-digit wallet PIN.' });
      return;
    }

    setLoading(true);
    setPaymentOverlay(true);
    setPinModalVisible(false);
    try {
      await runWalletCheckout(walletPin.trim());
    } catch (error: any) {
      appMessage.alert({
        title: 'Wallet payment failed',
        message: error.response?.data?.message || error?.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
      setPaymentOverlay(false);
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

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pay with</Text>
        </View>

        <View style={styles.methodList}>
          <TouchableOpacity
            onPress={() => setPaymentMethod('wallet')}
            activeOpacity={0.88}
            style={[
              styles.methodCard,
              { backgroundColor: colors.surface, borderColor: paymentMethod === 'wallet' ? colors.accent : colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pay with wallet"
          >
            <View style={styles.methodHeader}>
              <View style={[styles.methodIcon, { backgroundColor: colors.accentCard }]}>
                <AppIcon name="wallet-outline" size={18} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodTitle, { color: colors.text }]}>Wallet</Text>
                <Text style={[styles.methodMeta, { color: colors.textMuted }]}>
                  {hasWallet ? `Bal ${formatMoney(summary?.wallet?.balance ?? 0)}` : 'Activate wallet'}
                </Text>
              </View>
              <View style={styles.methodAmountWrap}>
                <Text style={[styles.methodAmountLabel, { color: colors.textMuted }]}>Total</Text>
                <Text style={[styles.methodAmountValue, { color: colors.text }]}>
                  {formatMoney(walletTotal || subtotal)}
                </Text>
              </View>
              <AppIcon
                name={paymentMethod === 'wallet' ? 'checkmark-circle-outline' : 'ellipse-outline'}
                size={20}
                color={paymentMethod === 'wallet' ? colors.accent : colors.textMuted}
              />
            </View>
            {!hasWallet ? (
              <Text style={[styles.methodState, { color: supportColor }]}>Activate first</Text>
            ) : !hasPin ? (
              <Text style={[styles.methodState, { color: colors.secondary }]}>Add PIN</Text>
            ) : !walletCanPay ? (
              <Text style={[styles.methodState, { color: colors.warning }]}>Balance low</Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaymentMethod('gateway')}
            activeOpacity={0.88}
            style={[
              styles.methodCard,
              { backgroundColor: colors.surface, borderColor: paymentMethod === 'gateway' ? colors.accent : colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pay with gateway"
          >
            <View style={styles.methodHeader}>
              <View style={[styles.methodIcon, { backgroundColor: colors.surfaceAlt }]}>
                <AppIcon name="cash-outline" size={18} color={supportColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodTitle, { color: colors.text }]}>Gateway</Text>
                <Text style={[styles.methodMeta, { color: colors.textMuted }]}>
                  {gateway ? gateway.charAt(0).toUpperCase() + gateway.slice(1) : 'Online payment'}
                </Text>
              </View>
              <View style={styles.methodAmountWrap}>
                <Text style={[styles.methodAmountLabel, { color: colors.textMuted }]}>Total</Text>
                <Text style={[styles.methodAmountValue, { color: colors.text }]}>
                  {formatMoney(total)}
                </Text>
              </View>
              <AppIcon
                name={paymentMethod === 'gateway' ? 'checkmark-circle-outline' : 'ellipse-outline'}
                size={20}
                color={paymentMethod === 'gateway' ? colors.accent : colors.textMuted}
              />
            </View>
          </TouchableOpacity>
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
                <AppIcon name="book-outline" size={20} color={highlightColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {item.courseCode || item.category || item.name}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                  Qty {item.quantity} · ₦ {item.price.toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.text }]}>
                ₦ {(item.price * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TotalRow label="Subtotal" value={`₦ ${subtotal.toLocaleString()}`} />
          <TotalRow label={paymentMethod === 'wallet' ? 'Wallet fee' : 'Handling Fee'} value={paymentMethod === 'wallet' ? formatMoney(walletFee) : formatMoney(handlingFee)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TotalRow label="Total" value={paymentMethod === 'wallet' ? formatMoney(walletTotal || subtotal) : formatMoney(total)} bold />
        </View>

        <Button
          title={
            paymentMethod === 'wallet'
              ? !hasWallet
                ? 'Activate wallet'
                : !hasPin
                  ? 'Add wallet PIN'
                  : 'Pay with wallet'
              : 'Proceed to Payment'
          }
          onPress={handlePayment}
          loading={loading}
          disabled={!pricingReady || !cartItems || cartItems.length === 0}
        />
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

      {pinModalVisible ? (
        <View style={[styles.pinSheetOverlay, { backgroundColor: 'rgba(0,0,0,0.32)' }]}>
          <View style={[styles.pinSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.pinSheetTitle, { color: colors.text }]}>Wallet PIN</Text>
            <Text style={[styles.pinSheetText, { color: colors.textMuted }]}>Confirm to pay {formatMoney(walletTotal || subtotal)}.</Text>
            <OtpInput value={walletPin} onChange={setWalletPin} length={4} variant="pin" secureTextEntry autoFocus />
            <Button title="Confirm payment" onPress={confirmWalletPayment} />
            <TouchableOpacity onPress={() => setPinModalVisible(false)} style={styles.cancel} accessibilityRole="button">
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
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
  methodList: {
    gap: 12,
    marginBottom: 8,
  },
  methodCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  methodMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  methodAmountWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  methodAmountLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodAmountValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  methodState: {
    fontSize: 12,
    fontWeight: '700',
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
  pinSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
  },
  pinSheet: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
  },
  pinSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  pinSheetText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
});

export default CheckoutScreen;
