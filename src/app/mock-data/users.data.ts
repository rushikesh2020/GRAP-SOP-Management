import { User } from '../models/user.model';

export const MOCK_USERS: User[] = [
  {
    id: 'EMP001',
    name: 'Anu Jha',
    email: 'anu.jha@axisbank.com',
    role: 'Maker',
  },
  {
    id: 'EMP004',
    name: 'Rahul Mehta',
    email: 'rahul.mehta@axisbank.com',
    role: 'Maker',
  },
  {
    id: 'EMP002',
    name: 'Priya Singh',
    email: 'priya.singh@axisbank.com',
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
    name: 'Neha Kapoor',
    email: 'neha.kapoor@axisbank.com',
    role: 'Maker',
  },
  {
    id: 'EMP003',
    name: 'Demo Employee',
    email: 'employee@example.com',
    role: 'Unassigned',
  },
];
