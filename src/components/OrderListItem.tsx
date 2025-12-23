import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppIcon from './AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { Order } from '../types';

interface OrderListItemProps {
  order: Order;
  onPress?: () => void;
}

const OrderListItem: React.FC<OrderListItemProps> = ({ order, onPress }) => {
  const { colors } = useTheme();
  // Choose icon and color based on status
  let icon: import('./AppIcon').AppIconName = 'checkmark-circle-outline';
  let iconColor = colors.success;
  if (order.status === 'processing') {
    icon = 'time-outline';
    iconColor = colors.warning;
  } else if (order.status === 'cancelled' || order.status === 'failed') {
    icon = 'close-circle-outline';
    iconColor = colors.danger;
  } else if (order.status === 'refunded') {
    icon = 'refresh-circle-outline';
    iconColor = colors.secondary;
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.orderCard, { backgroundColor: 'transparent' }]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Open receipt for order ${order.id}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AppIcon name={icon} size={22} color={iconColor} />
        <View>
          <Text style={[styles.orderNumber, { color: colors.text }]} numberOfLines={1}>
            Order #{order.id}
          </Text>
          <Text style={[styles.orderMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {new Date(order.createdAt).toLocaleDateString()} - {order.items.length} item{order.items.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
      <View>
        <Text style={[styles.orderAmount, { color: colors.text }]} numberOfLines={1}>
          ₦{order.total.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  orderMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
});

export default OrderListItem;
