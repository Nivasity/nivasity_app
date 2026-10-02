import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useTheme } from '../contexts/ThemeContext';
import AppIcon from './AppIcon';
import { courseColor } from './ui';

interface StoreCardProps {
  code: string;
  name: string;
  status: string;
  level: string;
  price: string;
  onPress?: () => void;
  onAdd?: () => void;
  onShare?: () => void;
  /** In the cart: the + becomes a − that removes it. */
  marked?: boolean;
}

/** Font size so course codes up to 15 characters still fit the cover. */
const codeSize = (code: string) => (code.length <= 8 ? 18 : code.length <= 11 ? 15 : 13);
/** Let long codes wrap after "/" or "&". */
const breakable = (code: string) => code.replace(/([/&])/g, '$1​');

// Store item like the web portal: coloured course cover, title, level, price and a round
// add/remove button with the raised lip. No shadows.
export const StoreCard: React.FC<StoreCardProps> = ({ code, name, status, level, price, onPress, onAdd, onShare, marked }) => {
  const { colors } = useTheme();
  const unavailable = status === 'Unavailable' || !onAdd;
  const cover = courseColor(code);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${name}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip },
      ]}
    >
      <View style={[styles.cover, { backgroundColor: cover }]}>
        <View style={styles.coverBubble} />
        <Text style={styles.coverLevel} numberOfLines={1}>
          {level && level !== '—' ? `${level} LEVEL` : 'MATERIAL'}
        </Text>
        <Text style={[styles.coverCode, { fontSize: codeSize(code) }]} numberOfLines={3}>
          {breakable(code || '—')}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {name}
        </Text>
        {unavailable && status === 'Unavailable' ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Not on sale right now</Text>
        ) : null}
        <View style={styles.bottomRow}>
          <Text style={[styles.price, { color: colors.text }]} numberOfLines={1}>
            {price}
          </Text>
          <View style={styles.actions}>
            {onShare ? (
              <Pressable onPress={onShare} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share item" style={styles.share}>
                <AppIcon name="share-social-outline" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={onAdd}
              disabled={unavailable}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={marked ? `Remove ${code} from cart` : `Add ${code} to cart`}
              style={({ pressed }) => [
                styles.add,
                marked
                  ? { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent }
                  : {
                      backgroundColor: colors.accent,
                      borderBottomWidth: pressed ? 1 : 3,
                      borderBottomColor: colors.accentLip,
                      transform: [{ translateY: pressed ? 1 : 0 }],
                    },
                unavailable && { opacity: 0.4 },
              ]}
            >
              <AppIcon name={marked ? 'remove' : 'add'} size={22} color={marked ? colors.accent : colors.onAccent} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 3,
    marginBottom: 12,
  },
  cover: {
    width: 96,
    minHeight: 96,
    borderRadius: 18,
    padding: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  coverBubble: {
    position: 'absolute',
    top: -22,
    right: -22,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  coverLevel: { color: 'rgba(255,255,255,0.92)', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  coverCode: { color: '#FFFFFF', fontWeight: '800', letterSpacing: -0.3, lineHeight: undefined },
  body: { flex: 1, minWidth: 0, paddingVertical: 2 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 },
  price: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  share: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  add: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

export default StoreCard;
