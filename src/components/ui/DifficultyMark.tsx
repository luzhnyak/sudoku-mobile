import { StyleSheet, View } from 'react-native';

import type { Difficulty } from '../../engine';
import { useTheme } from '../../theme/theme';

export const difficultyLevels = ['easy', 'medium', 'hard', 'expert'] as const;

export function DifficultyMark({ difficulty }: { difficulty: Difficulty }) {
  const theme = useTheme();
  const level = difficultyLevels.indexOf(difficulty);
  return (
    <View style={styles.mark} importantForAccessibility="no-hide-descendants">
      {difficultyLevels.map((key, index) => (
        <View key={key} style={[
          styles.bar, { height: 6 + 3 * index, backgroundColor: index <= level ? theme.primary : theme.border },
        ]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: 'row', gap: 3, alignItems: 'flex-end' },
  bar: { width: 4, borderRadius: 2 },
});
