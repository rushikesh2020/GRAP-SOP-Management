export type Role = 'Maker' | 'Reviewer' | 'Unassigned';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
