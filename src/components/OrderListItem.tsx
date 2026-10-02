import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import AppIcon from './AppIcon';
import { CourseTile, IconCircle } from './ui';
import { useTheme } from '../contexts/ThemeContext';
import { Order } from '../types';

interface OrderListItemProps {
  order: Order;
  onPress?: () => void;
}

// One order as a raised card. The whole card opens the receipt (no separate Receipt button).
const OrderListItem: React.FC<OrderListItemProps> = ({ order, onPress }) => {
  const { colors } = useTheme();
  const first = order.items?.[0];
  const code = first?.courseCode || first?.materialCode || '';
  const more = (order.items?.length || 0) - 1;

  const status =
    order.status === 'processing' || order.status === 'pending'
      ? { label: 'Pending', fg: colors.warning, bg: colors.warning + '22' }
      : order.status === 'cancelled' || order.status === 'failed'
        ? { label: order.status === 'failed' ? 'Failed' : 'Cancelled', fg: colors.danger, bg: colors.dangerSoft }
        : order.status === 'refunded'
          ? { label: 'Refunded', fg: colors.secondary, bg: colors.secondary + '22' }
          : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open receipt for ${first?.name || `order ${order.id}`}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip },
      ]}
    >
      {code ? <CourseTile code={code} size={46} /> : <IconCircle icon="receipt-outline" size={46} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {first?.name || `Order #${order.id}`}
          {more > 0 ? ` +${more} more` : ''}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
          {[code, new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <View style={styles.bottom}>
          <Text style={[styles.amount, { color: colors.text }]}>₦{order.total.toLocaleString()}</Text>
          {status ? (
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <AppIcon name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 3,
    marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  meta: { fontSize: 12, marginTop: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  amount: { fontSize: 15, fontWeight: '800' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

export default OrderListItem;
