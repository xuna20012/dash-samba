export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  phone?: string;
  avatar_url?: string;
};

export type Message = {
  id: number;
  session_id: string;
  type: 'human' | 'ai';
  message: string;
  created_at: string;
  client_name: string;
  client_phone?: string;
  read: boolean;
  assigned_to_agent: boolean;
};

export type Discussion = {
  session_id: string;
  messages: Message[];
  lastMessage?: Message;
  client_name: string;
  client_phone?: string;
  unreadCount: number;
  assignedToAgent: boolean;
};

export type Quote = {
  id: string;
  customer_name: string;
  phone_number: string;
  email: string;
  amount: number;
  details: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  customer: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  status: 'pending' | 'active' | 'resolved';
  lastMessage?: Message;
  updatedAt: string;
  assignedTo?: User;
};