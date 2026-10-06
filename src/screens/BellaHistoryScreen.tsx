import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Text from '../components/AppText';
import AppIcon from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { BellaEscalation, bellaAPI } from '../services/api';

// Bella menu > My handovers & tickets: chats Bella passed to the team, and a link to older tickets.
const STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Waiting for the team', color: '#d97706' },
  answered: { label: 'Team replied', color: '#2563eb' },
  resolved: { label: 'Resolved', color: '#059669' },
};
const when = (v: string) => {
  const d = new Date(v.replace(' ', 'T') + 'Z');
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

const BellaHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [items, setItems] = useState<BellaEscalation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      bellaAPI
        .escalations()
        .then((r) => {
          setItems(r);
          setError(null);
        })
        .catch((e) => {
          setItems([]);
          setError(e.message);
        });
    }, []),
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <AppIcon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My handovers & tickets</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={{ color: colors.textMuted, marginBottom: 14 }}>When Bella passes your chat to the Nivasity team, it shows here.</Text>
        <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {items === null ? (
            <ActivityIndicator color={colors.accent} style={{ margin: 20 }} />
          ) : items.length === 0 ? (
            <Text style={{ color: colors.textMuted, padding: 16 }}>
              {error || "Nothing here yet. Bella hands your chat to the team when she can't sort something out herself."}
            </Text>
          ) : (
            items.map((e, i) => {
              const st = STATUS[e.status] || STATUS.open;
              return (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => navigation.navigate('Bella')}
                  style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                >
                  <AppIcon name="headset-outline" size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={{ color: colors.text, fontWeight: '600' }}>{e.student_message || 'Your chat'}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                      <Text style={{ color: st.color, fontWeight: '800' }}>{st.label}</Text> · {when(e.created_at)}
                    </Text>
                  </View>
                  <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SupportTickets')} style={[styles.list, styles.row, { marginTop: 16, borderColor: colors.border, backgroundColor: colors.surface }]}>
          <AppIcon name="chatbubbles-outline" size={20} color={colors.accent} />
          <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>Older support tickets</Text>
          <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
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
  list: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});

export default BellaHistoryScreen;
