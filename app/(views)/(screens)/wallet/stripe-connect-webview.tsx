import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { theme } from '@/theme';
import { useFocusEffect } from 'expo-router';

export default function StripeConnectWebView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { url } = useLocalSearchParams<{ url: string }>();

  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const injectedJS = `
    (function() {
      const originalPostMessage = window.postMessage;
      window.postMessage = function(data) {
        originalPostMessage(data, '*');
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      };
    })();
  `;

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    if (url.includes('return_url') || url.includes('refresh_url')) {
      // User finished or cancelled; close webview
      router.back();
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      // Optionally handle messages from Stripe page
    } catch {
      // ignore
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setError(nativeEvent.description || 'Unknown error');
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    const handleBack = () => {
      router.back();
      return true;
    };
    // Listen for hardware back button
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={[ss.container, { paddingTop: insets.top }]}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()} style={ss.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.secondary} />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Stripe Connect</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? (
        <View style={ss.center}>
          <Ionicons name="warning-outline" size={48} color={theme.colors.secondary} />
          <Text style={ss.errorTitle}>Erreur de chargement</Text>
          <Text style={ss.errorSub}>{error}</Text>
          <TouchableOpacity style={[ss.retryBtn, { backgroundColor: theme.colors.primary }]} onPress={() => router.back()}>
            <Text style={ss.retryBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: url || '' }}
          style={ss.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          onError={handleError}
          onLoad={handleLoad}
          injectedJavaScript={injectedJS}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          rendersUnsafeHTML
        />
      )}

      {loading && !error && (
        <View style={ss.loadingOverlay}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={ss.loadingText}>Chargement...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.secondary,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
});
