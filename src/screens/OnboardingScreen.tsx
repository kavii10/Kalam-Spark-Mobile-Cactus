import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { discoverDream } from '../services/apiService';

const COLORS = {
  bg: '#070e20', card: '#0a1838', border: 'rgba(255,140,66,0.22)',
  primary: '#ff8c42', primaryLight: '#ffb380', text: '#ffb380',
  textMuted: 'rgba(255,160,100,0.5)', accent: '#00d4ff', success: '#22c55e',
};

const INTERESTS = ['Technology & Coding', 'Science & Research', 'Art & Design',
  'Business & Finance', 'Healthcare & Medicine', 'Education & Teaching',
  'Environment & Nature', 'Social Work & NGOs', 'Media & Entertainment'];

const QUIZ = [
  {
    q: 'When you have free time, what do you enjoy most?',
    options: ['Reading or writing', 'Building or fixing things', 'Helping others', 'Exploring nature'],
  },
  {
    q: 'Which school subject excites you the most?',
    options: ['Science & Math', 'Language & Literature', 'Social Studies', 'Arts & Music'],
  },
  {
    q: 'How would your friends describe you?',
    options: ['Logical and analytical', 'Creative and expressive', 'Empathetic and caring', 'Adventurous and curious'],
  },
  {
    q: 'What kind of impact do you want to make?',
    options: ['Solve complex problems', 'Build companies or create jobs', 'Help individuals directly', 'Protect the environment'],
  },
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Passed Out'];
const BRANCHES = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Arts & Humanities', 'Commerce', 'Medical', 'Other'];

type Step = 'intro' | 'interests' | 'quiz' | 'profile' | 'discovering' | 'results';

interface OnboardingProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('intro');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [careers, setCareers] = useState<any[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (i: string) => {
    setSelectedInterests(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : prev.length < 3 ? [...prev, i] : prev
    );
  };

  const handleQuizAnswer = (answer: string, qIdx: number) => {
    const updated = [...quizAnswers];
    updated[qIdx] = answer;
    setQuizAnswers(updated);
  };

  const handleDiscover = async () => {
    if (!year || !branch) { Alert.alert('Please select your year and branch'); return; }
    setStep('discovering');
    setLoading(true);
    try {
      const personalityTexts = QUIZ.map((q, i) =>
        quizAnswers[i] ? `${q.q} -> ${quizAnswers[i]}` : ''
      ).filter(Boolean);
      const result = await discoverDream(selectedInterests, personalityTexts);
      setCareers(result.slice(0, 12));
      setStep('results');
    } catch (e) {
      Alert.alert('Error', 'Could not generate career suggestions. Please check your connection.');
      setStep('profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCareer = async (career: any) => {
    setSelectedCareer(career);
    await AsyncStorage.multiSet([
      ['dream', career.dream],
      ['branch', branch],
      ['year', year],
      ['subjects', JSON.stringify(career.subjects || [])],
    ]);
    onComplete();
  };

  // ── RENDER ──
  if (step === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emoji}>🚀</Text>
          <Text style={styles.title}>Discover Your Dream Career</Text>
          <Text style={styles.subtitle}>
            Let our AI match you with the perfect career path in just 2 minutes.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => setStep('interests')}>
            <Text style={styles.btnText}>Let's Begin →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'interests') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.stepTitle}>What interests you?</Text>
          <Text style={styles.stepHint}>Pick up to 3</Text>
          <View style={styles.chipGrid}>
            {INTERESTS.map(i => (
              <TouchableOpacity
                key={i}
                style={[styles.chip, selectedInterests.includes(i) && styles.chipActive]}
                onPress={() => toggleInterest(i)}
              >
                <Text style={[styles.chipText, selectedInterests.includes(i) && styles.chipTextActive]}>
                  {i}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.btn, selectedInterests.length === 0 && styles.btnDisabled]}
            onPress={() => selectedInterests.length > 0 && setStep('quiz')}
          >
            <Text style={styles.btnText}>Next →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'quiz') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.stepTitle}>Personality Quiz</Text>
          {QUIZ.map((q, qi) => (
            <View key={qi} style={styles.quizCard}>
              <Text style={styles.quizQ}>{q.q}</Text>
              {q.options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optBtn, quizAnswers[qi] === opt && styles.optBtnActive]}
                  onPress={() => handleQuizAnswer(opt, qi)}
                >
                  <Text style={[styles.optText, quizAnswers[qi] === opt && styles.optTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={() => setStep('profile')}>
            <Text style={styles.btnText}>Next →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'profile') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.stepTitle}>Your Profile</Text>
          <Text style={styles.label}>Year of Study</Text>
          <View style={styles.chipGrid}>
            {YEARS.map(y => (
              <TouchableOpacity
                key={y} style={[styles.chip, year === y && styles.chipActive]}
                onPress={() => setYear(y)}
              >
                <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 16 }]}>Branch / Stream</Text>
          <View style={styles.chipGrid}>
            {BRANCHES.map(b => (
              <TouchableOpacity
                key={b} style={[styles.chip, branch === b && styles.chipActive]}
                onPress={() => setBranch(b)}
              >
                <Text style={[styles.chipText, branch === b && styles.chipTextActive]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.btn, (!year || !branch) && styles.btnDisabled]}
            onPress={handleDiscover}
          >
            <Text style={styles.btnText}>Discover My Career 🔮</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'discovering') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.subtitle, { marginTop: 24 }]}>
            AI is analyzing your personality...
          </Text>
          <Text style={styles.stepHint}>Gemma 4 is working its magic ✨</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'results') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.stepTitle}>Your Career Matches ✨</Text>
          <Text style={styles.stepHint}>Tap a career to begin your journey</Text>
          {careers.map((c, i) => (
            <TouchableOpacity
              key={i} style={styles.careerCard}
              onPress={() => handleSelectCareer(c)}
            >
              <Text style={styles.careerName}>{c.dream}</Text>
              <View style={styles.tagRow}>
                {(c.subjects || []).slice(0, 3).map((s: string, j: number) => (
                  <View key={j} style={styles.tag}>
                    <Text style={styles.tagText}>{s}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.primaryLight, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primaryLight, marginBottom: 6, marginTop: 16 },
  stepHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 20 },
  label: { fontSize: 14, color: COLORS.text, fontWeight: '600', marginBottom: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: 'rgba(255,140,66,0.2)', borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.primaryLight, fontWeight: '600' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  quizCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  quizQ: { fontSize: 14, color: COLORS.text, fontWeight: '600', marginBottom: 12, lineHeight: 20 },
  optBtn: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  optBtnActive: { backgroundColor: 'rgba(255,140,66,0.15)', borderColor: COLORS.primary },
  optText: { fontSize: 13, color: COLORS.textMuted },
  optTextActive: { color: COLORS.primaryLight, fontWeight: '600' },
  careerCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  careerName: { fontSize: 16, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: 'rgba(0,212,255,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.2)',
  },
  tagText: { fontSize: 11, color: COLORS.accent },
});
