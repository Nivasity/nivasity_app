import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import AppIcon from './AppIcon';
import Button from './Button';
import { Card, CourseTile, IconCircle } from './ui';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { ActiveSurvey, BulkClaim, claimsAPI, noticesAPI, SystemAlert } from '../services/api';

// Same notices as the web portal: admin alerts, the survey card and pending claims
// (materials someone paid for on the student's behalf).

// How many times this device closed each alert. Closed once: hidden until the app restarts.
// Closed twice: never shown again (on this device).
const ALERT_CLOSES = 'alertCloses';
const ALERT_MAX_CLOSES = 2;

/** Active system alerts; the student can close each one (gone for good after the 2nd close). */
export function SystemAlerts() {
  const { colors } = useTheme();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [closed, setClosed] = useState<number[]>([]);
  const [closes, setCloses] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    noticesAPI.getAlerts().then(setAlerts).catch(() => setAlerts([]));
    AsyncStorage.getItem(ALERT_CLOSES)
      .then((v) => setCloses(v ? JSON.parse(v) : {}))
      .catch(() => setCloses({}));
  }, []);

  const close = (id: number) => {
    setClosed((c) => [...c, id]);
    setCloses((prev) => {
      const next = { ...(prev || {}), [String(id)]: ((prev || {})[String(id)] || 0) + 1 };
      AsyncStorage.setItem(ALERT_CLOSES, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  // Wait for the saved counts so an alert closed twice never flashes
  if (closes === null) return null;
  const visible = alerts.filter((a) => !closed.includes(a.id) && (closes[String(a.id)] || 0) < ALERT_MAX_CLOSES);
  if (visible.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      {visible.map((a) => {
        const tone =
          a.color === 'red'
            ? { fg: colors.danger, bg: colors.dangerSoft, icon: 'warning-outline' as const }
            : a.color === 'green'
              ? { fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle-outline' as const }
              : { fg: colors.info, bg: colors.infoSoft, icon: 'information-circle-outline' as const };
        return (
          <View key={a.id} style={[styles.alert, { backgroundColor: tone.bg, borderColor: tone.fg + '55' }]}>
            <AppIcon name={tone.icon} size={20} color={tone.fg} />
            <View style={{ flex: 1 }}>
              <AppText style={[styles.alertTitle, { color: tone.fg }]}>{a.title}</AppText>
              <AppText style={[styles.alertBody, { color: colors.text }]}>{a.message}</AppText>
            </View>
            <Pressable onPress={() => close(a.id)} hitSlop={10} accessibilityLabel="Close alert">
              <AppIcon name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

/** Survey invitation as a card. Closing counts as a dismissal (server hides it after 2). */
export function SurveyCard() {
  const { colors } = useTheme();
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);

  useEffect(() => {
    noticesAPI.getSurvey().then(setSurvey).catch(() => setSurvey(null));
  }, []);

  if (!survey) return null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <IconCircle icon="chatbubble-ellipses-outline" size={40} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText style={[styles.surveyTitle, { color: colors.text }]}>{survey.title}</AppText>
          {survey.description ? (
            <AppText numberOfLines={3} style={{ color: colors.textMuted, fontSize: 13 }}>
              {survey.description}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button
              title="Take survey"
              size="sm"
              onPress={() => {
                Linking.openURL(survey.url).catch(() => undefined);
                setSurvey(null);
              }}
            />
            <Button
              title="Not now"
              size="sm"
              variant="ghost"
              onPress={() => {
                noticesAPI.dismissSurvey(survey.id).catch(() => undefined);
                setSurvey(null);
              }}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

/**
 * Pending claims: shows a sheet when a class rep has paid for this student's copy.
 * Accepting adds it to their orders; "Not mine" rejects it.
 */
export function PendingClaimsSheet({ onResolved }: { onResolved?: () => void }) {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [claims, setClaims] = useState<BulkClaim[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const { user } = useAuth();

  const load = useCallback(async () => {
    try {
      const list = await claimsAPI.getPending(10);
      setClaims(list);
      if (list.length > 0) setOpen(true);
    } catch {
      // not available for this account type; ignore
    }
  }, []);

  // Claims are matched on school, department, matric number and name. A new student only has
  // those after the name and academic-details prompts, so check again whenever they change
  // (otherwise a purchase made for them before sign-up is missed until the app restarts).
  useEffect(() => {
    load();
  }, [load, user?.deptId, user?.matricNumber, user?.firstName, user?.lastName]);

  const resolve = async (claim: BulkClaim, action: 'confirm' | 'reject') => {
    setBusy(`${claim.source}-${claim.id}-${action}`);
    try {
      const message = await claimsAPI.resolve(claim, action);
      appMessage.toast({
        status: 'success',
        message: message || (action === 'confirm' ? `${claim.course_code} added to your orders` : 'Claim declined'),
      });
      const rest = claims.filter((c) => !(c.id === claim.id && c.source === claim.source));
      setClaims(rest);
      if (rest.length === 0) setOpen(false);
      onResolved?.();
    } catch (error: any) {
      appMessage.alert({ title: 'Could not update', message: error?.message || 'Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={open && claims.length > 0} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.sheetWrap}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            <IconCircle icon="gift-outline" size={48} />
            <AppText style={[styles.sheetTitle, { color: colors.text }]}>
              {claims.length === 1 ? 'A material was paid for you' : `${claims.length} materials were paid for you`}
            </AppText>
            <AppText style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
              Accept to add it to your orders. If it isn't for you, tap Not mine.
            </AppText>
          </View>
          {claims.map((c) => (
            <Card key={`${c.source}-${c.id}`} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <CourseTile code={c.course_code} size={44} />
                <View style={{ flex: 1 }}>
                  <AppText numberOfLines={2} style={{ color: colors.text, fontWeight: '700' }}>
                    {c.title}
                  </AppText>
                  <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>
                    {c.course_code} · paid by {c.payer_name || 'a course mate'}
                  </AppText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  title="Not mine"
                  variant="outline"
                  size="sm"
                  style={{ flex: 1 }}
                  loading={busy === `${c.source}-${c.id}-reject`}
                  disabled={!!busy}
                  onPress={() => resolve(c, 'reject')}
                />
                <Button
                  title="Accept"
                  size="sm"
                  style={{ flex: 1 }}
                  loading={busy === `${c.source}-${c.id}-confirm`}
                  disabled={!!busy}
                  onPress={() => resolve(c, 'confirm')}
                />
              </View>
            </Card>
          ))}
          <Button title="Later" variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },
  alertTitle: { fontSize: 14, fontWeight: '700' },
  alertBody: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  surveyTitle: { fontSize: 15, fontWeight: '700' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 14,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 4 },
});
