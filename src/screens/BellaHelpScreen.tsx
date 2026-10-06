import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import AppIcon from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { BellaArticle, bellaAPI } from '../services/api';

// Bella menu > Help articles: the approved answers Bella uses, for students to browse themselves.
const BellaHelpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<BellaArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      bellaAPI
        .articles(q)
        .then((r) => {
          setItems(r);
          setError(null);
        })
        .catch((e) => {
          setItems([]);
          setError(e.message);
        });
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <AppIcon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Help articles</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppIcon name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search refunds, fees, collection…"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, paddingVertical: 10 }}
          />
        </View>
        <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {items === null ? (
            <ActivityIndicator color={colors.accent} style={{ margin: 20 }} />
          ) : items.length === 0 ? (
            <Text style={{ color: colors.textMuted, padding: 16 }}>{error || (q ? 'No article matches that.' : 'No articles yet.')}</Text>
          ) : (
            items.map((a, i) => (
              <View key={a.id} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : undefined}>
                <TouchableOpacity onPress={() => setOpen(open === a.id ? null : a.id)} style={styles.row}>
                  <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{a.title}</Text>
                  <AppIcon name={open === a.id ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {open === a.id ? <Text style={{ color: colors.textMuted, paddingHorizontal: 14, paddingBottom: 14, lineHeight: 20 }}>{a.body}</Text> : null}
              </View>
            ))
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Bella')} style={[styles.ask, { backgroundColor: colors.accent }]}>
          <AppIcon name="sparkles" size={18} color={colors.onAccent} />
          <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Didn't find it? Ask Bella</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { padding: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, marginBottom: 14 },
  list: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  ask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 13, marginTop: 18 },
});

export default BellaHelpScreen;
