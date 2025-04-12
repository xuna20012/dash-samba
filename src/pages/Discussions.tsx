import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, MoreVertical, Smile, Paperclip, Send, CheckCheck, Bot, UserCog } from 'lucide-react';
import { getDiscussions, getDiscussionMessages, sendMessage, deleteDiscussion, toggleAgentAssignment } from '../lib/api';
import { supabase } from '../lib/supabase';
import { truncateText } from '../lib/utils';
import type { Discussion, Message } from '../types';
import Swal from 'sweetalert2';

function formatMessageTime(date: string): string {
  const messageDate = new Date(date);
  const now = new Date();
  
  // If the message is from today, show only time
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // If the message is from yesterday, show "Hier"
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  }
  
  // For older messages, show the date
  return messageDate.toLocaleDateString();
}

export default function Discussions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadDiscussions();
    
    // Subscribe to real-time updates
    const discussionsSubscription = supabase
      .channel('discussions')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (insert, update, delete)
          schema: 'public',
          table: 'discussions'
        },
        async (payload) => {
          // If it's an update to assigned_to_agent, update just that discussion
          if (payload.eventType === 'UPDATE' && 'assigned_to_agent' in payload.new) {
            setDiscussions(prev => prev.map(discussion => 
              discussion.session_id === payload.new.session_id
                ? { ...discussion, assignedToAgent: payload.new.assigned_to_agent }
                : discussion
            ));
            
            if (selectedDiscussion?.session_id === payload.new.session_id) {
              setSelectedDiscussion(prev => prev ? {
                ...prev,
                assignedToAgent: payload.new.assigned_to_agent
              } : null);
            }
            return;
          }

          // For other changes, reload discussions
          await loadDiscussions();
          
          // If we're viewing the discussion that received a new message, update messages
          if (selectedDiscussion?.session_id === payload.new.session_id) {
            await loadMessages(payload.new.session_id);
            // Mark messages as read
            await markMessagesAsRead(payload.new.session_id);
          }
        }
      )
      .subscribe();

    // Add click event listener to close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      discussionsSubscription.unsubscribe();
    };
  }, [selectedDiscussion]);

  useEffect(() => {
    if (selectedDiscussion) {
      loadMessages(selectedDiscussion.session_id);
      markMessagesAsRead(selectedDiscussion.session_id);
    }
  }, [selectedDiscussion]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function markMessagesAsRead(session_id: string) {
    try {
      const { error } = await supabase
        .from('discussions')
        .update({ read: true })
        .eq('session_id', session_id)
        .eq('type', 'human')
        .eq('read', false);

      if (error) throw error;
      
      // Refresh discussions to update unread counts
      await loadDiscussions();
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  async function loadDiscussions() {
    try {
      const data = await getDiscussions();
      setDiscussions(data);
    } catch (error) {
      console.error('Failed to load discussions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(session_id: string) {
    try {
      const messages = await getDiscussionMessages(session_id);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  const filteredDiscussions = discussions.filter((discussion) =>
    discussion.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.session_id.includes(searchTerm)
  );

  const handleSelectDiscussion = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    setMenuOpen(null);
  };

  const handleDeleteDiscussion = async (discussion: Discussion) => {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette conversation sera définitivement supprimée !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00a884',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await deleteDiscussion(discussion.session_id);
        if (selectedDiscussion?.session_id === discussion.session_id) {
          setSelectedDiscussion(null);
          setMessages([]);
        }
        await loadDiscussions();
        setMenuOpen(null);
        
        await Swal.fire({
          icon: 'success',
          title: 'Supprimé !',
          text: 'La conversation a été supprimée.',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Failed to delete discussion:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de la suppression.',
        });
      }
    }
  };

  const handleToggleAssignment = async () => {
    if (!selectedDiscussion) return;

    try {
      // Optimistically update UI
      const newAssignedState = !selectedDiscussion.assignedToAgent;
      setSelectedDiscussion(prev => prev ? {
        ...prev,
        assignedToAgent: newAssignedState
      } : null);
      setDiscussions(prev => prev.map(discussion => 
        discussion.session_id === selectedDiscussion.session_id
          ? { ...discussion, assignedToAgent: newAssignedState }
          : discussion
      ));

      // Make API call
      await toggleAgentAssignment(selectedDiscussion.session_id, newAssignedState);
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: newAssignedState ? 'Conversation assignée à l\'agent' : 'Conversation rendue au chatbot',
        text: newAssignedState ? 'Vous avez maintenant le contrôle de la conversation' : 'Le chatbot peut maintenant répondre',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      // Revert optimistic update on error
      setSelectedDiscussion(prev => prev ? {
        ...prev,
        assignedToAgent: !newAssignedState
      } : null);
      setDiscussions(prev => prev.map(discussion => 
        discussion.session_id === selectedDiscussion.session_id
          ? { ...discussion, assignedToAgent: !newAssignedState }
          : discussion
      ));

      console.error('Error toggling assignment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors du changement d\'assignation',
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedDiscussion) return;

    try {
      const message = await sendMessage(
        selectedDiscussion.session_id,
        newMessage,
        selectedDiscussion.client_name
      );
      setMessages([...messages, message]);
      setNewMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Refresh discussions to update last message
      loadDiscussions();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setNewMessage(textarea.value);
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`; // Max height of 150px
  };

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-[#f0f2f5]">
      {/* Conversations List */}
      <div className="w-1/3 flex flex-col border-r border-whatsapp-border bg-white">
        <div className="p-4 border-b border-whatsapp-border">
          <h2 className="text-xl font-semibold mb-4">Discussions</h2>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              className="w-full pl-10 pr-4 py-2 bg-whatsapp-panel rounded-lg text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-gray scrollbar-thumb-rounded">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Chargement des discussions...</div>
          ) : filteredDiscussions.length > 0 ? (
            filteredDiscussions.map((discussion) => (
              <div
                key={discussion.session_id}
                className={`relative flex items-center px-4 py-3 hover:bg-whatsapp-panel cursor-pointer border-b border-whatsapp-border ${
                  selectedDiscussion?.session_id === discussion.session_id ? 'bg-whatsapp-panel' : ''
                }`}
                onClick={() => handleSelectDiscussion(discussion)}
              >
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(discussion.client_name)}&background=random`}
                  alt={discussion.client_name}
                  className="w-12 h-12 rounded-full"
                />
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium text-gray-900 truncate">
                      {discussion.client_name}
                    </h3>
                    <div className="flex items-center">
                      {discussion.unreadCount > 0 && (
                        <span className="bg-whatsapp-green text-white text-xs font-medium px-2 py-1 rounded-full mr-2">
                          {discussion.unreadCount}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 mr-2">
                        {discussion.lastMessage?.created_at && formatMessageTime(discussion.lastMessage.created_at)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === discussion.session_id ? null : discussion.session_id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <p className={`truncate ${discussion.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {discussion.lastMessage?.message && truncateText(discussion.lastMessage.message, 30)}
                    </p>
                  </div>
                </div>
                
                {/* Dropdown Menu */}
                {menuOpen === discussion.session_id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-4 top-12 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                  >
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDiscussion(discussion);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Supprimer la conversation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">Aucune discussion trouvée</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-2/3 flex flex-col h-full">
        {selectedDiscussion ? (
          <>
            {/* Chat Header */}
            <div className="h-16 min-h-[4rem] px-4 flex items-center justify-between bg-whatsapp-panel border-l border-whatsapp-border">
              <div className="flex items-center">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDiscussion.client_name)}&background=random`}
                  alt="Customer Avatar"
                  className="w-10 h-10 rounded-full"
                />
                <div className="ml-4">
                  <h3 className="font-medium">{selectedDiscussion.client_name}</h3>
                  <p className="text-sm text-gray-500">{selectedDiscussion.session_id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleToggleAssignment}
                  className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedDiscussion.assignedToAgent
                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {selectedDiscussion.assignedToAgent ? (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Laisser la main
                    </>
                  ) : (
                    <>
                      <UserCog className="h-4 w-4 mr-2" />
                      Prendre la main
                    </>
                  )}
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <Search className="h-5 w-5" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-[#efeae2] scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-gray scrollbar-thumb-rounded">
              <div className="min-h-full p-8">
                <div className="max-w-2xl mx-auto space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chat-bubble ${message.type === 'ai' ? 'agent' : 'user'}`}
                    >
                      <p style={{ whiteSpace: 'pre-wrap' }}>{message.message}</p>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {message.type === 'ai' && <CheckCheck className="inline h-3 w-3 ml-1 text-whatsapp-green" />}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="bg-whatsapp-panel px-4 py-3 border-t border-whatsapp-border">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                <button type="button" className="text-gray-600 hover:text-gray-900">
                  <Smile className="h-6 w-6" />
                </button>
                <button type="button" className="text-gray-600 hover:text-gray-900">
                  <Paperclip className="h-6 w-6" />
                </button>
                <textarea
                  ref={textareaRef}
                  placeholder="Écrivez un message"
                  className="flex-1 py-2 px-4 bg-white rounded-lg focus:outline-none resize-none min-h-[40px] max-h-[150px] overflow-y-auto"
                  value={newMessage}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  disabled={!selectedDiscussion.assignedToAgent}
                  rows={1}
                />
                <button
                  type="submit"
                  className={`text-whatsapp-green hover:text-green-700 ${!selectedDiscussion.assignedToAgent && 'opacity-50 cursor-not-allowed'}`}
                  disabled={!selectedDiscussion.assignedToAgent || !newMessage.trim()}
                >
                  <Send className="h-6 w-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
            <div className="text-center">
              <div className="w-48 h-48 mx-auto mb-6 bg-whatsapp-drawer rounded-full flex items-center justify-center">
                <MessageSquare className="h-16 w-16 text-whatsapp-green" />
              </div>
              <h1 className="text-2xl font-light text-gray-900 mb-3">Sélectionnez une conversation</h1>
              <p className="text-sm text-gray-600">
                Choisissez une conversation dans la liste pour commencer à discuter
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}