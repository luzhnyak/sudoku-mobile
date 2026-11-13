import { Fragment, memo, useMemo } from 'react';
import { PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';

import { columnOf, digitBit, DIGITS, PEERS, rowOf, SIZE } from '../../engine';
import type { Game, Settings } from '../../game/model';
import { cellWarnings } from '../../game/rules';
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
  fontSize: number;
  theme: Theme;
  onSelect: (index: number) => void;
};

const ROWS = Array.from({ length: SIZE }, (_, row) => Array.from({ length: SIZE }, (_, column) => row * SIZE + column));
// Draw the heavier dividers over the fine lines at intersections.
const DIVIDERS = DIGITS.slice(0, -1).sort((a, b) => Number(a % 3 === 0) - Number(b % 3 === 0));

const NotesGrid = memo(function NotesGrid({ notes, color, fontSize }: { notes: number; color: string; fontSize: number }) {
  return (
    <View style={styles.notes} importantForAccessibility="no-hide-descendants">
      {DIGITS.map((digit) => (
        <View key={digit} style={styles.note}>
          {Boolean(notes & digitBit(digit)) && (
            <Text maxFontSizeMultiplier={1.2} style={[styles.noteText, { color, fontSize }]}>{digit}</Text>
          )}
        </View>
      ))}
    </View>
  );
});

const SudokuCell = memo(function SudokuCell({
  index, value, notes, given, selected, peer, matching, conflicted, incorrect, hinted, fontSize, theme, onSelect,
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
      style={[styles.cell, { backgroundColor: fill }]}
    >
      {selected && <View pointerEvents="none" style={[styles.selection, { borderColor: theme.primary }]} />}
      {value ? (
        <Text
          maxFontSizeMultiplier={1.3}
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.digit, { color, fontSize, fontWeight: given ? '800' : '600' }]}
        >{value}</Text>
      ) : notes ? <NotesGrid notes={notes} color={theme.muted} fontSize={fontSize * 0.39} /> : null}
    </Pressable>
  );
});

const GridLines = memo(function GridLines({ theme }: { theme: Theme }) {
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      {DIVIDERS.map((index) => {
        const major = index % 3 === 0;
        const thickness = PixelRatio.roundToNearestPixel(major ? 2 : 1);
        const backgroundColor = major ? theme.boardMajor : theme.boardLine;
        const offset = `${index * 100 / SIZE}%` as const;
        return (
          <Fragment key={index}>
            <View style={[styles.verticalLine, { left: offset, width: thickness, marginLeft: -thickness / 2, backgroundColor }]} />
            <View style={[styles.horizontalLine, { top: offset, height: thickness, marginTop: -thickness / 2, backgroundColor }]} />
          </Fragment>
        );
      })}
    </View>
  );
});

export const SudokuBoard = memo(function SudokuBoard({
  board, puzzle, notes, solution, selected, settings, hintCells, onSelect, size,
}: Pick<Game, 'board' | 'puzzle' | 'notes' | 'solution'> & {
  selected: number | null;
  settings: Settings;
  hintCells: readonly number[];
  onSelect: (index: number) => void;
  size?: number;
}) {
  const theme = useTheme();
  const warnings = useMemo(() => cellWarnings(board, solution, settings), [board, solution, settings]);
  const peers = selected === null ? [] : PEERS[selected];
  const selectedValue = selected === null ? 0 : board[selected];
  const fontSize = size === undefined ? 23 : Math.max(14, size / 13);
  return (
    <View style={[styles.board, { width: size ?? '100%', borderColor: theme.boardMajor, backgroundColor: theme.surface }]}>
      <View style={styles.grid}>
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
                conflicted={warnings[index].conflicted}
                incorrect={warnings[index].incorrect}
                hinted={hintCells.includes(index)}
                fontSize={fontSize}
                theme={theme}
                onSelect={onSelect}
              />
            ))}
          </View>
        ))}
        <GridLines theme={theme} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  board: { alignSelf: 'center', aspectRatio: 1, borderWidth: 2, borderRadius: 9, overflow: 'hidden' },
  grid: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  digit: { includeFontPadding: false, fontVariant: ['tabular-nums'] },
  verticalLine: { position: 'absolute', top: 0, bottom: 0 },
  horizontalLine: { position: 'absolute', left: 0, right: 0 },
  selection: { ...StyleSheet.absoluteFill, borderWidth: 2 },
  notes: { width: '94%', height: '94%', flexDirection: 'row', flexWrap: 'wrap' },
  note: { width: '33.3333%', height: '33.3333%', alignItems: 'center', justifyContent: 'center' },
  noteText: { fontWeight: '600', includeFontPadding: false, fontVariant: ['tabular-nums'] },
});
