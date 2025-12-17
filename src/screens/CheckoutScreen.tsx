import React, { useMemo, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import AppIcon from '../components/AppIcon';
import { orderAPI, paymentAPI } from '../services/api';
import { CartItem } from '../types';

interface CheckoutScreenProps {
  navigation: any;
  route: any;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { cartItems = [] } = route.params || {};
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Cart is empty', 'Add at least one item to checkout.');
      return;
    }

    setLoading(true);
    try {
      const order = await orderAPI.createOrder(cartItems);
      const payment = await paymentAPI.initiatePayment(order.id, total);
      await Linking.openURL(payment.paymentUrl);
    } catch (error: any) {
      Alert.alert('Payment Failed', error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <AppIcon name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: colors.text }]}>Checkout</Text>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Favorite"
          >
            <AppIcon name="heart-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.mediaCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.media, { backgroundColor: colors.surfaceAlt }]}>
            <AppIcon name="shield-checkmark-outline" size={40} color={colors.secondary} />
            <View style={[styles.playButton, { backgroundColor: colors.surface }]}>
              <AppIcon name="play" size={18} color={colors.accent} />
            </View>
          </View>
        </View>

        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.detailsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailsTitle, { color: colors.text }]}>Secure payment</Text>
              <Text style={[styles.detailsSubtitle, { color: colors.textMuted }]}>
                Powered by Interswitch
              </Text>
            </View>
            <Text style={[styles.price, { color: colors.text }]}>₦{total.toLocaleString()}</Text>
          </View>

          <Text style={[styles.paragraph, { color: colors.textMuted }]}>
            Confirm your items and proceed to payment. You can return to the app after completing the payment.
          </Text>

          <View style={styles.metaRow}>
            <MetaPill title="Email" value={(user?.email || '—').toLowerCase()} />
            <MetaPill title="Items" value={`${cartItems.length}`} />
            <MetaPill title="Delivery" value="Free" />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order summary</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            {cartItems.length} items
          </Text>
        </View>

        <View style={styles.list}>
          {cartItems.map((item: CartItem, index: number) => (
            <View
              key={`${item.id}-${index}`}
              style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.itemIcon, { backgroundColor: colors.surfaceAlt }]}>
                <AppIcon name="cube-outline" size={18} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
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
          <TotalRow label="Delivery" value="₦0" />
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
    borderRadius: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
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
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  detailsSubtitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  price: {
    fontSize: 16,
    fontWeight: '900',
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaPill: {
    flex: 1,
    borderRadius: 14,
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
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: 10,
    marginBottom: 12,
  },
  itemRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '900',
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
    fontSize: 12,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: '800',
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
});

export default CheckoutScreen;
