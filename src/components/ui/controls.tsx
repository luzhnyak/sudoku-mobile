import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { uk } from '../../localization/uk';
import { layout, useTheme } from '../../theme/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  glyph?: string;
};

export function Button({ label, onPress, variant = 'primary', disabled, glyph }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          opacity: disabled ? 0.55 : 1,
          backgroundColor: primary
            ? (pressed ? theme.primaryPressed : theme.primary)
            : pressed ? theme.primaryTint : variant === 'secondary' ? theme.surface : 'transparent',
          borderColor: variant === 'secondary' ? theme.border : 'transparent',
        },
      ]}
    >
      {glyph && <Text style={[styles.glyph, { color: primary ? theme.onPrimary : theme.primary }]}>{glyph}</Text>}
      <Text style={[styles.buttonLabel, { color: primary ? theme.onPrimary : theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function Page({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeading({ title, subtitle, onBack }: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.heading}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uk.common.back}
        onPress={onBack}
        style={({ pressed }) => [
          styles.back,
          { backgroundColor: pressed ? theme.primaryTint : theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.backIcon, { color: theme.text }]}>{'‹'}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>}
    </View>
  );
}

export function Card({ children }: PropsWithChildren) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  const theme = useTheme();
  return <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>{children}</Text>;
}

export function Sheet({ title, children, onClose }: PropsWithChildren<{
  title: string;
  onClose: () => void;
}>) {
  const theme = useTheme();
  return (
    <Modal transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={uk.common.close} onPress={onClose} style={StyleSheet.absoluteFill} />
        <Animated.View
          accessibilityViewIsModal
          entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <SafeAreaView edges={['bottom']} style={styles.sheetInset}>
            <ScrollView contentContainerStyle={styles.sheetContent} bounces={false}>
              <View style={styles.sheetHeading}>
                <Text accessibilityRole="header" style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={uk.common.close} onPress={onClose} style={styles.close}>
                  <Text style={[styles.glyph, { color: theme.muted }]}>×</Text>
                </Pressable>
              </View>
              {children}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function Status({ loading, message, action }: { loading?: boolean; message: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.status} accessibilityLiveRegion="polite">
      {loading && <ActivityIndicator color={theme.primary} />}
      <Text style={[styles.subtitle, { color: theme.muted }]}>{message}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', gap: 18, padding: layout.inset, paddingBottom: 28 },
  button: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    minHeight: 54, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  glyph: { fontSize: 22, fontWeight: '600' },
  buttonLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  heading: { gap: 8, alignItems: 'flex-start' },
  back: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  backIcon: { fontSize: 32, lineHeight: 34 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  card: { borderWidth: 1, borderRadius: layout.radius, padding: 16, gap: 12 },
  backdrop: { flex: 1, backgroundColor: '#070F27AA', justifyContent: 'flex-end' },
  sheet: {
    width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', maxHeight: '82%',
    borderWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26,
  },
  sheetInset: { flexShrink: 1 },
  sheetContent: { gap: 12, padding: 18 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetTitle: { flex: 1, fontSize: 23, fontWeight: '800', letterSpacing: -0.3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  status: { alignItems: 'center', justifyContent: 'center', padding: 18, gap: 12 },
});
