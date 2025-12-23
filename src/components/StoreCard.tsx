import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AppIcon from './AppIcon';

interface StoreCardProps {
  code: string;
  name: string;
  status: string;
  date: string;
  price: string;
  onPress?: () => void;
  onAdd?: () => void;
  onShare?: () => void;
  marked?: boolean;
}

const TOP_ACTION_SIZE = 150;
const CUTOUT_SIZE = TOP_ACTION_SIZE;
const CUTOUT_RADIUS = CUTOUT_SIZE / 2;
const BOTTOM_ACTION_SIZE = 46;

export const StoreCard: React.FC<StoreCardProps> = ({
  code,
  name,
  date,
  price,
  onPress,
  onAdd,
  onShare,
  marked,
}) => {
  const { colors, isDark } = useTheme();
  const addIsActive = Boolean(onAdd);
  const shareIsActive = Boolean(onShare);
  const pressIsActive = Boolean(onPress);
  const CardContainer = pressIsActive ? TouchableOpacity : View;

  return (
    <View style={styles.cardWrap}>
      <CardContainer
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surface : colors.accent,
          },
        ]}
        {...(pressIsActive
          ? {
            onPress,
            activeOpacity: 0.9,
            accessibilityRole: 'button' as const,
            accessibilityLabel: `Open details for ${name}`,
          }
          : {})}
      >
        {/* Make the cutout itself the button */}
        <View style={styles.cutoutButton}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: marked ? colors.secondary : colors.accentCard,
              },
              !addIsActive && { opacity: 0.55 },
            ]}
            onPress={onAdd}
            disabled={!addIsActive}
            activeOpacity={0.9}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={marked ? 'Remove from cart' : 'Add to cart'}
          >
            <AppIcon
              name={marked ? 'checkmark' : 'add'}
              size={28}
              color={marked ? colors.background : colors.secondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.onCard }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.code, { color: colors.onCard }]} numberOfLines={1}>
            {code}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.metaItem, styles.metaItemRight]}>
            <Text style={{ color: colors.onCard }}>
              Deadline:</Text>
            <Text style={[styles.metaText, { color: colors.onCard }]} numberOfLines={1}>
              {date}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.pricePill,
            {
              backgroundColor: colors.background,
              borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.22)',
            },
          ]}
        >
          <Text style={[styles.price, { color: colors.secondary }]} numberOfLines={1}>
            {price}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.shareAction,
            { borderColor: 'transparent' },
            !shareIsActive && { opacity: 0.55 },
          ]}
          onPress={onShare}
          disabled={!shareIsActive}
          activeOpacity={0.9}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Share item"
        >
          <AppIcon name="share-social-outline" size={25} color={colors.secondary} />
        </TouchableOpacity>
      </CardContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrap: {
    width: '100%',
    marginBottom: 20,
  },
  card: {
    borderWidth: 0,
    borderRadius: 25,
    padding: 18,
    paddingRight: 76,
    position: 'relative',
    minHeight: 190,
    overflow: 'hidden',
  },
  // Remove old cutout and topAction styles, replace with cutoutButton
  cutoutButton: {
    position: 'absolute',
    top: -CUTOUT_RADIUS,
    right: -CUTOUT_RADIUS,
  },
  iconButton: {
    width: TOP_ACTION_SIZE,
    height: TOP_ACTION_SIZE,
    borderRadius: TOP_ACTION_SIZE / 2,
    padding: 28,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    // No shadow, only subtle outline if needed
  },
  header: {
    paddingTop: 8,
    marginBottom: 14,
    gap: 4,
  },
  name: {
    fontSize: 20,
    letterSpacing: -0.2,
    fontWeight: '600',
  },
  code: {
    letterSpacing: 0.2,
    fontSize: 16,
    opacity: 0.92,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  metaCol: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItemRight: {
    justifyContent: 'flex-end',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metalLabel: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareAction: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: BOTTOM_ACTION_SIZE,
    height: BOTTOM_ACTION_SIZE,
    borderRadius: BOTTOM_ACTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pricePill: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    maxWidth: '78%',
  },
  price: {
    fontWeight: '600',
    fontSize: 18,
  },
});

export default StoreCard;
