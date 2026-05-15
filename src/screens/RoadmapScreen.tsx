import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateRoadmap } from '../services/apiService';

const COLORS = {
  bg: '#070e20', card: '#0a1838', border: 'rgba(255,140,66,0.22)',
  primary: '#ff8c42', primaryLight: '#ffb380', text: '#ffb380',
  textMuted: 'rgba(255,160,100,0.5)', accent: '#00d4ff', success: '#22c55e',
};

const STAGE_COLORS = ['#ff8c42', '#00d4ff', '#a78bfa', '#22c55e'];

export default function RoadmapScreen() {
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({ dream: '', branch: '', year: '' });

  useEffect(() => { loadRoadmap(); }, []);

  async function loadRoadmap() {
    const [dream, branch, year] = await AsyncStorage.multiGet(['dream', 'branch', 'year'])
      .then(pairs => pairs.map(([, v]) => v || ''));
    setProfile({ dream, branch, year });

    // Try cached roadmap first
    const cached = await AsyncStorage.getItem(`roadmap_${dream}`);
    if (cached) { setRoadmap(JSON.parse(cached)); return; }

    // Generate new roadmap
    if (dream) fetchRoadmap(dream, branch, year);
  }

  async function fetchRoadmap(dream: string, branch: string, year: string) {
    setLoading(true); setError('');
    try {
      const data = await generateRoadmap(dream, branch, year);
      setRoadmap(data);
      await AsyncStorage.setItem(`roadmap_${dream}`, JSON.stringify(data));
    } catch (e: any) {
      setError('Could not generate roadmap. Please check your connection and try again.');
    } finally { setLoading(false); }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Generating your roadmap...</Text>
          <Text style={styles.loadingHint}>Crawling industry sources + Gemma 4 reasoning</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn}
            onPress={() => fetchRoadmap(profile.dream, profile.branch, profile.year)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!roadmap) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>No roadmap yet</Text>
          <TouchableOpacity style={styles.retryBtn}
            onPress={() => fetchRoadmap(profile.dream, profile.branch, profile.year)}>
            <Text style={styles.retryText}>Generate Roadmap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Text style={styles.title}>🗺️ {roadmap.dream || profile.dream}</Text>
        <Text style={styles.summary}>{roadmap.summary}</Text>

        {/* Timeline */}
        {(roadmap.stages || []).map((stage: any, i: number) => {
          const color = STAGE_COLORS[i % STAGE_COLORS.length];
          const isOpen = expanded === i;
          return (
            <View key={i} style={styles.stageWrapper}>
              <View style={[styles.stageLine, { backgroundColor: color }]} />
              <TouchableOpacity
                style={[styles.stageCard, { borderColor: `${color}44` }]}
                onPress={() => setExpanded(isOpen ? null : i)}
              >
                <View style={styles.stageHeader}>
                  <View style={[styles.stageNum, { backgroundColor: `${color}22`, borderColor: color }]}>
                    <Text style={[styles.stageNumText, { color }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.stageTitleBlock}>
                    <Text style={[styles.stageTitle, { color }]}>{stage.title}</Text>
                    <Text style={styles.stageDuration}>{stage.duration}</Text>
                  </View>
                  <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </View>

                {isOpen && (
                  <View style={styles.stageBody}>
                    <Text style={styles.conceptsLabel}>Key Concepts</Text>
                    <View style={styles.conceptsGrid}>
                      {(stage.concepts || []).map((c: string, j: number) => (
                        <View key={j} style={styles.conceptTag}>
                          <Text style={styles.conceptText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                    {stage.project && (
                      <View style={styles.projectCard}>
                        <Text style={styles.projectLabel}>🔨 Project</Text>
                        <Text style={styles.projectTitle}>{stage.project.title}</Text>
                        <Text style={styles.projectDesc}>{stage.project.description}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Regenerate */}
        <TouchableOpacity style={styles.regenBtn}
          onPress={async () => {
            await AsyncStorage.removeItem(`roadmap_${profile.dream}`);
            fetchRoadmap(profile.dream, profile.branch, profile.year);
          }}>
          <Text style={styles.regenText}>🔄 Regenerate Roadmap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.primaryLight, marginBottom: 10 },
  summary: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 24 },
  loadingText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  loadingHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  errorEmoji: { fontSize: 40 },
  errorText: { fontSize: 14, color: COLORS.text, textAlign: 'center', lineHeight: 22 },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  stageWrapper: { flexDirection: 'row', marginBottom: 16 },
  stageLine: { width: 3, borderRadius: 2, marginRight: 12, marginTop: 20 },
  stageCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, borderWidth: 1,
  },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stageNum: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stageNumText: { fontSize: 14, fontWeight: '800' },
  stageTitleBlock: { flex: 1 },
  stageTitle: { fontSize: 14, fontWeight: '700' },
  stageDuration: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  chevron: { fontSize: 12, color: COLORS.textMuted },
  stageBody: { marginTop: 16, gap: 12 },
  conceptsLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  conceptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  conceptTag: {
    backgroundColor: 'rgba(255,140,66,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
    borderColor: 'rgba(255,140,66,0.2)',
  },
  conceptText: { fontSize: 11, color: COLORS.primaryLight },
  projectCard: {
    backgroundColor: 'rgba(0,212,255,0.06)', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
  },
  projectLabel: { fontSize: 11, color: COLORS.accent, fontWeight: '600', marginBottom: 4 },
  projectTitle: { fontSize: 13, color: COLORS.text, fontWeight: '700' },
  projectDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 18 },
  regenBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  regenText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
});
