export interface User {
  id: string;
  name: string;
  created_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at?: string;
}

export interface Message {
  id: string;
  content: string;
  user_id: string;
  group_id: string;
  editor?: string;
  created_at?: string;
  users?: User;
}

export interface GroupMember {
  user_id: string;
  group_id: string;
  created_at?: string;
}

export type RootStackParamList = {
  SignIn: undefined;
  Rooms: undefined;
  Chat: {id: string; name: string};
};
