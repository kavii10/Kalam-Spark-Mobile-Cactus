import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMentorMessage } from '../services/apiService';
import { isOfflineReady } from '../services/llmService';
import type { ChatMessage } from '../services/llmService';

const COLORS = {
  bg: '#070e20', card: '#0a1838', border: 'rgba(255,140,66,0.22)',
  primary: '#ff8c42', primaryLight: '#ffb380', text: '#ffb380',
  textMuted: 'rgba(255,160,100,0.5)', accent: '#00d4ff',
  userBubble: 'rgba(255,140,66,0.15)', aiBubble: 'rgba(10,24,56,0.95)',
};

interface Message extends ChatMessage {
  id: string;
  ts: number;
}

const SUGGESTIONS = [
  'What should I learn next?',
  'How do I build my portfolio?',
  'What are the best resources for my stage?',
  'What salary can I expect?',
];

export default function MentorScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState({ dream: '', stage: '', branch: '' });
  const [offline, setOffline] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadProfile();
    loadHistory();
  }, []);

  async function loadProfile() {
    const [dream, branch, roadmapRaw] = await AsyncStorage.multiGet(['dream', 'branch', 'roadmap_cache'])
      .then(pairs => pairs.map(([, v]) => v || ''));
    let stage = 'Foundation';
    if (roadmapRaw) {
      try { stage = JSON.parse(roadmapRaw).stages?.[0]?.title || stage; } catch {}
    }
    setProfile({ dream, stage, branch });
    setOffline(!isOfflineReady() ? false : true);
  }

  async function loadHistory() {
    const raw = await AsyncStorage.getItem('mentor_history');
    if (raw) setMessages(JSON.parse(raw));
  }

  async function saveHistory(msgs: Message[]) {
    await AsyncStorage.setItem('mentor_history', JSON.stringify(msgs.slice(-50)));
  }

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');

    const userMsg: Message = {
      id: `u_${Date.now()}`, role: 'user', content: msg, ts: Date.now(),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setSending(true);
    scrollRef.current?.scrollToEnd({ animated: true });

    try {
      const history: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendMentorMessage(history, msg, profile);
      const aiMsg: Message = {
        id: `a_${Date.now()}`, role: 'assistant', content: reply, ts: Date.now(),
      };
      const final = [...updated, aiMsg];
      setMessages(final);
      await saveHistory(final);
    } catch {
      const errMsg: Message = {
        id: `e_${Date.now()}`, role: 'assistant',
        content: '⚠️ Could not reach the AI mentor. Please check your connection or load the offline model.',
        ts: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💬 AI Mentor</Text>
          <View style={styles.modeBadge}>
            <View style={[styles.modeDot, { backgroundColor: isOfflineReady() ? '#22c55e' : COLORS.accent }]} />
            <Text style={styles.modeText}>{isOfflineReady() ? 'Offline Ready' : 'Cloud'}</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🤖</Text>
              <Text style={styles.emptyTitle}>Hi! I'm your AI Mentor</Text>
              <Text style={styles.emptySubtitle}>
                Ask me anything about your {profile.dream} journey.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map(s => (
                  <TouchableOpacity key={s} style={styles.suggestion} onPress={() => handleSend(s)}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map(m => (
            <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {m.role === 'assistant' && <Text style={styles.aiLabel}>🤖 Mentor</Text>}
              <Text style={[styles.bubbleText, m.role === 'user' && styles.userText]}>
                {m.content}
              </Text>
            </View>
          ))}

          {sending && (
            <View style={styles.aiBubble}>
              <Text style={styles.aiLabel}>🤖 Mentor</Text>
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 4 }} />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your mentor..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primaryLight },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeDot: { width: 8, height: 8, borderRadius: 4 },
  modeText: { fontSize: 11, color: COLORS.textMuted },
  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 24, gap: 12 },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primaryLight },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  suggestions: { marginTop: 12, width: '100%', gap: 8 },
  suggestion: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  suggestionText: { fontSize: 13, color: COLORS.text },
  bubble: { borderRadius: 18, padding: 14, maxWidth: '88%' },
  userBubble: { backgroundColor: COLORS.userBubble, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: COLORS.aiBubble, alignSelf: 'flex-start',
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  aiLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  userText: { color: COLORS.primaryLight },
  inputRow: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  input: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text,
    fontSize: 14, borderWidth: 1, borderColor: COLORS.border, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 16, color: '#fff' },
});
