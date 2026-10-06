import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Text from './AppText';
import AppIcon from './AppIcon';
import { useTheme } from '../contexts/ThemeContext';

// Rate this chat. Tapping a star saves the rating at once; feedback is an optional second step
// that updates the same rating. onExpand lets the chat scroll the feedback box into view.
const BellaRateCard: React.FC<{
  rated?: number;
  onRate: (rating: number, comment: string) => Promise<void>;
  onExpand?: () => void;
}> = ({ rated, onRate, onExpand }) => {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<'stars' | 'feedback' | 'done'>(rated ? 'done' : 'stars');
  const [rating, setRating] = useState(rated || 0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async (n: number) => {
    if (busy) return;
    setRating(n);
    setBusy(true);
    try {
      await onRate(n, '');
      setPhase('feedback');
      setTimeout(() => onExpand?.(), 150);
    } finally {
      setBusy(false);
    }
  };

  const sendFeedback = async () => {
    setBusy(true);
    try {
      await onRate(rating, comment.trim());
      setPhase('done');
    } finally {
      setBusy(false);
    }
  };

  const stars = (size: number, interactive: boolean) => (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} disabled={!interactive || busy} onPress={() => pick(n)} accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}>
          <AppIcon name={n <= rating ? 'star' : 'star-outline'} size={size} color={n <= rating ? '#f59e0b' : colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (phase === 'done') {
    return (
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Thanks for your feedback</Text>
        {stars(18, false)}
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{phase === 'stars' ? 'How did Bella do?' : 'Thanks! Your rating is saved.'}</Text>
      {stars(phase === 'stars' ? 28 : 20, phase === 'stars')}
      {busy && phase === 'stars' ? <ActivityIndicator color={colors.accent} style={{ marginTop: 8, alignSelf: 'flex-start' }} /> : null}
      {phase === 'feedback' ? (
        <>
          <TextInput
            value={comment}
            onChangeText={setComment}
            onFocus={() => setTimeout(() => onExpand?.(), 300)}
            multiline
            maxLength={1000}
            placeholder={rating >= 4 ? 'Anything we did well? (optional)' : 'What could we do better? (optional)'}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity onPress={() => setPhase('done')} disabled={busy} style={[styles.skip, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy || !comment.trim()}
              onPress={sendFeedback}
              style={[styles.send, { backgroundColor: colors.accent, opacity: busy || !comment.trim() ? 0.5 : 1 }]}
            >
              {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Send feedback</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 18, padding: 14 },
  input: { marginTop: 12, minHeight: 60, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  skip: { borderWidth: 1, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  send: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
});

export default BellaRateCard;
