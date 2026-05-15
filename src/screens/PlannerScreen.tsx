import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateTasks } from '../services/apiService';

const COLORS = {
  bg: '#070e20', card: '#0a1838', border: 'rgba(255,140,66,0.22)',
  primary: '#ff8c42', primaryLight: '#ffb380', text: '#ffb380',
  textMuted: 'rgba(255,160,100,0.5)', accent: '#00d4ff', success: '#22c55e',
};

interface Task {
  id: string;
  title: string;
  description: string;
  duration: string;
  done: boolean;
}

export default function PlannerScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ dream: '', stage: 'Foundation', concepts: [] as string[] });

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    const [dream, roadmapRaw] = await AsyncStorage.multiGet(['dream', 'roadmap_cache'])
      .then(pairs => pairs.map(([, v]) => v || ''));

    let stage = 'Foundation';
    let concepts: string[] = [];
    if (roadmapRaw) {
      try {
        const rm = JSON.parse(roadmapRaw);
        stage = rm.stages?.[0]?.title || stage;
        concepts = rm.stages?.[0]?.concepts?.slice(0, 5) || [];
      } catch {}
    }

    setProfile({ dream, stage, concepts });

    // Load cached tasks
    const cached = await AsyncStorage.getItem('daily_tasks');
    if (cached) {
      setTasks(JSON.parse(cached));
      return;
    }

    if (dream) fetchTasks(dream, stage, concepts);
  }

  async function fetchTasks(dream: string, stage: string, concepts: string[]) {
    setLoading(true);
    try {
      const raw = await generateTasks(dream, stage, concepts);
      const withIds: Task[] = raw.map((t: any, i: number) => ({
        ...t, id: `${Date.now()}_${i}`, done: false,
      }));
      setTasks(withIds);
      await AsyncStorage.setItem('daily_tasks', JSON.stringify(withIds));
    } catch {
      Alert.alert('Could not load tasks', 'Please check your connection.');
    } finally { setLoading(false); }
  }

  async function toggleTask(id: string) {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    await AsyncStorage.setItem('daily_tasks', JSON.stringify(updated));
  }

  const doneCount = tasks.filter(t => t.done).length;
  const progress = tasks.length > 0 ? doneCount / tasks.length : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>AI is generating your daily tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>📋 Daily Planner</Text>
        <Text style={styles.stageSub}>Stage: {profile.stage}</Text>

        {/* Progress Bar */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Today's Progress</Text>
            <Text style={styles.progressCount}>{doneCount}/{tasks.length}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* Tasks */}
        {tasks.map(task => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskCard, task.done && styles.taskCardDone]}
            onPress={() => toggleTask(task.id)}
          >
            <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
              {task.done && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.taskBody}>
              <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
                {task.title}
              </Text>
              <Text style={styles.taskDesc}>{task.description}</Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>⏱ {task.duration}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Refresh */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={async () => {
            await AsyncStorage.removeItem('daily_tasks');
            fetchTasks(profile.dream, profile.stage, profile.concepts);
          }}
        >
          <Text style={styles.refreshText}>🔄 Generate New Tasks</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.primaryLight, marginBottom: 4 },
  stageSub: { fontSize: 12, color: COLORS.textMuted, marginBottom: 20 },
  loadingText: { fontSize: 14, color: COLORS.text },
  progressCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  progressCount: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,140,66,0.1)', borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  taskCard: {
    flexDirection: 'row', gap: 14, backgroundColor: COLORS.card,
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  taskCardDone: { opacity: 0.5 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  checkmark: { fontSize: 14, color: '#fff', fontWeight: '800' },
  taskBody: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  durationBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,212,255,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    marginTop: 4, borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
  },
  durationText: { fontSize: 11, color: COLORS.accent },
  refreshBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  refreshText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
});
