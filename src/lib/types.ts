export type UserRole = "admin" | "regular";

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  color: string;
}

export interface Booking {
  id: string;
  user_id: string;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

export interface BookingWithUser extends Booking {
  user: UserProfile;
}
