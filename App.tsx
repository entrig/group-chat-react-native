import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ENTRIG_API_KEY } from "@env";
import Entrig, { NotificationEvent } from "@entrig/react-native";

import { supabase } from "./src/lib/supabase";
import { RootStackParamList } from "./src/lib/types";
import SignInScreen from "./src/screens/SignInScreen";
import RoomsScreen from "./src/screens/RoomsScreen";
import ChatScreen from "./src/screens/ChatScreen";
import type { Session } from "@supabase/supabase-js";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entrigInitialized, setEntrigInitialized] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(
    null,
  );

  const handleNotification = (event: NotificationEvent) => {
    const type = event?.type;
    const data = event.data;
    switch (type) {
      case "new_message":
        navigationRef.current?.navigate("Chat", {
          id: data["group_id"],
          name: data["group_name"],
        });
        break;
    }
  };

  // Initialize Entrig
  useEffect(() => {
    const initEntrig = async () => {
      try {
        const apiKey = ENTRIG_API_KEY;
        await Entrig.init({ apiKey, showForegroundNotification: false });
        setEntrigInitialized(true);

        Entrig.getInitialNotification().then((event) => {
          handleNotification(event!);
        });

        // Set up notification listeners
        const openedSub = Entrig.onNotificationOpened((event) => {
          handleNotification(event);
        });

        return () => {
          openedSub.remove();
        };
      } catch (error) {
        console.error("Failed to initialize Entrig:", error);
      }
    };

    initEntrig();
  }, []);

  // Handle auth state and Entrig registration
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);

      if (event === "SIGNED_IN" && s?.user) {
        await Entrig.register(s.user.id);
      } else if (event === "SIGNED_OUT") {
        await Entrig.unregister();
      }
    });

    return () => subscription.unsubscribe();
  }, [entrigInitialized]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator>
        {!session
          ? (
            <Stack.Screen name="SignIn" options={{ headerShown: false }}>
              {() => (
                <SignInScreen
                  onSignedIn={() => {
                    // Auth state change listener will handle navigation
                  }}
                />
              )}
            </Stack.Screen>
          )
          : (
            <>
              <Stack.Screen name="Rooms" options={{ title: "Rooms" }}>
                {() => (
                  <RoomsScreen
                    onSignOut={() => {
                      // Auth state change listener will handle navigation
                    }}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ headerShown: true }}
              />
            </>
          )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
