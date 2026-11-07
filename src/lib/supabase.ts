import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Mock Data & Types to support current components ---

export type Applicant = {
  id: string;
  name: string;
  grade: string;
  date: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  dob: string;
  gender?: string;
  email: string;
  phone: string;
  address?: string;
  previousSchool?: string;
  guardianName: string;
  guardianRelation?: string;
  guardianPhone: string;
  guardianEmail?: string;
  guardianOccupation?: string;
  documents: Array<{
    name: string;
    type: string;
    status: 'Verified' | 'Submitted' | 'Missing';
  }>;
};

// Add your mock applicants data here or export from your mock store
export const applicants: Applicant[] = [
  // Example seed object matching your structure if needed, 
  // or populate with your app's actual mock records:
  {
    id: 'APP-2026-001',
    name: 'Amina Mohamed',
    grade: 'Grade 10',
    date: '2026-03-01',
    status: 'Pending',
    dob: '2010-05-12',
    gender: 'Female',
    email: 'amina.m@example.com',
    phone: '+254 712 345 678',
    address: 'Nairobi, Kenya',
    previousSchool: 'Nairobi Primary',
    guardianName: 'Fatuma Mohamed',
    guardianRelation: 'Mother',
    guardianPhone: '+254 733 456 789',
    guardianEmail: 'fatuma.m@example.com',
    guardianOccupation: 'Business Owner',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Verified' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Submitted' },
      { name: 'Immunization Record', type: 'PDF', status: 'Missing' },
    ],
  },
];
