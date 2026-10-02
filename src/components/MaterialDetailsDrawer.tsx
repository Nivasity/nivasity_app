import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { Product } from '../types';
import AppIcon from './AppIcon';
import Button from './Button';

type MaterialDetailsDrawerProps = {
  visible: boolean;
  product: Product | null;
  inCart: boolean;
  onClose: () => void;
  /** No longer shown here (the store card's + / − handles the cart); kept for callers. */
  onToggleCart?: () => void;
  /** Opens bulk payment with this material selected. */
  onPayForMates?: () => void;
  onShare: () => void;
};

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const Row = ({ label, value }: { label: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const MaterialDetailsDrawer: React.FC<MaterialDetailsDrawerProps> = ({
  visible,
  product,
  inCart,
  onClose,
  onPayForMates,
  onShare,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const highlightColor = isDark ? colors.accentMuted : colors.secondary;

  const title = product?.name ?? '';
  const subtitle = product?.description ?? '';
  const hostedBy = useMemo(() => {
    const raw = product?.hostFacultyName?.trim() || product?.faculty?.trim() || '';
    if (!raw) return '—';
    if (/faculty$/i.test(raw)) return raw;
    return `${raw} Faculty`;
  }, [product?.faculty, product?.hostFacultyName]);
  const price = useMemo(() => {
    if (!product) return '';
    return `₦ ${product.price.toLocaleString()}`;
  }, [product]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <BlurView
            intensity={28}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)' },
            ]}
          />
        </Pressable>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: 14 + insets.bottom,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {product ? (
            <>
              <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
                    {subtitle}
                  </Text>
                </View>
                <Text style={[styles.priceText, { color: highlightColor }]} numberOfLines={1}>
                  {price}
                </Text>
              </View>

              <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Row label="Department" value={product.department || '—'} />
                <Row label="Hosted by:" value={hostedBy} />
                <Row label="Level" value={product.level || '—'} />
                <Row label="Date posted" value={formatDate(product.createdAt)} />
              </View>

              <View style={styles.actions}>
                {onPayForMates ? (
                  <Button title="Pay for Course Mates" icon="people-outline" onPress={onPayForMates} style={styles.actionButton} />
                ) : null}
                <Pressable
                  onPress={onShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share material"
                  style={({ pressed }) => [
                    styles.shareButton,
                    { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
                  ]}
                >
                  <AppIcon name="share-social-outline" size={20} color={colors.text} />
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  handle: {
    width: 46,
    height: 4,
    borderRadius: 99,
    opacity: 0.9,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
  },
  section: {
    borderWidth: 1,
    borderBottomWidth: 3,
    borderRadius: 25,
    overflow: 'hidden',
  },
  row: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
  },
});

export default MaterialDetailsDrawer;
