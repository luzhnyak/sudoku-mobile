import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function useFocusedResource<T>(load: () => Promise<T>) {
  const [resource, setResource] = useState<{ data?: T; error?: boolean }>({});
  const [request, setRequest] = useState(0);
  useFocusEffect(useCallback(() => {
    let subscribed = true;
    setResource({});
    void load().then(
      (data) => { if (subscribed) setResource({ data }); },
      () => { if (subscribed) setResource({ error: true }); },
    );
    return () => { subscribed = false; };
  }, [load, request]));
  return { ...resource, retry: () => setRequest((value) => value + 1) };
}
