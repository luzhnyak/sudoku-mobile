import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { uk } from '../../localization/uk';
import { layout, useTheme } from '../../theme/theme';
import { BackIcon } from './BackIcon';

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

export function Page({ children, contentStyle, onLayout, fullWidth = true }: PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
  fullWidth?: boolean;
}>) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.page, fullWidth && styles.fullWidth, contentStyle]} onLayout={onLayout} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeading({ title, subtitle, onBack, inline = false }: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  inline?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.heading}>
      <View style={[styles.heading, inline && styles.headingRow]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uk.common.back}
          onPress={onBack}
          style={({ pressed }) => [
            styles.back,
            inline && styles.inlineBack,
            { backgroundColor: pressed ? theme.primaryTint : theme.surface, borderColor: theme.border },
          ]}
        >
          <BackIcon />
        </Pressable>
        <Text
          accessibilityRole="header"
          numberOfLines={inline ? 1 : undefined}
          adjustsFontSizeToFit={inline}
          style={[styles.title, inline && styles.inlineTitle, { color: theme.text }]}
        >{title}</Text>
      </View>
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
      <GestureHandlerRootView style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={uk.common.close} onPress={onClose} style={styles.outsideSheet} />
        <View style={styles.sheetRow}>
          <Pressable accessible={false} onPress={onClose} style={styles.outsideSheet} />
          <SafeAreaView
            accessibilityViewIsModal
            edges={['bottom']}
            style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={styles.sheetHeading}>
                <Text accessibilityRole="header" style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={uk.common.close} onPress={onClose} style={styles.close}>
                  <Text style={[styles.glyph, { color: theme.muted }]}>×</Text>
                </Pressable>
              </View>
              {children}
            </ScrollView>
          </SafeAreaView>
          <Pressable accessible={false} onPress={onClose} style={styles.outsideSheet} />
        </View>
      </GestureHandlerRootView>
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
  fullWidth: { maxWidth: '100%' },
  button: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    minHeight: 54, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  glyph: { fontSize: 22, fontWeight: '600' },
  buttonLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  heading: { gap: 8, alignItems: 'flex-start' },
  headingRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12 },
  inlineBack: { marginBottom: 0 },
  inlineTitle: { flex: 1 },
  back: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  card: { borderWidth: 1, borderRadius: layout.radius, padding: 16, gap: 12 },
  backdrop: { flex: 1, backgroundColor: '#070F27AA' },
  outsideSheet: { flex: 1 },
  sheetRow: { flexDirection: 'row', maxHeight: '82%' },
  sheet: {
    width: '100%', maxWidth: layout.maxWidth, flexShrink: 1,
    borderWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26,
  },
  sheetContent: { gap: 12, padding: 18 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetTitle: { flex: 1, fontSize: 23, fontWeight: '800', letterSpacing: -0.3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  status: { alignItems: 'center', justifyContent: 'center', padding: 18, gap: 12 },
});
