export type Period = 'day' | 'week' | 'month';
export interface HomeMessage {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'security' | 'device' | 'system';
  read: boolean;
}
export interface Automation {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  icon: 'temperature' | 'time' | 'door';
}
export interface Member {
  id: string;
  name: string;
  role: '管理员' | '家庭成员' | '访客';
  color: string;
  rooms: string;
}
export interface Camera {
  id: string;
  name: string;
  room: string;
  online: boolean;
  privacy: boolean;
}
export interface Household {
  homeId: string;
  members: Member[];
  automations: Automation[];
  messages: HomeMessage[];
  cameras: Camera[];
  armed: boolean;
  notificationPreferences: { device: boolean; security: boolean; system: boolean };
}
