import { User } from '../models/user.model';

export const MOCK_USERS: User[] = [
  {
    id: 'EMP001',
    name: 'Rushikesh Khardekar',
    email: 'rushikesh.khardekar@axisbank.com',
    role: 'Maker',
  },
  {
    id: 'EMP004',
    name: 'Shiva Batra',
    email: 'shiva.batra@axisbank.com',
    role: 'Maker',
  },
  {
    id: 'EMP002',
    name: 'Priya Patil',
    email: 'priya.patil@axisbank.com',
    role: 'Reviewer',
  },
  {
    id: 'EMP005',
    name: 'Kavita Rao',
    email: 'kavita.rao@axisbank.com',
    role: 'Reviewer',
  },
  {
    id: 'EMP006',
    name: 'Neha Joshi',
    email: 'neha.joshi@axisbank.com',
    role: 'Maker',
  },
  {
    id: 'EMP003',
    name: 'Demo Employee',
    email: 'employee@example.com',
    role: 'Unassigned',
  },
];
