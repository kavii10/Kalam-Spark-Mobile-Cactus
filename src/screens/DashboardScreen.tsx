import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOfflineReady, isModelDownloaded } from '../services/llmService';
import { generateCareerSummary } from '../services/apiService';

const COLORS = {
  bg: '#070e20', card: '#0a1838', border: 'rgba(255,140,66,0.22)',
  primary: '#ff8c42', primaryLight: '#ffb380', text: '#ffb380',
  textMuted: 'rgba(255,160,100,0.5)', accent: '#00d4ff',
  success: '#22c55e', warning: '#f59e0b',
};

const STAT_CARDS = [
  { icon: '🗺️', label: 'Roadmap', key: 'roadmapStage' },
  { icon: '✅', label: 'Tasks Done', key: 'tasksDone' },
  { icon: '🎯', label: 'Quiz Score', key: 'quizScore' },
  { icon: '🔥', label: 'Streak', key: 'streak' },
];

export default function DashboardScreen() {
  const [profile, setProfile] = useState({ dream: '', branch: '', year: '' });
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [modelExists, setModelExists] = useState(false);
  const [stats, setStats] = useState({ roadmapStage: 'Stage 1', tasksDone: '0', quizScore: '0%', streak: '0 days' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [dream, branch, year] = await AsyncStorage.multiGet(['dream', 'branch', 'year'])
      .then(pairs => pairs.map(([, v]) => v || ''));
    setProfile({ dream, branch, year });
    setOfflineReady(isOfflineReady());
    setModelExists(await isModelDownloaded());

    // Load summary
    if (dream && !summary) {
      setLoadingSummary(true);
      try {
        const s = await generateCareerSummary(dream, branch, year);
        setSummary(s);
      } catch { setSummary('Your AI-powered career journey starts here.'); }
      finally { setLoadingSummary(false); }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.dreamTitle}>{profile.dream || 'Your Career Journey'}</Text>
            <Text style={styles.profileSub}>{profile.year} · {profile.branch}</Text>
          </View>
          <Text style={styles.rocketEmoji}>🚀</Text>
        </View>

        {/* AI Status Badge */}
        <View style={[styles.statusBadge, { borderColor: offlineReady ? COLORS.success : COLORS.warning }]}>
          <View style={[styles.statusDot, { backgroundColor: offlineReady ? COLORS.success : COLORS.warning }]} />
          <Text style={[styles.statusText, { color: offlineReady ? COLORS.success : COLORS.warning }]}>
            {offlineReady
              ? '🤖 Gemma 4 On-Device: Ready (Offline Mode Available)'
              : modelExists
                ? '⏳ Gemma 4 model found but not loaded yet'
                : '☁️ Cloud Mode: OpenRouter → Google AI Studio'}
          </Text>
        </View>

        {/* Career Summary */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>🧠 AI Career Summary</Text>
          {loadingSummary
            ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
            : <Text style={styles.summaryText}>{summary || 'Loading your personalized summary...'}</Text>
          }
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map(s => (
            <View key={s.key} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{stats[s.key as keyof typeof stats]}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: '🗺️', label: 'View Roadmap' },
            { icon: '📋', label: 'Today\'s Tasks' },
            { icon: '💬', label: 'Ask Mentor' },
            { icon: '📄', label: 'File Speaker' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionCard}>
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  greeting: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  dreamTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primaryLight, maxWidth: 240 },
  profileSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rocketEmoji: { fontSize: 40 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 10, padding: 10,
    borderWidth: 1, marginBottom: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600', flex: 1 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  cardLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600', marginBottom: 8 },
  summaryText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.card, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primaryLight },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.card, borderRadius: 14,
    padding: 18, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', gap: 8,
  },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: 12, color: COLORS.text, fontWeight: '600', textAlign: 'center' },
});
