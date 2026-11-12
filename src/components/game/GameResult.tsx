import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import type { Game } from '../../game/model';
import { uk } from '../../localization/uk';
import { useTheme } from '../../theme/theme';
import { formatTime } from '../../utils/format';
import { Card } from '../ui/controls';

export function GameResult({ game }: { game: Game }) {
  const theme = useTheme();
  const won = game.status === 'won';
  const facts = [
    [uk.common.time, formatTime(game.elapsedMs)],
    [uk.common.mistakes, String(game.mistakes)],
    [uk.common.hints, String(game.hintsUsed)],
  ];
  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}>
      <Card>
        <View style={[styles.mark, { backgroundColor: won ? theme.primaryTint : theme.warningTint }]}>
          <Text style={[styles.markText, { color: won ? theme.primary : theme.warning }]}>{won ? '✓' : '!'}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {won ? uk.game.won : uk.game.lost}
        </Text>
        <Text style={[styles.level, { color: theme.muted }]}>{uk.difficulty[game.difficulty]}</Text>
        <View style={[styles.facts, { borderTopColor: theme.border }]}>
          {facts.map(([label, value]) => (
            <View style={styles.fact} key={label}>
              <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
              <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mark: { alignSelf: 'center', width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 35, fontWeight: '800' },
  title: { fontSize: 27, fontWeight: '800', textAlign: 'center', letterSpacing: -0.6 },
  level: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, marginTop: 8, paddingTop: 14, gap: 8 },
  fact: { flexGrow: 1, minWidth: 80, alignItems: 'center', gap: 3 },
  value: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, fontWeight: '600' },
});
