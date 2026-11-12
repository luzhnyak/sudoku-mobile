import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { columnOf, digitBit, DIGITS, findConflicts, PEERS, rowOf } from '../../engine';
import type { Game, Settings } from '../../game/model';
import { uk } from '../../localization/uk';
import { useTheme } from '../../theme/theme';
import type { Theme } from '../../theme/theme';

type CellProps = {
  index: number;
  value: number;
  notes: number;
  given: boolean;
  selected: boolean;
  peer: boolean;
  matching: boolean;
  conflicted: boolean;
  incorrect: boolean;
  hinted: boolean;
  theme: Theme;
  onSelect: (index: number) => void;
};

const ROWS = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, column) => row * 9 + column));

const NotesGrid = memo(function NotesGrid({ notes, color }: { notes: number; color: string }) {
  return (
    <View style={styles.notes} importantForAccessibility="no-hide-descendants">
      {DIGITS.map((digit) => (
        <View key={digit} style={styles.note}>
          {Boolean(notes & digitBit(digit)) && (
            <Text maxFontSizeMultiplier={1.2} style={[styles.noteText, { color }]}>{digit}</Text>
          )}
        </View>
      ))}
    </View>
  );
});

const SudokuCell = memo(function SudokuCell({
  index, value, notes, given, selected, peer, matching, conflicted, incorrect, hinted, theme, onSelect,
}: CellProps) {
  const row = rowOf(index);
  const column = columnOf(index);
  const danger = conflicted || incorrect;
  let fill = peer ? theme.peer : theme.surface;
  if (matching) fill = theme.match;
  if (hinted) fill = theme.hintTint;
  if (danger) fill = theme.warningTint;
  if (selected && !danger && !hinted) fill = theme.selected;
  const color = danger ? theme.warning : hinted ? theme.hint : given ? theme.text : theme.primary;
  const accessibleNotes = notes ? `${uk.game.notes}: ${DIGITS.filter((digit) => notes & digitBit(digit)).join(', ')}` : '';
  const label = [
    uk.game.cell(row + 1, column + 1), value || accessibleNotes || uk.game.empty,
    given && uk.game.given, conflicted && uk.game.conflict, incorrect && uk.game.incorrect,
    hinted && uk.game.hint,
  ].filter(Boolean).join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => onSelect(index)}
      style={[
        styles.cell,
        {
          backgroundColor: fill,
          borderRightWidth: column === 8 ? 0 : column % 3 === 2 ? 2 : StyleSheet.hairlineWidth,
          borderRightColor: column % 3 === 2 ? theme.boardMajor : theme.boardLine,
          borderBottomWidth: row === 8 ? 0 : row % 3 === 2 ? 2 : StyleSheet.hairlineWidth,
          borderBottomColor: row % 3 === 2 ? theme.boardMajor : theme.boardLine,
        },
      ]}
    >
      {selected && <View pointerEvents="none" style={[styles.selection, { borderColor: theme.primary }]} />}
      {value ? (
        <Text
          maxFontSizeMultiplier={1.3}
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.digit, { color, fontWeight: given ? '800' : '600' }]}
        >{value}</Text>
      ) : notes ? <NotesGrid notes={notes} color={theme.muted} /> : null}
    </Pressable>
  );
});

export const SudokuBoard = memo(function SudokuBoard({
  board, puzzle, notes, solution, selected, settings, hintCells, onSelect,
}: Pick<Game, 'board' | 'puzzle' | 'notes' | 'solution'> & {
  selected: number | null;
  settings: Settings;
  hintCells: readonly number[];
  onSelect: (index: number) => void;
}) {
  const theme = useTheme();
  const conflicts = useMemo(() => findConflicts(board), [board]);
  const peers = selected === null ? [] : PEERS[selected];
  const selectedValue = selected === null ? 0 : board[selected];
  return (
    <View style={[styles.board, { borderColor: theme.boardMajor, backgroundColor: theme.surface }]}>
      {ROWS.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((index) => (
            <SudokuCell
              key={index}
              index={index}
              value={board[index]}
              notes={notes[index]}
              given={puzzle[index] !== 0}
              selected={selected === index}
              peer={peers.includes(index)}
              matching={settings.highlightMatchingNumbers && selectedValue !== 0 && board[index] === selectedValue}
              conflicted={settings.highlightConflicts && conflicts.has(index)}
              incorrect={settings.mistakeCheck && board[index] !== 0 && board[index] !== solution[index]}
              hinted={hintCells.includes(index)}
              theme={theme}
              onSelect={onSelect}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  board: { width: '100%', aspectRatio: 1, borderWidth: 2, borderRadius: 9, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  digit: { fontSize: 23, includeFontPadding: false, fontVariant: ['tabular-nums'] },
  selection: { ...StyleSheet.absoluteFill, borderWidth: 2 },
  notes: { width: '94%', height: '94%', flexDirection: 'row', flexWrap: 'wrap' },
  note: { width: '33.3333%', height: '33.3333%', alignItems: 'center', justifyContent: 'center' },
  noteText: { fontSize: 9, fontWeight: '600', includeFontPadding: false, fontVariant: ['tabular-nums'] },
});
