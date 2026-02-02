import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, MessageSquare } from 'lucide-react';
import { PublicProfile } from '@/lib/types';

type ConversationWithDetails = Tables<'conversations'> & {
  listings: Tables<'listings'> | null;
  buyer: PublicProfile | null;
  seller: PublicProfile | null;
  lastMessage?: Tables<'messages'> | null;
};

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchConversations();
    }
  }, [user, authLoading, navigate]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        listings(*),
        buyer:profiles_public!conversations_buyer_id_fkey(*),
        seller:profiles_public!conversations_seller_id_fkey(*)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      // Fetch last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conv,
            lastMessage: messages?.[0] || null,
          };
        })
      );

      setConversations(conversationsWithMessages);
    }
    setLoading(false);
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    const intervals = [
      { label: 'v', seconds: 604800 },
      { label: 'd', seconds: 86400 },
      { label: 'h', seconds: 3600 },
      { label: 'm', seconds: 60 },
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `${count}${interval.label}`;
      }
    }
    return 'nu';
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        <h1 className="text-3xl font-display font-bold mb-6">Meddelanden</h1>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Inga meddelanden än</h2>
              <p className="text-muted-foreground">
                När du kontaktar en säljare eller får ett meddelande visas det här.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const otherUser = user?.id === conv.buyer_id ? conv.seller : conv.buyer;
              const unread = conv.lastMessage && 
                conv.lastMessage.sender_id !== user?.id && 
                !conv.lastMessage.is_read;

              return (
                <Link key={conv.id} to={`/messages/${conv.id}`}>
                  <Card className={`hover:bg-muted/50 transition-colors ${unread ? 'border-primary' : ''}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {otherUser?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-medium truncate ${unread ? 'text-primary' : ''}`}>
                            {otherUser?.full_name || 'Användare'}
                          </p>
                          {conv.lastMessage && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {timeAgo(conv.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        
                        {conv.listings && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.listings.brand} {conv.listings.model}
                          </p>
                        )}
                        
                        {conv.lastMessage && (
                          <p className={`text-sm truncate ${unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {conv.lastMessage.sender_id === user?.id ? 'Du: ' : ''}
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>

                      {unread && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}