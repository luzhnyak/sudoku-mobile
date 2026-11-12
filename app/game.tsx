import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GameHeader, GameToolbar, NumberPad } from '../src/components/game/GameControls';
import { GameResult } from '../src/components/game/GameResult';
import { SudokuBoard } from '../src/components/game/SudokuBoard';
import { Button, Card, Page, PageHeading, Sheet, Status } from '../src/components/ui/controls';
import type { Digit } from '../src/engine';
import { goBack } from '../src/hooks/navigation';
import { uk } from '../src/localization/uk';
import { useSessionStore } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/theme';
import { formatTime } from '../src/utils/format';

const NO_HINT_CELLS: readonly number[] = [];

function returnHome() {
  router.dismissTo('/');
}

export default function GameScreen() {
  const theme = useTheme();
  const game = useSessionStore((state) => state.game);
  const settings = useSessionStore((state) => state.settings);
  const selected = useSessionStore((state) => state.selected);
  const notesMode = useSessionStore((state) => state.notesMode);
  const hint = useSessionStore((state) => state.hint);
  const feedback = useSessionStore((state) => state.feedback);
  const paused = useSessionStore((state) => state.paused);
  const busy = useSessionStore((state) => state.busy);
  const setFocused = useSessionStore((state) => state.setFocused);
  const [sheet, setSheet] = useState<'hint' | 'restart' | null>(null);
  const [retryFailed, setRetryFailed] = useState(false);
  const closeSheet = () => setSheet(null);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, [setFocused]));

  const onSelect = useCallback((index: number) => {
    useSessionStore.getState().select(index);
  }, []);
  const onDigit = useCallback((digit: Digit) => {
    playAction(() => useSessionStore.getState().input(digit));
  }, []);

  if (game === null) {
    return <Page><Button label={uk.common.home} onPress={returnHome} /></Page>;
  }

  const session = useSessionStore.getState();
  if (game.status !== 'playing') {
    const canRetry = game.status === 'lost' && game.type === 'classic';
    return (
      <Page>
        <PageHeading title={game.type === 'daily' ? uk.daily.result : uk.appName} onBack={goBack} />
        <GameResult game={game} />
        {retryFailed && <Status message={uk.common.startError} />}
        {canRetry && (
          <Button
            label={uk.game.restart}
            disabled={busy}
            onPress={() => {
              setRetryFailed(false);
              void session.retryClassic().catch(() => setRetryFailed(true));
            }}
          />
        )}
        <Button
          label={uk.home.newGame}
          variant={canRetry ? 'secondary' : 'primary'}
          onPress={() => router.dismissTo('/?newGame=1')}
        />
        <Button label={uk.common.home} variant="quiet" onPress={returnHome} />
      </Page>
    );
  }

  if (paused) {
    return (
      <Page>
        <PageHeading title={uk.game.pause} subtitle={uk.difficulty[game.difficulty]} onBack={goBack} />
        <Card>
          <Text style={[styles.pauseCaption, { color: theme.muted }]}>{uk.common.time}</Text>
          <Text style={[styles.pauseTime, { color: theme.text }]}>{formatTime(game.elapsedMs)}</Text>
        </Card>
        <Button label={uk.game.resume} glyph="▶" onPress={() => session.setPaused(false)} />
        <Button label={uk.game.restart} variant="secondary" onPress={() => setSheet('restart')} />
        <Button label={uk.common.home} variant="quiet" onPress={returnHome} />
        {sheet === 'restart' && (
          <Sheet title={uk.game.restartQuestion} onClose={closeSheet}>
            <Text style={[styles.message, { color: theme.muted }]}>{uk.game.restartDescription}</Text>
            <Button label={uk.game.restart} onPress={() => { closeSheet(); session.restartGame(); }} />
            <Button label={uk.common.cancel} variant="quiet" onPress={closeSheet} />
          </Sheet>
        )}
      </Page>
    );
  }

  const canEdit = selected !== null && game.puzzle[selected] === 0;
  const tools = [
    { label: uk.game.undo, short: uk.game.undoShort, glyph: '↶', action: () => playAction(session.undoMove), disabled: game.cursor === 0 },
    { label: uk.game.redo, short: uk.game.redoShort, glyph: '↷', action: () => playAction(session.redoMove), disabled: game.cursor >= game.history.length },
    {
      label: uk.game.erase, short: uk.game.erase, glyph: '⌫', action: () => playAction(session.eraseSelected),
      disabled: !canEdit || !(game.board[selected] || game.notes[selected]),
    },
    { label: uk.game.notes, short: uk.game.notes, glyph: '✎', action: session.toggleNotes, active: notesMode },
    { label: uk.game.hint, short: uk.game.hint, glyph: '✦', action: () => setSheet('hint') },
  ];

  return (
    <Page>
      <GameHeader
        difficulty={game.difficulty}
        daily={game.type === 'daily'}
        mistakes={game.mistakes}
        showMistakes={settings.mistakeCheck || game.mistakes > 0}
        limit={settings.mistakeCheck ? settings.mistakeLimit : null}
        onBack={goBack}
        onPause={() => session.setPaused(true)}
      />
      <SudokuBoard
        board={game.board}
        puzzle={game.puzzle}
        solution={game.solution}
        notes={game.notes}
        selected={selected}
        settings={settings}
        hintCells={hint?.cells ?? NO_HINT_CELLS}
        onSelect={onSelect}
      />
      {(hint || feedback) && (
        <View accessibilityLiveRegion="polite" style={[styles.hint, { backgroundColor: theme.hintTint }]}>
          {hint && <Text style={[styles.hintTitle, { color: theme.hint }]}>{hint.technique}</Text>}
          <Text style={[styles.message, { color: theme.hint }]}>
            {hint?.explanation ?? (feedback ? uk.game[feedback] : '')}
          </Text>
          {hint && !hint.placement && (
            <Button label={uk.game.nextHint} variant="quiet" onPress={session.explainMove} />
          )}
        </View>
      )}
      <GameToolbar tools={tools} />
      <NumberPad board={game.board} solution={game.solution} onDigit={onDigit} disabled={!canEdit} />
      {sheet === 'hint' && (
        <Sheet title={uk.game.hint} onClose={closeSheet}>
          <Button label={uk.game.explain} onPress={() => { closeSheet(); session.explainMove(); }} />
          <Button label={uk.game.reveal} variant="secondary" onPress={() => { closeSheet(); playAction(session.revealDigit); }} />
        </Sheet>
      )}
    </Page>
  );
}

function playAction(action: () => void) {
  const before = useSessionStore.getState().game;
  action();
  const { game, settings } = useSessionStore.getState();
  if (!settings.hapticFeedback || !game || game === before) return;
  const vibration = game.status === 'won'
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : game.mistakes > (before?.mistakes ?? 0)
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      : Haptics.selectionAsync();
  void vibration.catch(() => {});
}

const styles = StyleSheet.create({
  pauseCaption: { fontSize: 15, fontWeight: '600' },
  pauseTime: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  message: { fontSize: 15, lineHeight: 22 },
  hint: { padding: 14, borderRadius: 14, gap: 4 },
  hintTitle: { fontSize: 15, fontWeight: '800' },
});
