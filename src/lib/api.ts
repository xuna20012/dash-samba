import { supabase } from './supabase';
import { sendWhatsAppMessage } from './whatsapp';
import type { Message, Discussion, Quote } from '../types';

export async function getDiscussions(): Promise<Discussion[]> {
  const { data: messages, error } = await supabase
    .from('discussions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching discussions:', error);
    throw error;
  }

  // Group messages by session_id
  const discussionMap = new Map<string, Discussion>();
  
  messages.forEach((message: Message) => {
    const existing = discussionMap.get(message.session_id);
    
    if (existing) {
      existing.messages.push(message);
      // Update last message if this message is more recent
      if (!existing.lastMessage || new Date(message.created_at) > new Date(existing.lastMessage.created_at)) {
        existing.lastMessage = message;
      }
      // Count unread messages (only count human messages)
      if (message.type === 'human' && !message.read) {
        existing.unreadCount = (existing.unreadCount || 0) + 1;
      }
      // Update assigned status
      existing.assignedToAgent = message.assigned_to_agent;
    } else {
      discussionMap.set(message.session_id, {
        session_id: message.session_id,
        messages: [message],
        lastMessage: message,
        client_name: message.client_name,
        client_phone: message.session_id, // Use session_id as phone number
        unreadCount: message.type === 'human' && !message.read ? 1 : 0,
        assignedToAgent: message.assigned_to_agent
      });
    }
  });

  // Convert to array and sort by last message date
  return Array.from(discussionMap.values())
    .sort((a, b) => {
      const dateA = new Date(a.lastMessage?.created_at || '');
      const dateB = new Date(b.lastMessage?.created_at || '');
      return dateB.getTime() - dateA.getTime(); // Sort in descending order (most recent first)
    });
}

export async function getDiscussionMessages(session_id: string): Promise<Message[]> {
  const { data: messages, error } = await supabase
    .from('discussions')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching discussion messages:', error);
    throw error;
  }

  return messages.map(message => ({
    ...message,
    client_phone: message.session_id, // Use session_id as phone number
  }));
}

export async function sendMessage(session_id: string, message: string, client_name: string): Promise<Message> {
  try {
    // First send message via WhatsApp
    await sendWhatsAppMessage(session_id, message);

    // Get current assigned_to_agent value
    const { data: currentMessages, error: fetchError } = await supabase
      .from('discussions')
      .select('assigned_to_agent')
      .eq('session_id', session_id)
      .limit(1)
      .single();

    if (fetchError) throw fetchError;

    // Then store in database with the same assigned_to_agent value
    const { data, error } = await supabase
      .from('discussions')
      .insert([
        {
          session_id,
          type: 'ai',
          message,
          client_name,
          read: true, // AI messages are always marked as read
          assigned_to_agent: currentMessages.assigned_to_agent // Maintain the current assignment state
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      client_phone: session_id, // Use session_id as phone number
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function toggleAgentAssignment(session_id: string, assigned: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('discussions')
      .update({ assigned_to_agent: assigned })
      .eq('session_id', session_id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating agent assignment:', error);
    throw error;
  }
}

export async function deleteDiscussion(session_id: string): Promise<void> {
  const { error } = await supabase
    .from('discussions')
    .delete()
    .eq('session_id', session_id);

  if (error) {
    console.error('Error deleting discussion:', error);
    throw error;
  }
}

export async function getQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotes:', error);
    throw error;
  }

  return data || [];
}

export async function getQuote(id: string): Promise<Quote> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching quote:', error);
    throw error;
  }

  return data;
}

export async function createQuote(quote: Omit<Quote, 'id' | 'created_at' | 'updated_at'>): Promise<Quote> {
  const { data, error } = await supabase
    .from('quotes')
    .insert([quote])
    .select()
    .single();

  if (error) {
    console.error('Error creating quote:', error);
    throw error;
  }

  return data;
}

export async function updateQuote(id: string, quote: Partial<Quote>): Promise<Quote> {
  const { data, error } = await supabase
    .from('quotes')
    .update(quote)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating quote:', error);
    throw error;
  }

  return data;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting quote:', error);
    throw error;
  }
}