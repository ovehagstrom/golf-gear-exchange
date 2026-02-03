import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { ReportModal } from '@/components/moderation/ReportModal';
import { UserActionsMenu } from '@/components/moderation/UserActionsMenu';
import { Loader2, Send, ArrowLeft, Flag } from 'lucide-react';
import { PublicProfile } from '@/lib/types';

type ConversationWithDetails = Tables<'conversations'> & {
  listings: Tables<'listings'> | null;
  buyer: PublicProfile | null;
  seller: PublicProfile | null;
};

type MessageWithSender = Tables<'messages'> & {
  profiles: PublicProfile | null;
};

export default function Conversation() {
  const { id } = useParams();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchConversation();
      fetchMessages();
      subscribeToMessages();
    }
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        listings(*),
        buyer:profiles_public!conversations_buyer_id_fkey(*),
        seller:profiles_public!conversations_seller_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
    } else {
      setConversation(data);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles:profiles_public!messages_sender_id_fkey(*)')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        async (payload) => {
          // Fetch the complete message with profile
          const { data } = await supabase
            .from('messages')
            .select('*, profiles:profiles_public!messages_sender_id_fkey(*)')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !id) return;

    setSending(true);
    
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: user.id,
        content: newMessage.trim(),
      });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
    
    setSending(false);
  };

  const formatTime = (date: string) => {
    return new Intl.DateTimeFormat('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('sv-SE', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!conversation) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-2">Konversation hittades inte</h1>
          <Button asChild>
            <Link to="/messages">Tillbaka till meddelanden</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const otherUser = user?.id === conversation.buyer_id ? conversation.seller : conversation.buyer;

  return (
    <Layout>
      <div className="container max-w-3xl py-6 h-[calc(100vh-12rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <Link to="/messages" className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {otherUser?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <p className="font-medium">{otherUser?.full_name || 'Användare'}</p>
            {conversation.listings && (
              <Link 
                to={`/listings/${conversation.listings.id}`}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {conversation.listings.brand} {conversation.listings.model}
              </Link>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <ReportModal
              type="conversation"
              targetId={id!}
              targetName={`Chatt med ${otherUser?.full_name || 'användare'}`}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Flag className="h-4 w-4" />
                </Button>
              }
            />
            {otherUser && (
              <UserActionsMenu 
                userId={otherUser.id} 
                userName={otherUser.full_name || undefined}
              />
            )}
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.map((message, i) => {
            const isOwn = message.sender_id === user?.id;
            const showDate = i === 0 || 
              formatDate(message.created_at) !== formatDate(messages[i - 1].created_at);

            return (
              <div key={message.id}>
                {showDate && (
                  <p className="text-center text-xs text-muted-foreground my-4">
                    {formatDate(message.created_at)}
                  </p>
                )}
                
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2 pt-4 border-t">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Skriv ett meddelande..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Layout>
  );
}