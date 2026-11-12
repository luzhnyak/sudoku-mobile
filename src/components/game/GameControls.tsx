import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DIGITS } from '../../engine';
import type { Board, Difficulty, Digit } from '../../engine';
import { elapsedTime } from '../../gameClock/activeTime';
import { uk } from '../../localization/uk';
import { useSessionStore } from '../../store/sessionStore';
import { layout, useTheme } from '../../theme/theme';
import { formatTime } from '../../utils/format';
import { DifficultyMark } from '../ui/DifficultyMark';

function ActiveClock() {
  const theme = useTheme();
  const startedAt = useSessionStore((state) => state.startedAt);
  const saved = useSessionStore((state) => state.game?.elapsedMs ?? 0);
  const checkpoint = useSessionStore((state) => state.checkpoint);
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => {
      setNow(performance.now());
      checkpoint();
    }, 250);
    return () => clearInterval(timer);
  }, [startedAt, checkpoint]);

  return <Text style={[styles.timer, { color: theme.text }]}>{formatTime(elapsedTime(saved, startedAt, now))}</Text>;
}

export function GameHeader({ difficulty, daily, mistakes, showMistakes, limit, onBack, onPause }: {
  difficulty: Difficulty;
  daily: boolean;
  mistakes: number;
  showMistakes: boolean;
  limit: number | null;
  onBack: () => void;
  onPause: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uk.common.back}
        onPress={onBack}
        style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? theme.primaryTint : theme.surface, borderColor: theme.border }]}
      >
        <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
      </Pressable>
      <View style={styles.headerCopy}>
        {daily && <Text style={[styles.headerCaption, { color: theme.muted }]}>{uk.home.daily}</Text>}
        <View style={styles.level}>
          <DifficultyMark difficulty={difficulty} />
          <Text accessibilityRole="header" style={[styles.levelText, { color: theme.text }]}>{uk.difficulty[difficulty]}</Text>
        </View>
        {showMistakes && (
          <Text style={[styles.headerCaption, { color: mistakes ? theme.warning : theme.muted }]}>
            {uk.common.mistakes} {mistakes}{limit === null ? '' : `/${limit}`}
          </Text>
        )}
      </View>
      <ActiveClock />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uk.game.pause}
        onPress={onPause}
        style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? theme.primaryTint : theme.surface, borderColor: theme.border }]}
      >
        <View style={styles.pause}>
          <View style={[styles.pauseBar, { backgroundColor: theme.primary }]} />
          <View style={[styles.pauseBar, { backgroundColor: theme.primary }]} />
        </View>
      </Pressable>
    </View>
  );
}

type Tool = { label: string; short: string; glyph: string; action: () => void; disabled?: boolean; active?: boolean };

export function GameToolbar({ tools }: { tools: readonly Tool[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.tools, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {tools.map(({ label, short, glyph, action, disabled, active }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled, selected: active }}
          disabled={disabled}
          onPress={action}
          style={({ pressed }) => [
            styles.tool,
            { backgroundColor: pressed || active ? theme.primaryTint : 'transparent', opacity: disabled ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.toolIcon, { color: active ? theme.primary : theme.text }]}>{glyph}</Text>
          <Text style={[styles.toolLabel, { color: active ? theme.primary : theme.muted }]}>{short}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const NumberPad = memo(function NumberPad({ board, solution, onDigit, disabled }: {
  board: Board;
  solution: Board;
  onDigit: (digit: Digit) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const space = Math.min(width, layout.maxWidth) - layout.inset * 2;
  const rows = space < 352 || fontScale > 1.35 ? [DIGITS.slice(0, 5), DIGITS.slice(5)] : [DIGITS];
  const counts = new Array<number>(10).fill(0);
  board.forEach((digit, index) => { if (digit === solution[index]) counts[digit] += 1; });

  return (
    <View style={styles.numberPad}>
      {rows.map((row) => (
        <View key={row[0]} style={styles.keys}>
          {row.map((digit) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={String(digit)}
              accessibilityState={{ disabled }}
              key={digit}
              disabled={disabled}
              onPress={() => onDigit(digit)}
              style={({ pressed }) => [
                styles.key, {
                  backgroundColor: pressed ? theme.primaryTint : theme.surface,
                  borderColor: theme.border,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.keyText, { color: counts[digit] === 9 ? theme.muted : theme.primary }]}
              >{digit}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  headerCopy: { flex: 1, minWidth: 90, gap: 3 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  levelText: { fontSize: 17, fontWeight: '800' },
  headerCaption: { fontSize: 12, fontWeight: '600' },
  timer: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  iconButton: { width: 44, height: 44, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, lineHeight: 34 },
  pause: { flexDirection: 'row', gap: 4 },
  pauseBar: { width: 3, height: 15, borderRadius: 2 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, borderWidth: 1, borderRadius: 16, padding: 4 },
  tool: { flex: 1, minWidth: 54, minHeight: 56, paddingVertical: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  toolIcon: { fontSize: 20, fontWeight: '600' },
  toolLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  numberPad: { gap: 5 },
  keys: { flexDirection: 'row', gap: 4 },
  key: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
