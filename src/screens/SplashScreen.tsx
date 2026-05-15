import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#070e20',
  primary: '#ff8c42',
  primaryLight: '#ffb380',
  accent: '#00d4ff',
  text: '#ffb380',
  textMuted: 'rgba(255,160,100,0.5)',
};

export default function SplashScreen() {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoAnim,
            transform: [
              {
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.Text style={[styles.logo, { opacity: glowAnim }]}>🚀</Animated.Text>
      </Animated.View>

      {/* App name */}
      <Animated.View style={{ opacity: textAnim }}>
        <Text style={styles.title}>KALAM SPARK</Text>
        <Text style={styles.subtitle}>AI Career Intelligence Platform</Text>
        <Text style={styles.powered}>Powered by Gemma 4</Text>
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={[styles.dotsRow, { opacity: textAnim }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.dot} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,140,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,66,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 52,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primaryLight,
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 1,
  },
  powered: {
    fontSize: 11,
    color: COLORS.accent,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 40,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
});
