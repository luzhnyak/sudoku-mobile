import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/theme';

export function BackIcon() {
  const theme = useTheme();
  return (
    <View style={styles.icon} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <View style={[styles.stroke, styles.upper, { backgroundColor: theme.text }]} />
      <View style={[styles.stroke, styles.lower, { backgroundColor: theme.text }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 20, height: 20 },
  stroke: { position: 'absolute', left: 4, width: 12, height: 2, borderRadius: 1 },
  upper: { top: 5, transform: [{ rotate: '-45deg' }] },
  lower: { top: 13, transform: [{ rotate: '45deg' }] },
});
