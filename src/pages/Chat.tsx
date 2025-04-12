import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search, MoreVertical, Smile, Paperclip, Send, CheckCheck, Bot, UserCog } from 'lucide-react';
import { toggleAgentAssignment } from '../lib/api';
import type { Message } from '../types';
import Swal from 'sweetalert2';

// Mock data for demonstration
const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hello, I need help with my order',
    timestamp: '2024-02-28T10:00:00Z',
    sender: {
      type: 'user',
      id: '1',
      name: 'Alice Johnson',
    },
  },
  {
    id: '2',
    content: 'Hi! I understand you need assistance with your order. Let me help you with that.',
    timestamp: '2024-02-28T10:01:00Z',
    sender: {
      type: 'agent',
      id: '2',
      name: 'John Doe',
    },
  },
];

// Mock customer data
const mockCustomers = [
  {
    id: '1',
    name: 'Alice Johnson',
    phoneNumber: '+1234567890',
    status: 'online',
  },
  {
    id: '2',
    name: 'Bob Smith',
    phoneNumber: '+1234567891',
    status: 'online',
  },
];

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState(mockMessages);
  const [isAssignedToAgent, setIsAssignedToAgent] = useState(false);

  const currentCustomer = mockCustomers.find(c => c.id === conversationId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      timestamp: new Date().toISOString(),
      sender: {
        type: 'agent',
        id: '2',
        name: 'John Doe',
      },
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleToggleAssignment = async () => {
    try {
      await toggleAgentAssignment(conversationId!, !isAssignedToAgent);
      setIsAssignedToAgent(!isAssignedToAgent);
      
      await Swal.fire({
        icon: 'success',
        title: isAssignedToAgent ? 'Conversation rendue au chatbot' : 'Conversation assignée à l\'agent',
        text: isAssignedToAgent ? 'Le chatbot peut maintenant répondre' : 'Vous avez maintenant le contrôle de la conversation',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error toggling assignment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors du changement d\'assignation',
      });
    }
  };

  if (!currentCustomer) {
    return <div className="flex-1 bg-[#efeae2] flex items-center justify-center">Client non trouvé</div>;
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2]">
      {/* Chat Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-whatsapp-panel">
        <div className="flex items-center">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentCustomer.name)}&background=random`}
            alt="Customer Avatar"
            className="w-10 h-10 rounded-full"
          />
          <div className="ml-4">
            <h3 className="font-medium">{currentCustomer.name}</h3>
            <p className="text-sm text-gray-500">{currentCustomer.status}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleToggleAssignment}
            className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isAssignedToAgent
                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            {isAssignedToAgent ? (
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
      <div className="flex-1 overflow-y-auto p-8 scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-gray scrollbar-thumb-rounded">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-bubble ${message.sender.type === 'agent' ? 'agent' : 'user'}`}
            >
              <p>{message.content}</p>
              <div className="text-xs text-gray-500 mt-1 text-right">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {message.sender.type === 'agent' && <CheckCheck className="inline h-3 w-3 ml-1 text-whatsapp-green" />}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-whatsapp-panel px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
          <button type="button" className="text-gray-600 hover:text-gray-900">
            <Smile className="h-6 w-6" />
          </button>
          <button type="button" className="text-gray-600 hover:text-gray-900">
            <Paperclip className="h-6 w-6" />
          </button>
          <input
            type="text"
            placeholder="Type a message"
            className="flex-1 py-2 px-4 bg-white rounded-lg focus:outline-none"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!isAssignedToAgent}
          />
          <button
            type="submit"
            className={`text-whatsapp-green hover:text-green-700 ${!isAssignedToAgent && 'opacity-50 cursor-not-allowed'}`}
            disabled={!isAssignedToAgent || !newMessage.trim()}
          >
            <Send className="h-6 w-6" />
          </button>
        </form>
      </div>
    </div>
  );
}