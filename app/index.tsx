import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NewGameSheet } from '../src/components/game/NewGameSheet';
import { Button, Page } from '../src/components/ui/controls';
import { uk } from '../src/localization/uk';
import { useSessionStore } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/theme';
import { formatTime } from '../src/utils/format';

const preview = [3, 0, 6, 0, 5, 0, 2, 0, 9];

function BrandCard() {
  const theme = useTheme();
  return (
    <View style={[styles.hero, { backgroundColor: theme.hero }]}>
      <View style={styles.heroCopy}>
        <Text accessibilityRole="header" style={styles.heroTitle} adjustsFontSizeToFit numberOfLines={1}>{uk.appName}</Text>
        <Text style={[styles.heroCaption, { color: theme.heroMuted }]}>{uk.home.classic}</Text>
      </View>
      <View style={[styles.mosaic, { borderColor: theme.heroBorder }]} importantForAccessibility="no-hide-descendants">
        {preview.map((digit, index) => (
          <View key={index} style={[
            styles.tile,
            { borderColor: theme.heroBorder, backgroundColor: index === 4 ? '#B9CCFF' : 'transparent' },
          ]}>
            <Text allowFontScaling={false} style={[styles.tileDigit, { color: index === 4 ? '#153782' : theme.heroMuted }]}>
              {digit || ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const latest = useSessionStore((state) => state.latestActive);
  const continueGame = useSessionStore((state) => state.continueGame);
  const [chooserOpen, setChooserOpen] = useState(false);
  const { newGame } = useLocalSearchParams<{ newGame?: string }>();

  useEffect(() => {
    if (newGame === '1') {
      setChooserOpen(true);
      router.setParams({ newGame: undefined });
    }
  }, [newGame]);

  return (
    <Page fullWidth={false} contentStyle={styles.page}>
      <BrandCard />
      <View style={styles.actions}>
        <Button label={uk.home.newGame} onPress={() => setChooserOpen(true)} glyph="+" />
        {latest && (
          <>
            <Button
              label={uk.home.continue}
              variant="secondary"
              glyph="▶"
              onPress={() => { if (continueGame()) router.navigate('/game'); }}
            />
            <Text style={[styles.resumeDetail, { color: theme.muted }]}>
              {latest.type === 'daily' ? uk.home.daily : uk.difficulty[latest.difficulty]} · {formatTime(latest.elapsedMs)}
            </Text>
          </>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/daily')}
        style={({ pressed }) => [
          styles.daily,
          { backgroundColor: pressed ? theme.primaryTint : theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={[styles.dailyGlyph, { backgroundColor: theme.primaryTint }]}>
          <Text style={[styles.navigationIcon, { color: theme.primary }]}>▦</Text>
        </View>
        <View style={styles.dailyCopy}>
          <Text style={[styles.navLabel, { color: theme.text }]}>{uk.home.daily}</Text>
          <Text style={[styles.navDetail, { color: theme.muted }]}>{uk.home.dailyDescription}</Text>
        </View>
        <Text style={[styles.chevron, { color: theme.primary }]}>›</Text>
      </Pressable>
      <View style={styles.shortcuts}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/statistics')}
          style={({ pressed }) => [
            styles.shortcut,
            { backgroundColor: pressed ? theme.primaryTint : theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.navigationIcon, { color: theme.primary }]}>▥</Text>
          <Text style={[styles.navLabel, { color: theme.text }]}>{uk.home.stats}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [
            styles.shortcut,
            { backgroundColor: pressed ? theme.primaryTint : theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.navigationIcon, { color: theme.primary }]}>⚙</Text>
          <Text style={[styles.navLabel, { color: theme.text }]}>{uk.home.settings}</Text>
        </Pressable>
      </View>
      <Button label={uk.help.title} variant="quiet" onPress={() => router.push('/help')} />
      {chooserOpen && (
        <NewGameSheet onClose={() => setChooserOpen(false)} onStarted={() => router.navigate('/game')} />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', paddingBottom: 16 },
  hero: {
    minHeight: 186, borderRadius: 26, padding: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  heroCopy: { flex: 1, gap: 7 },
  heroTitle: { fontSize: 52, color: '#FFFFFF', fontWeight: '900', letterSpacing: -2.6 },
  heroCaption: { fontSize: 16, fontWeight: '600' },
  mosaic: {
    width: 100, height: 100, borderRadius: 13, borderWidth: 1,
    flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden',
  },
  tile: { width: '33.3333%', height: '33.3333%', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5 },
  tileDigit: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  actions: { gap: 9 },
  resumeDetail: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  daily: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 12, flexDirection: 'row', alignItems: 'center' },
  dailyGlyph: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  navigationIcon: { fontSize: 24, fontWeight: '700' },
  dailyCopy: { flex: 1, gap: 3 },
  navLabel: { fontSize: 16, fontWeight: '800' },
  navDetail: { fontSize: 13, fontWeight: '500' },
  chevron: { fontSize: 26, lineHeight: 29 },
  shortcuts: { flexDirection: 'row', gap: 10 },
  shortcut: { flex: 1, minHeight: 82, borderWidth: 1, borderRadius: 18, padding: 13, gap: 5 },
});
