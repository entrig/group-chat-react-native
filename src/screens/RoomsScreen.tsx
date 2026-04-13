import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {supabase} from '../lib/supabase';
import {Group, RootStackParamList} from '../lib/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Rooms'>;

type Props = {
  onSignOut: () => void;
};

export default function RoomsScreen({onSignOut}: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSignOut} style={styles.headerButton}>
          <Ionicons name="log-out-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    loadUserAndGroups();
  }, []);

  const loadUserAndGroups = async () => {
    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();

      if (user) {
        const {data: userData} = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        setUserName(userData?.name || null);
      }

      await loadGroups();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      console.log('Loading groups for user:', user?.id);

      const {data: groupsData, error: groupsError} = await supabase
        .from('groups')
        .select('*')
        .order('created_at', {ascending: false});

      console.log('Groups data:', groupsData);
      console.log('Groups error:', groupsError);

      if (groupsError) throw groupsError;

      if (user) {
        const {data: memberData, error: memberError} = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        console.log('Member data:', memberData);
        if (memberError) throw memberError;

        const joinedIds = new Set(memberData.map(m => m.group_id));
        setJoinedGroupIds(joinedIds);
      }

      setGroups(groupsData || []);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', error.message || 'Failed to load groups');
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadGroups();
    setIsRefreshing(false);
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setIsCreating(true);

    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('userid', user.id);

      const {data: groupData, error: groupError} = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      await supabase.from('group_members').insert({
        group_id: groupData.id,
        user_id: user.id,
      });

      setShowCreateModal(false);
      setNewGroupName('');
      await loadGroups();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async (group: Group) => {
    const isJoined = joinedGroupIds.has(group.id);

    if (!isJoined) {
      Alert.alert('Join Group', `Do you want to join "${group.name}"?`, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Join',
          onPress: async () => {
            try {
              const {
                data: {user},
              } = await supabase.auth.getUser();
              if (!user) throw new Error('Not authenticated');

              await supabase.from('group_members').insert({
                group_id: group.id,
                user_id: user.id,
              });

              setJoinedGroupIds(prev => new Set(prev).add(group.id));
              navigation.navigate('Chat', {
                id: group.id,
                name: group.name,
              });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to join group');
            }
          },
        },
      ]);
    } else {
      navigation.navigate('Chat', {id: group.id, name: group.name});
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          onSignOut();
        },
      },
    ]);
  };

  const renderGroup = ({item}: {item: Group}) => {
    const isJoined = joinedGroupIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => handleJoinGroup(item)}>
        <View style={[styles.groupIcon, isJoined && styles.groupIconJoined]}>
          <Text style={styles.groupIconText}>
            {item.name[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          {isJoined && <Text style={styles.joinedBadge}>Joined</Text>}
        </View>
        <Ionicons
          name={isJoined ? 'chevron-forward' : 'log-in-outline'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {userName || 'Guest'}!</Text>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No groups yet</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create First Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group Name"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateGroup}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                }}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCreate]}
                onPress={handleCreateGroup}
                disabled={isCreating}>
                {isCreating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupIconJoined: {
    backgroundColor: '#007AFF',
  },
  groupIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  joinedBadge: {
    fontSize: 12,
    color: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonCreate: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
