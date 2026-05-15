import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {
  isModelDownloaded, getModelPath, importModel,
  initCactusModel, releaseCactusModel, isOfflineReady,
  setApiKeys, setBackendUrl,
} from '../services/llmService';

const MODEL_FILENAME = 'google_gemma-4-E2B-it-Q2_K.gguf';

const COLORS = {
  bg: '#070e20', card: '#0a1838', border: 'rgba(255,140,66,0.22)',
  primary: '#ff8c42', primaryLight: '#ffb380', text: '#ffb380',
  textMuted: 'rgba(255,160,100,0.5)', accent: '#00d4ff',
  success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
};

export default function SettingsScreen() {
  const [modelExists, setModelExists] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [backendUrl, setBackendUrlState] = useState('http://10.0.2.2:8000');
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setModelExists(await isModelDownloaded());
    setModelLoaded(isOfflineReady());

    const [or, gm, bu] = await AsyncStorage.multiGet(['openrouter_key', 'gemini_key', 'backend_url'])
      .then(pairs => pairs.map(([, v]) => v || ''));
    if (or) setOpenrouterKey(or);
    if (gm) setGeminiKey(gm);
    if (bu) { setBackendUrlState(bu); setBackendUrl(bu); }
    if (or || gm) setApiKeys(or, gm);
  }

  async function saveApiKeys() {
    await AsyncStorage.multiSet([
      ['openrouter_key', openrouterKey],
      ['gemini_key', geminiKey],
      ['backend_url', backendUrl],
    ]);
    setApiKeys(openrouterKey, geminiKey);
    setBackendUrl(backendUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleImportModel() {
    // Look for the model in common locations on Android
    const searchPaths = [
      `${RNFS.DownloadDirectoryPath}/${MODEL_FILENAME}`,
      `${RNFS.ExternalStorageDirectoryPath}/Download/${MODEL_FILENAME}`,
      `${RNFS.ExternalStorageDirectoryPath}/${MODEL_FILENAME}`,
    ];

    let found = '';
    for (const p of searchPaths) {
      if (await RNFS.exists(p)) { found = p; break; }
    }

    if (!found) {
      Alert.alert(
        'Model Not Found',
        `Place the file:\n"${MODEL_FILENAME}"\n\nInto your phone's Downloads folder, then tap this button again.`,
      );
      return;
    }

    Alert.alert('Importing...', 'Copying model to app storage. This may take 1-2 minutes for ~3GB.');
    try {
      await importModel(found);
      setModelExists(true);
      Alert.alert('✅ Done!', 'Model imported. Tap "Load Model" to activate offline mode.');
    } catch (e: any) {
      Alert.alert('Import failed', String(e));
    }
  }

  async function handleLoadModel() {
    setLoadingModel(true);
    const ok = await initCactusModel();
    setModelLoaded(ok);
    setLoadingModel(false);
    if (ok) {
      Alert.alert('✅ Model Loaded', 'Gemma 4 Q2_K is now active. Offline mode is available!');
    } else {
      Alert.alert('❌ Load Failed', 'Could not load the model. Make sure you have enough free RAM (need ~2.5GB).');
    }
  }

  async function handleUnloadModel() {
    await releaseCactusModel();
    setModelLoaded(false);
    Alert.alert('Model Unloaded', 'RAM has been freed. App will use cloud APIs only.');
  }

  async function handleClearData() {
    Alert.alert('Clear All Data?', 'This will reset your career profile and roadmap.', [
      { text: 'Cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          await AsyncStorage.clear();
          Alert.alert('Cleared', 'Restart the app to begin onboarding again.');
        }
      }
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>⚙️ Settings</Text>

        {/* === Offline Model Section === */}
        <Text style={styles.sectionTitle}>🤖 Offline AI Model</Text>
        <View style={styles.card}>
          <View style={styles.modelStatusRow}>
            <View style={[styles.statusDot, {
              backgroundColor: modelLoaded ? COLORS.success : modelExists ? COLORS.warning : COLORS.danger
            }]} />
            <Text style={styles.modelStatusText}>
              {modelLoaded ? 'Gemma 4 Q2_K — Loaded & Ready'
                : modelExists ? 'Model found — not loaded yet'
                  : 'No model found'}
            </Text>
          </View>
          <Text style={styles.modelPath}>Path: {getModelPath()}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.outlineBtn} onPress={handleImportModel}>
              <Text style={styles.outlineBtnText}>📂 Import GGUF</Text>
            </TouchableOpacity>
            {modelExists && !modelLoaded && (
              <TouchableOpacity
                style={[styles.solidBtn, loadingModel && styles.btnDisabled]}
                onPress={handleLoadModel}
                disabled={loadingModel}
              >
                {loadingModel
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.solidBtnText}>▶ Load Model</Text>
                }
              </TouchableOpacity>
            )}
            {modelLoaded && (
              <TouchableOpacity style={[styles.solidBtn, { backgroundColor: COLORS.danger }]} onPress={handleUnloadModel}>
                <Text style={styles.solidBtnText}>⏹ Unload</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📌 How to import: Download{' '}
              <Text style={styles.infoHighlight}>google_gemma-4-E2B-it-Q2_K.gguf</Text>
              {' '}from Hugging Face, then tap "Import GGUF" to copy it into the app.
            </Text>
          </View>
        </View>

        {/* === Cloud API Keys === */}
        <Text style={styles.sectionTitle}>☁️ Cloud API Keys</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>OpenRouter API Key</Text>
          <TextInput
            style={styles.input}
            value={openrouterKey}
            onChangeText={setOpenrouterKey}
            placeholder="sk-or-..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
          />

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Google AI Studio Key</Text>
          <TextInput
            style={styles.input}
            value={geminiKey}
            onChangeText={setGeminiKey}
            placeholder="AIza..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
          />

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Backend URL</Text>
          <TextInput
            style={styles.input}
            value={backendUrl}
            onChangeText={setBackendUrlState}
            placeholder="http://10.0.2.2:8000"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.hintText}>
            10.0.2.2 = your PC's localhost from Android emulator.{'\n'}
            Use your PC's WiFi IP (e.g. 192.168.x.x:8000) for real devices.
          </Text>

          <TouchableOpacity style={[styles.solidBtn, { marginTop: 16 }]} onPress={saveApiKeys}>
            <Text style={styles.solidBtnText}>{saved ? '✅ Saved!' : 'Save Settings'}</Text>
          </TouchableOpacity>
        </View>

        {/* AI Tier Status */}
        <Text style={styles.sectionTitle}>📡 AI Failover Status</Text>
        <View style={styles.card}>
          {[
            { tier: 'Tier 1', name: 'OpenRouter (Gemma 4 31B)', active: !!openrouterKey },
            { tier: 'Tier 2', name: 'Google AI Studio (Gemma 4)', active: !!geminiKey },
            { tier: 'Tier 3', name: 'Cactus On-Device (Q2_K)', active: modelLoaded },
          ].map(t => (
            <View key={t.tier} style={styles.tierRow}>
              <View style={[styles.tierDot, { backgroundColor: t.active ? COLORS.success : COLORS.textMuted }]} />
              <Text style={styles.tierLabel}>{t.tier}</Text>
              <Text style={[styles.tierName, { color: t.active ? COLORS.text : COLORS.textMuted }]}>{t.name}</Text>
              <Text style={[styles.tierStatus, { color: t.active ? COLORS.success : COLORS.textMuted }]}>
                {t.active ? '✓' : '✗'}
              </Text>
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
          <Text style={styles.dangerText}>🗑️ Clear All Data & Reset</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.primaryLight, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10, marginTop: 8 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  modelStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  modelStatusText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  modelPath: { fontSize: 10, color: COLORS.textMuted, marginBottom: 16, lineHeight: 16 },
  btnRow: { flexDirection: 'row', gap: 10 },
  outlineBtn: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  outlineBtnText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  solidBtn: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  solidBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  infoBox: {
    backgroundColor: 'rgba(0,212,255,0.06)', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', marginTop: 16,
  },
  infoText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  infoHighlight: { color: COLORS.accent, fontWeight: '600' },
  inputLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#060d1e', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, color: COLORS.text, fontSize: 13,
    borderWidth: 1, borderColor: COLORS.border,
  },
  hintText: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, lineHeight: 16 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { fontSize: 11, color: COLORS.textMuted, width: 42 },
  tierName: { flex: 1, fontSize: 13, fontWeight: '600' },
  tierStatus: { fontSize: 16, fontWeight: '800' },
  dangerBtn: {
    borderWidth: 1, borderColor: COLORS.danger, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  dangerText: { fontSize: 14, color: COLORS.danger, fontWeight: '700' },
});
