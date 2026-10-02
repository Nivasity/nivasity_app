import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import AppText from '../components/AppText';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import OptionPickerDialog from '../components/OptionPickerDialog';
import PinConfirmSheet from '../components/PinConfirmSheet';
import { Card, Chip, CourseTile, Divider, IconButton, IconCircle } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { bulkAPI, BulkMaterial, BulkPayResult, BulkPreview } from '../services/api';
import { downloadAndShareReceipt } from '../utils/receiptPdf';

type Props = { navigation: any };
type Step = 0 | 1 | 2;
const STEPS = ['Students', 'Review', 'Done'];
const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const label = (m: BulkMaterial) => `${m.course_code} · ${m.title} (${naira(m.price)})`;

// Pay for course mates' copies from the wallet, same flow as the website:
// 1. material + students (paste or CSV) -> 2. review matches and total, Confirm opens the
// PIN sheet (confirms on the 4th digit) -> 3. done, with the receipt.
const BulkPaymentScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { refreshSummary } = useWallet();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<BulkMaterial[]>([]);
  const [feePercent, setFeePercent] = useState(5);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [step, setStep] = useState<Step>(0);
  const [material, setMaterial] = useState<BulkMaterial | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mode, setMode] = useState<'paste' | 'csv'>('paste');
  const [records, setRecords] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [result, setResult] = useState<BulkPayResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bulkAPI
      .manuals()
      .then((d) => {
        setMaterials(d.materials);
        setFeePercent(d.fee_percent);
        setWarnings(d.wallet?.warnings || []);
      })
      .catch((e: any) => setError(e?.message || 'Bulk payment is not available right now'))
      .finally(() => setLoading(false));
  }, []);

  const pickCsv = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setFile({ uri: a.uri, name: a.name || 'students.csv', type: a.mimeType || 'text/csv' });
  };

  const toReview = async () => {
    if (!material) return setError('Choose a material first');
    setBusy(true);
    setError(null);
    try {
      const data = mode === 'csv' && file ? await bulkAPI.previewFile(material.id, file) : await bulkAPI.previewText(material.id, records);
      setPreview(data);
      setStep(1);
    } catch (e: any) {
      setError(e?.message || 'Could not check the list');
    } finally {
      setBusy(false);
    }
  };

  // Called by the PIN sheet on the 4th digit; throwing keeps it open with the message.
  const pay = async (pin: string) => {
    if (!preview) return;
    const paid = await bulkAPI.pay(preview.manual.id, preview.payment_rows, pin);
    setResult(paid);
    setPinOpen(false);
    setStep(2);
    refreshSummary().catch(() => undefined);
  };

  const startOver = () => {
    setStep(0);
    setPreview(null);
    setResult(null);
    setRecords('');
    setFile(null);
    setError(null);
  };

  const canNext = !!material && (mode === 'paste' ? records.trim().length > 0 : !!file);
  const canPay = !!preview && preview.can_submit_payment && preview.wallet.has_enough_balance;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText style={[styles.title, { color: colors.text }]}>Bulk payment</AppText>
          <AppText style={{ color: colors.textMuted, fontSize: 13 }}>Pay for course mates · {feePercent}% fee</AppText>
        </View>
      </View>

      {/* Stepper */}
      <View style={styles.stepper}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: i < step ? colors.success : i === step ? colors.accent : colors.surfaceAlt,
                  borderBottomWidth: i <= step ? 2 : 0,
                  borderBottomColor: i < step ? '#0E7A36' : colors.accentLip,
                },
              ]}
            >
              {i < step ? (
                <AppIcon name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <AppText style={{ color: i === step ? colors.onAccent : colors.textMuted, fontSize: 12, fontWeight: '700' }}>{i + 1}</AppText>
              )}
            </View>
            <AppText style={{ color: i === step ? colors.text : colors.textMuted, fontSize: 13, fontWeight: '600' }}>{s}</AppText>
            {i < STEPS.length - 1 ? <View style={[styles.stepLine, { backgroundColor: i < step ? colors.success : colors.border }]} /> : null}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
            <AppText style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>{error}</AppText>
          </View>
        ) : null}
        {step === 0 && warnings.length > 0 ? (
          <View style={[styles.error, { backgroundColor: colors.accentSoft }]}>
            {warnings.map((w) => (
              <AppText key={w} style={{ color: colors.text, fontSize: 13 }}>
                • {w}
              </AppText>
            ))}
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
        ) : step === 0 ? (
          materials.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="No materials to pay for yet"
              subtitle="Bulk payment lists the materials on sale for your department this semester."
              actionLabel="Request a material"
              onAction={() => navigation.navigate('MaterialRequests')}
            />
          ) : (
            <Card style={{ gap: 14 }}>
              <View>
                <AppText style={[styles.label, { color: colors.textMuted }]}>Material</AppText>
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={[styles.select, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  accessibilityRole="button"
                >
                  {material ? <CourseTile code={material.course_code} size={32} /> : null}
                  <AppText numberOfLines={1} style={{ flex: 1, color: material ? colors.text : colors.textMuted, fontSize: 15 }}>
                    {material ? `${material.course_code} · ${material.title}` : 'Choose a material'}
                  </AppText>
                  <AppIcon name="chevron-down" size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <View>
                <AppText style={[styles.label, { color: colors.textMuted }]}>Students</AppText>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <Chip label="Paste list" active={mode === 'paste'} onPress={() => setMode('paste')} />
                  <Chip label="Upload CSV" active={mode === 'csv'} onPress={() => setMode('csv')} />
                </View>
                {mode === 'paste' ? (
                  <>
                    <TextInput
                      value={records}
                      onChangeText={setRecords}
                      multiline
                      placeholder={'Ada, Obi, 20201234\nTunde, Bello, 20201235'}
                      placeholderTextColor={colors.textMuted}
                      style={[styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                      textAlignVertical="top"
                      autoCapitalize="words"
                    />
                    <AppText style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                      One student per line: first name, last name, matric number.
                    </AppText>
                  </>
                ) : (
                  <Pressable onPress={pickCsv} style={[styles.select, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <AppIcon name="document-attach-outline" size={20} color={colors.accent} />
                    <AppText numberOfLines={1} style={{ flex: 1, color: file ? colors.text : colors.textMuted }}>
                      {file ? file.name : 'Choose a CSV file (first_name, last_name, matric_no)'}
                    </AppText>
                  </Pressable>
                )}
              </View>

              <Button title="Next" icon="arrow-forward" onPress={toReview} loading={busy} disabled={!canNext} />
            </Card>
          )
        ) : step === 1 && preview ? (
          <>
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <CourseTile code={preview.manual.course_code} size={44} />
                <View style={{ flex: 1 }}>
                  <AppText numberOfLines={2} style={{ color: colors.text, fontWeight: '700' }}>
                    {preview.manual.title}
                  </AppText>
                  <AppText style={{ fontSize: 13 }}>
                    <AppText style={{ color: colors.success, fontWeight: '700' }}>{preview.valid_count} ready</AppText>
                    {preview.invalid_count > 0 ? (
                      <AppText style={{ color: colors.danger, fontWeight: '700' }}> · {preview.invalid_count} need fixing</AppText>
                    ) : null}
                  </AppText>
                </View>
              </View>
            </Card>

            <Card padded={false}>
              {preview.rows.map((r, i) => {
                const ok = r.status === 'valid';
                return (
                  <View key={`${r.line_number}-${r.matric_no}`}>
                    {i > 0 ? <Divider /> : null}
                    <View style={styles.row}>
                      <AppIcon name={ok ? 'checkmark-circle' : 'close-circle'} size={18} color={ok ? colors.success : colors.danger} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText numberOfLines={1} style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                          {r.first_name} {r.last_name}
                        </AppText>
                        <AppText numberOfLines={2} style={{ color: colors.textMuted, fontSize: 12 }}>
                          {r.matric_no} · {r.message}
                        </AppText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
            {preview.invalid_count > 0 ? (
              <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
                Rows that need fixing are skipped. Go back to fix them, or continue with the ready ones.
              </AppText>
            ) : null}

            <Card style={{ gap: 8 }}>
              <Line k="Subtotal" v={naira(preview.breakdown.subtotal)} />
              <Line k={`Fee (${preview.breakdown.fee_percent}%)`} v={naira(preview.breakdown.fee_amount)} />
              <Divider />
              <Line k="Total" v={naira(preview.breakdown.total_amount)} bold />
              <Line k="Wallet balance" v={naira(preview.wallet.balance)} muted />
            </Card>

            {preview.can_submit_payment && !preview.wallet.has_enough_balance ? (
              <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
                <AppText style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>Your wallet balance is too low for this list.</AppText>
                <Pressable onPress={() => navigation.navigate('WalletFund')}>
                  <AppText style={{ color: colors.accent, fontWeight: '700', marginTop: 4 }}>Add money</AppText>
                </Pressable>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Back" variant="outline" icon="arrow-back" onPress={() => setStep(0)} style={{ flex: 1 }} />
              <Button
                title={`Confirm ${naira(preview.breakdown.total_amount)}`}
                onPress={() => setPinOpen(true)}
                disabled={!canPay}
                style={{ flex: 2 }}
              />
            </View>
          </>
        ) : step === 2 && result ? (
          <Card style={{ alignItems: 'center', gap: 12, padding: 22 }}>
            <IconCircle icon="checkmark" size={60} color={colors.success} background={colors.successSoft} />
            <AppText style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
              Paid for {result.student_count} student{result.student_count === 1 ? '' : 's'}
            </AppText>
            <AppText style={{ color: colors.textMuted, textAlign: 'center' }}>
              Each student will see the material in their account, or can claim it after signing up.
            </AppText>
            <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 6 }}>
              <Line k="Total paid" v={naira(result.total_amount)} bold />
              <Line k="Wallet balance" v={naira(result.wallet_balance_after)} muted />
              <Line k="Reference" v={result.ref_id} muted />
            </View>
            <Button
              title="Download receipt"
              icon="download-outline"
              loading={downloading}
              style={{ alignSelf: 'stretch' }}
              onPress={async () => {
                setDownloading(true);
                try {
                  await downloadAndShareReceipt(result.ref_id);
                } catch (e: any) {
                  setError(e?.message || 'Could not download the receipt');
                } finally {
                  setDownloading(false);
                }
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Button title="Done" variant="outline" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
              <Button title="Pay another list" variant="ghost" onPress={startOver} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : null}
      </ScrollView>

      <OptionPickerDialog
        visible={pickerOpen}
        title="Choose a material"
        options={materials.map(label)}
        selected={material ? label(material) : ''}
        onClose={() => setPickerOpen(false)}
        onSelect={(value) => {
          setMaterial(materials.find((m) => label(m) === value) || null);
          setPickerOpen(false);
        }}
        searchEnabled
        searchPlaceholder="Search course code or title"
      />

      {preview ? (
        <PinConfirmSheet
          visible={pinOpen}
          onClose={() => setPinOpen(false)}
          title="Confirm bulk payment"
          description={`${preview.valid_count} student${preview.valid_count === 1 ? '' : 's'} · ${preview.manual.course_code}`}
          amount={naira(preview.breakdown.total_amount)}
          onConfirm={pay}
        />
      ) : null}
    </SafeAreaView>
  );
};

const Line = ({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <AppText style={{ color: colors.textMuted, fontSize: bold ? 15 : 14, fontWeight: bold ? '700' : '400' }}>{k}</AppText>
      <AppText style={{ color: muted ? colors.textMuted : colors.text, fontSize: bold ? 16 : 14, fontWeight: bold ? '800' : '600', flexShrink: 1, textAlign: 'right' }}>
        {v}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  stepper: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  stepItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, height: 2, borderRadius: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  error: { borderRadius: 16, padding: 12, gap: 2 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, minHeight: 52, paddingHorizontal: 12 },
  textarea: { borderWidth: 1, borderRadius: 16, minHeight: 150, padding: 12, fontSize: 14, fontFamily: 'Geist-Regular' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
});

export default BulkPaymentScreen;
