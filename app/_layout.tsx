import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Button, Page, Status } from '../src/components/ui/controls';
import { uk } from '../src/localization/uk';
import { flushSaves, useSessionStore } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/theme';

export default function RootLayout() {
  const theme = useTheme();
  const ready = useSessionStore((state) => state.ready);
  const loadFailed = useSessionStore((state) => state.loadFailed);
  const saveFailed = useSessionStore((state) => state.saveFailed);
  const initialize = useSessionStore((state) => state.initialize);
  const setForeground = useSessionStore((state) => state.setForeground);
  const setWindowFocused = useSessionStore((state) => state.setWindowFocused);

  useEffect(() => {
    void initialize();
    setForeground(AppState.currentState == null || AppState.currentState === 'active');
    const subscriptions = [AppState.addEventListener('change', (state) => setForeground(state === 'active'))];
    if (Platform.OS === 'android') {
      subscriptions.push(AppState.addEventListener('blur', () => setWindowFocused(false)));
      subscriptions.push(AppState.addEventListener('focus', () => setWindowFocused(true)));
    }
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [initialize, setForeground, setWindowFocused]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
      ) : (
        <Page>
          <Status
            loading={!loadFailed}
            message={loadFailed ? uk.common.error : uk.common.loading}
            action={loadFailed && <Button label={uk.common.retry} onPress={() => void initialize()} />}
          />
        </Page>
      )}
      {saveFailed && (
        <View style={[styles.saveError, { backgroundColor: theme.warningTint }]}>
          <Status
            message={uk.common.saveError}
            action={<Button label={uk.common.retrySave} onPress={() => void flushSaves()} />}
          />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  saveError: { position: 'absolute', left: 16, right: 16, bottom: 52, borderRadius: 18 },
});
