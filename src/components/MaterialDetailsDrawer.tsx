import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Product } from '../types';
import AppIcon from './AppIcon';
import Button from './Button';

type MaterialDetailsDrawerProps = {
  visible: boolean;
  product: Product | null;
  inCart: boolean;
  onClose: () => void;
  onToggleCart: () => void;
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
  onToggleCart,
  onShare,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const title = product?.name ?? '';
  const subtitle = product?.description ?? '';
  const price = useMemo(() => {
    if (!product) return '';
    return `₦${product.price.toLocaleString()}`;
  }, [product]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
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
                <Text style={[styles.priceText, { color: colors.secondary }]} numberOfLines={1}>
                  {price}
                </Text>
              </View>

              <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Row label="Department" value={product.department || '—'} />
                <Row label="Faculty" value={product.faculty || '—'} />
                <Row label="Level" value={product.level || '—'} />
                <Row label="Date posted" value={formatDate(product.createdAt)} />
                <Row label="Deadline" value={formatDate(product.deadlineAt)} />
              </View>

              <View style={styles.actions}>
                <Button
                  title={inCart ? 'Remove from cart' : 'Add to cart'}
                  onPress={onToggleCart}
                  variant={inCart ? 'outline' : 'primary'}
                  style={styles.actionButton}
                />
                <Button title="Share" onPress={onShare} variant="outline" style={styles.actionButton} />
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.40)',
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
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
  },
  section: {
    borderWidth: 1,
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
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'right',
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});

export default MaterialDetailsDrawer;

