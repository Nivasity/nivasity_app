import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { paymentAPI } from '../services/api';
import Button from '../components/Button';

type PaymentReturnScreenProps = {
  navigation: any;
  route: { params?: { tx_ref?: string; txRef?: string; status?: string } };
};

const PaymentReturnScreen: React.FC<PaymentReturnScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();

  const txRef = useMemo(() => {
    const raw = route?.params?.tx_ref || route?.params?.txRef;
    return (raw || '').trim();
  }, [route?.params?.tx_ref, route?.params?.txRef]);

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!txRef) {
        setVerifying(false);
        setVerified(false);
        return;
      }
      try {
        const result = await paymentAPI.verifyPayment(txRef);
        if (!mounted) return;
        setVerified(result.status === 'success');
      } catch (e: any) {
        if (!mounted) return;
        setVerified(false);
        appMessage.alert({
          title: 'Payment Verification Failed',
          message: e?.response?.data?.message || e?.message || 'Could not verify payment',
        });
      } finally {
        if (!mounted) return;
        setVerifying(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [appMessage, txRef]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Payment</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {txRef ? `Reference: ${txRef}` : 'Missing transaction reference'}
        </Text>

        <View style={styles.statusRow}>
          {verifying ? <ActivityIndicator color={colors.accent} /> : null}
          {!verifying && verified === true ? (
            <Text style={[styles.statusText, { color: colors.success }]}>Verified</Text>
          ) : null}
          {!verifying && verified === false ? (
            <Text style={[styles.statusText, { color: colors.danger }]}>Not verified</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            title="Go to Orders"
            onPress={() => navigation.navigate('StudentMain', { screen: 'Orders' })}
            disabled={verifying}
            variant="primary"
            style={styles.action}
          />
          <Button
            title="Back to Store"
            onPress={() => navigation.navigate('StudentMain', { screen: 'Store' })}
            disabled={verifying}
            variant="outline"
            style={styles.action}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 22,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '900',
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});

export default PaymentReturnScreen;
