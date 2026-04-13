import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {supabase} from './src/lib/supabase';
import {RootStackParamList} from './src/lib/types';
import SignInScreen from './src/screens/SignInScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import ChatScreen from './src/screens/ChatScreen';
import type {Session} from '@supabase/supabase-js';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  // Handle auth state and Entrig registration
  useEffect(() => {
    supabase.auth.getSession().then(({data: {session: s}}) => {
      setSession(s);
      setIsLoading(false);
    });

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);

    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator>
        {!session ? (
          <Stack.Screen name="SignIn" options={{headerShown: false}}>
            {() => (
              <SignInScreen
                onSignedIn={() => {
                  // Auth state change listener will handle navigation
                }}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Rooms" options={{title: 'Rooms'}}>
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
              options={{headerShown: true}}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
