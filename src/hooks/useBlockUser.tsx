import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useBlockUser() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const blockUser = useCallback(async (blockedUserId: string) => {
    if (!user || blockedUserId === user.id) return false;

    setLoading(true);
    try {
      const { error } = await supabase.from('user_blocks').insert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
      });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Användaren är redan blockerad' });
          return true;
        }
        throw error;
      }

      toast({ title: 'Användare blockerad', description: 'Du kommer inte längre se denna användares annonser.' });
      return true;
    } catch (error) {
      toast({ variant: 'destructive', title: 'Kunde inte blockera användare' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const unblockUser = useCallback(async (blockedUserId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;

      toast({ title: 'Användare avblockerad' });
      return true;
    } catch (error) {
      toast({ variant: 'destructive', title: 'Kunde inte avblockera användare' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const isBlocked = useCallback(async (blockedUserId: string): Promise<boolean> => {
    if (!user) return false;

    const { data } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId)
      .single();

    return !!data;
  }, [user]);

  return { blockUser, unblockUser, isBlocked, loading };
}
