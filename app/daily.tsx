import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GameResult } from '../src/components/game/GameResult';
import { Button, Card, Page, PageHeading, Status } from '../src/components/ui/controls';
import { DifficultyMark } from '../src/components/ui/DifficultyMark';
import { getRepository } from '../src/database';
import { dailyDifficulty } from '../src/engine';
import { goBack, useFocusedResource } from '../src/hooks/navigation';
import { uk } from '../src/localization/uk';
import { flushSaves, useSessionStore } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/theme';
import { formatDate, localDate } from '../src/utils/format';

export default function DailyScreen() {
  const theme = useTheme();
  const foreground = useSessionStore((state) => state.foreground);
  const [date, setDate] = useState(localDate);
  const busy = useSessionStore((state) => state.busy);
  const openDaily = useSessionStore((state) => state.openDaily);
  const [startFailed, setStartFailed] = useState(false);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));
  useFocusEffect(useCallback(() => {
    if (!foreground) return;
    let timeout: ReturnType<typeof setTimeout>;
    function scheduleDayChange() {
      const now = new Date();
      setDate(localDate(now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timeout = setTimeout(scheduleDayChange, midnight.getTime() - now.getTime());
    }
    scheduleDayChange();
    return () => clearTimeout(timeout);
  }, [foreground]));
  const load = useCallback(async () => {
    if (foreground) await flushSaves();
    return (await getRepository()).getDaily(date);
  }, [date, foreground]);
  const { data: game, error, retry } = useFocusedResource(load);
  const difficulty = game?.difficulty ?? dailyDifficulty(date);

  async function start() {
    setStartFailed(false);
    try {
      if (await openDaily(localDate()) && focused.current) router.navigate('/game');
    } catch {
      setStartFailed(true);
    }
  }

  return (
    <Page>
      <PageHeading title={uk.home.daily} subtitle={formatDate(date)} onBack={goBack} />
      {error ? (
        <Status message={uk.common.error} action={<Button label={uk.common.retry} onPress={retry} />} />
      ) : game === undefined ? (
        <Status loading message={uk.common.loading} />
      ) : game && game.status !== 'playing' ? (
        <GameResult game={game} />
      ) : (
        <>
          <Card>
            <View style={styles.level}>
              <DifficultyMark difficulty={difficulty} />
              <Text style={[styles.levelText, { color: theme.text }]}>{uk.difficulty[difficulty]}</Text>
            </View>
            <Text style={[styles.caption, { color: theme.muted }]}>{game ? uk.daily.progress : uk.daily.available}</Text>
          </Card>
          {startFailed && <Status message={uk.common.startError} />}
          {busy ? <Status loading message={uk.common.generating} /> : (
            <Button label={game ? uk.home.continue : uk.daily.start} onPress={() => void start()} />
          )}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  level: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  levelText: { fontSize: 22, fontWeight: '800' },
  caption: { fontSize: 15, fontWeight: '600' },
});
