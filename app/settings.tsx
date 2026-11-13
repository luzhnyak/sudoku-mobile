import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, Page, PageHeading, SectionTitle } from '../src/components/ui/controls';
import type { Settings } from '../src/game/model';
import { goBack } from '../src/hooks/navigation';
import { uk } from '../src/localization/uk';
import { useSessionStore } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/theme';

const themes = ['system', 'light', 'dark'] as const;
const limits = [null, 3, 5, 10] as const;
type Toggle = 'highlightMatchingNumbers' | 'highlightConflicts' | 'autoRemoveNotes' | 'mistakeCheck' | 'hapticFeedback';

const boardToggles = [
  ['highlightMatchingNumbers', uk.settings.matching, uk.settings.matchingDetail],
  ['highlightConflicts', uk.settings.conflicts, uk.settings.conflictsDetail],
  ['autoRemoveNotes', uk.settings.autoNotes, uk.settings.autoNotesDetail],
  ['mistakeCheck', uk.settings.mistakes, uk.settings.mistakesDetail],
] as const;

export default function SettingsScreen() {
  const theme = useTheme();
  const settings = useSessionStore((state) => state.settings);
  const change = useSessionStore((state) => state.changeSettings);

  return (
    <Page fullWidth>
      <PageHeading title={uk.home.settings} onBack={goBack} inline />
      <SectionTitle>{uk.settings.appearance}</SectionTitle>
      <Card>
        <View style={styles.choices}>
          {themes.map((choice) => (
            <Choice
              key={choice}
              label={uk.settings[choice]}
              selected={settings.theme === choice}
              onPress={() => change({ theme: choice })}
            />
          ))}
        </View>
      </Card>
      <SectionTitle>{uk.settings.board}</SectionTitle>
      <Card>
        {boardToggles.map(([key, label, detail]) => (
          <ToggleRow key={key} setting={key} label={label} detail={detail} settings={settings} change={change} />
        ))}
        <View style={[styles.limit, { borderTopColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.text }]}>{uk.settings.limit}</Text>
          <Text style={[styles.detail, { color: theme.muted }]}>{uk.settings.limitDetail}</Text>
          <View style={styles.choices}>
            {limits.map((limit) => (
              <Choice
                key={limit ?? 0}
                label={limit === null ? uk.settings.off : String(limit)}
                selected={settings.mistakeLimit === limit}
                disabled={!settings.mistakeCheck}
                onPress={() => change({ mistakeLimit: limit })}
              />
            ))}
          </View>
        </View>
      </Card>
      <SectionTitle>{uk.settings.feedback}</SectionTitle>
      <Card>
        <ToggleRow
          setting="hapticFeedback" label={uk.settings.haptics} detail={uk.settings.hapticsDetail}
          settings={settings} change={change}
        />
      </Card>
    </Page>
  );
}

function Choice({ label, selected, disabled = false, onPress }: {
  label: string; selected: boolean; disabled?: boolean; onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          opacity: disabled ? 0.55 : 1,
          backgroundColor: selected || pressed ? theme.primaryTint : theme.surfaceMuted,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={[styles.choiceLabel, { color: selected ? theme.primary : theme.muted }]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({ setting, label, detail, settings, change }: {
  setting: Toggle;
  label: string;
  detail: string;
  settings: Settings;
  change: (patch: Partial<Settings>) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.detail, { color: theme.muted }]}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={detail}
        value={settings[setting]}
        onValueChange={(value) => change({ [setting]: value })}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor={settings[setting] ? theme.onPrimary : theme.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: {
    flexGrow: 1, minHeight: 42, padding: 8, borderWidth: 1,
    borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  choiceLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 55 },
  rowCopy: { flex: 1, gap: 4 },
  label: { fontSize: 16, fontWeight: '800' },
  detail: { fontSize: 13, lineHeight: 18 },
  limit: { borderTopWidth: 1, paddingTop: 12, gap: 7 },
});
