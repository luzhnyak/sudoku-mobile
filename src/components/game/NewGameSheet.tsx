import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { Difficulty } from '../../engine';
import { uk } from '../../localization/uk';
import { useSessionStore } from '../../store/sessionStore';
import { useTheme } from '../../theme/theme';
import { SectionTitle, Sheet, Status } from '../ui/controls';
import { DifficultyMark, difficultyLevels } from '../ui/DifficultyMark';

export function NewGameSheet({ onClose, onStarted }: {
  onClose: () => void;
  onStarted?: () => void;
}) {
  const theme = useTheme();
  const busy = useSessionStore((state) => state.busy);
  const startClassic = useSessionStore((state) => state.startClassic);
  const [error, setError] = useState(false);

  async function start(difficulty: Difficulty) {
    setError(false);
    try {
      if (!await startClassic(difficulty)) return;
      onClose();
      onStarted?.();
    } catch {
      setError(true);
    }
  }

  return (
    <Sheet title={uk.home.chooseLevel} onClose={() => { if (!busy) onClose(); }}>
      {busy ? <Status loading message={uk.common.generating} /> : (
        <>
          {error && <Status message={uk.common.startError} />}
          {difficultyLevels.map((difficulty) => (
            <Pressable
              key={difficulty}
              accessibilityRole="button"
              onPress={() => void start(difficulty)}
              style={({ pressed }) => [
                styles.level,
                { backgroundColor: pressed ? theme.primaryTint : theme.surfaceMuted },
              ]}
            >
              <DifficultyMark difficulty={difficulty} />
              <SectionTitle>{uk.difficulty[difficulty]}</SectionTitle>
              <Text style={[styles.chevron, { color: theme.primary }]}>›</Text>
            </Pressable>
          ))}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  level: { minHeight: 52, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 13 },
  chevron: { marginLeft: 'auto', fontSize: 24 },
});
