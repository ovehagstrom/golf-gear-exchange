// Public profile type (excludes sensitive fields like email/phone)
export type PublicProfile = {
  id: string;
  full_name: string | null;
  city: string | null;
  seller_type: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  completed_deals: number | null;
  created_at: string | null;
};
