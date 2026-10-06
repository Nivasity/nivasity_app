import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Text from './AppText';
import AppIcon from './AppIcon';
import { useTheme } from '../contexts/ThemeContext';

// Rate this chat: shown under Bella's goodbye when a chat ends. 1-5 stars plus optional feedback.
const BellaRateCard: React.FC<{ rated?: number; onRate: (rating: number, comment: string) => Promise<void> }> = ({ rated, onRate }) => {
  const { colors } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const stars = (value: number, size: number, onPress?: (n: number) => void) => (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} disabled={!onPress} onPress={() => onPress?.(n)} accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}>
          <AppIcon name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? '#f59e0b' : colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (rated) {
    return (
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Thanks for your feedback</Text>
        {stars(rated, 18)}
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>How did Bella do?</Text>
      {stars(rating, 28, setRating)}
      {rating > 0 ? (
        <>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={1000}
            placeholder={rating >= 4 ? 'Anything we did well? (optional)' : 'What could we do better? (optional)'}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
          />
          <TouchableOpacity
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              try {
                await onRate(rating, comment.trim());
              } finally {
                setBusy(false);
              }
            }}
            style={[styles.send, { backgroundColor: colors.accent, opacity: busy ? 0.6 : 1 }]}
          >
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Send rating</Text>}
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 18, padding: 14 },
  input: { marginTop: 12, minHeight: 60, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  send: { marginTop: 10, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
});

export default BellaRateCard;
