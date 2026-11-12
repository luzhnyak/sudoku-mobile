import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Page, PageHeading, SectionTitle, Status } from '../src/components/ui/controls';
import { difficultyLevels } from '../src/components/ui/DifficultyMark';
import { getRepository } from '../src/database';
import { goBack, useFocusedResource } from '../src/hooks/navigation';
import { uk } from '../src/localization/uk';
import { flushSaves } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/theme';
import { formatDate, formatDays, formatTime, localDate } from '../src/utils/format';

const filters = ['all', ...difficultyLevels] as const;
type Filter = (typeof filters)[number];

export default function StatisticsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [visibleDays, setVisibleDays] = useState(7);
  const load = useCallback(async () => {
    await flushSaves();
    return (await getRepository()).getStatistics(localDate());
  }, []);
  const { data, error, retry } = useFocusedResource(load);
  const time = (value: number | null) => value === null ? uk.statistics.empty : formatTime(value);
  const stats = data ? (filter === 'all' ? data.total : data.byDifficulty[filter]) : null;
  const rate = stats?.started ? Math.round(stats.completed * 100 / stats.started) : 0;

  return (
    <Page>
      <PageHeading title={uk.home.stats} onBack={goBack} />
      {error && <Status message={uk.common.error} action={<Button label={uk.common.retry} onPress={retry} />} />}
      {!error && !data && <Status loading message={uk.common.loading} />}
      {data && stats && (
        <>
          <SectionTitle>{uk.statistics.byDifficulty}</SectionTitle>
          <View style={styles.filters}>
            {filters.map((item) => {
              const active = item === filter;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filter,
                    { backgroundColor: active ? theme.primaryTint : theme.surface, borderColor: active ? theme.primary : theme.border },
                  ]}
                >
                  <Text style={[styles.filterLabel, { color: active ? theme.primary : theme.muted }]}>
                    {item === 'all' ? uk.statistics.all : uk.difficulty[item]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Card>
            <View style={styles.summary}>
              <Metric label={uk.statistics.started} value={String(stats.started)} />
              <Metric label={uk.statistics.won} value={String(stats.won)} />
              <Metric label={uk.statistics.rate} value={`${rate}%`} />
            </View>
          </Card>
          <Card>
            <MetricRow label={uk.statistics.best} value={time(stats.bestMs)} />
            <MetricRow label={uk.statistics.average} value={time(stats.averageMs)} />
            <MetricRow label={uk.common.mistakes} value={String(stats.mistakes)} />
            <MetricRow label={uk.common.hints} value={String(stats.hintsUsed)} />
          </Card>
          <SectionTitle>{uk.statistics.daily}</SectionTitle>
          <Card>
            <MetricRow label={uk.daily.streak} value={formatDays(data.currentStreak)} />
            <MetricRow label={uk.daily.bestStreak} value={formatDays(data.longestStreak)} />
          </Card>
          {data.dailyResults.length > 0 && (
            <>
              <SectionTitle>{uk.statistics.dailyResults}</SectionTitle>
              <Card>
                {data.dailyResults.slice(0, visibleDays).map((result) => (
                  <View key={result.date} style={styles.day}>
                    <Text style={[styles.rowValue, { color: theme.text }]}>{formatDate(result.date)}</Text>
                    <Text style={[styles.label, { color: result.status === 'won' ? theme.primary : theme.warning }]}>
                      {result.status === 'won' ? uk.daily.won : uk.game.lost}
                    </Text>
                    <Text style={[styles.label, { color: theme.muted }]}>
                      {formatTime(result.elapsedMs)} · {uk.common.mistakes} {result.mistakes}
                    </Text>
                  </View>
                ))}
                {visibleDays < data.dailyResults.length && (
                  <Button label={uk.statistics.more} variant="secondary" onPress={() => setVisibleDays((days) => days + 7)} />
                )}
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.value, { color: theme.primary }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filter: { borderWidth: 1, minHeight: 42, paddingVertical: 8, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 12 },
  filterLabel: { fontSize: 13, fontWeight: '700' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, minWidth: 72, gap: 4 },
  value: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowLabel: { flexShrink: 1, fontSize: 15, fontWeight: '600' },
  rowValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  day: { gap: 3, paddingVertical: 4 },
});
