export const academicStats = {
  totalStudents: 1248,
  totalStaff: 86,
  attendanceToday: 92.4,
  feeCollection: 78.5,
  pendingAdmissions: 24,
  activeClasses: 32,
};

export const attendanceTrend = [
  { day: 'Mon', present: 1180, absent: 68 },
  { day: 'Tue', present: 1205, absent: 43 },
  { day: 'Wed', present: 1192, absent: 56 },
  { day: 'Thu', present: 1218, absent: 30 },
  { day: 'Fri', present: 1156, absent: 92 },
  { day: 'Sat', present: 980, absent: 268 },
];

export const enrollmentByGrade = [
  { grade: 'Grade 6', students: 210 },
  { grade: 'Grade 7', students: 198 },
  { grade: 'Grade 8', students: 220 },
  { grade: 'Grade 9', students: 205 },
  { grade: 'Grade 10', students: 188 },
  { grade: 'Grade 11', students: 132 },
  { grade: 'Grade 12', students: 95 },
];

export const feeStatus = [
  { name: 'Paid', value: 78.5, color: '#0d9488' },
  { name: 'Pending', value: 15.2, color: '#f59e0b' },
  { name: 'Overdue', value: 6.3, color: '#ef4444' },
];

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  date: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  dob: string;
  gender: string;
  address: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianOccupation: string;
  previousSchool: string;
  documents: { name: string; type: string; status: 'Submitted' | 'Missing' | 'Verified' }[];
}

export const applicants: Applicant[] = [
  {
    id: 'ADM-2401', name: 'Aisha Rahman', email: 'aisha.r@email.com', phone: '+1 555-0142',
    grade: 'Grade 9', date: '2026-11-04', status: 'Accepted', dob: '2011-03-15', gender: 'Female',
    address: '142 Maple Avenue, Springfield', guardianName: 'Karim Rahman', guardianRelation: 'Father',
    guardianPhone: '+1 555-0140', guardianEmail: 'k.rahman@email.com', guardianOccupation: 'Engineer',
    previousSchool: 'Greenwood Middle School',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Verified' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Verified' },
      { name: 'Passport Photo', type: 'JPG', status: 'Submitted' },
      { name: 'Immunization Record', type: 'PDF', status: 'Verified' },
    ],
  },
  {
    id: 'ADM-2402', name: 'Liam Carter', email: 'liam.c@email.com', phone: '+1 555-0188',
    grade: 'Grade 7', date: '2026-11-03', status: 'Pending', dob: '2013-07-22', gender: 'Male',
    address: '88 Oak Street, Riverton', guardianName: 'Sarah Carter', guardianRelation: 'Mother',
    guardianPhone: '+1 555-0186', guardianEmail: 's.carter@email.com', guardianOccupation: 'Teacher',
    previousSchool: 'Riverton Elementary',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Submitted' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Submitted' },
      { name: 'Passport Photo', type: 'JPG', status: 'Missing' },
      { name: 'Immunization Record', type: 'PDF', status: 'Missing' },
    ],
  },
  {
    id: 'ADM-2403', name: 'Sofia Nguyen', email: 'sofia.n@email.com', phone: '+1 555-0210',
    grade: 'Grade 10', date: '2026-11-03', status: 'Accepted', dob: '2010-11-09', gender: 'Female',
    address: '305 Cedar Lane, Lakeside', guardianName: 'Minh Nguyen', guardianRelation: 'Father',
    guardianPhone: '+1 555-0208', guardianEmail: 'm.nguyen@email.com', guardianOccupation: 'Pharmacist',
    previousSchool: 'Lakeside Junior High',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Verified' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Verified' },
      { name: 'Passport Photo', type: 'JPG', status: 'Verified' },
      { name: 'Immunization Record', type: 'PDF', status: 'Verified' },
    ],
  },
  {
    id: 'ADM-2404', name: 'Ethan Brooks', email: 'ethan.b@email.com', phone: '+1 555-0333',
    grade: 'Grade 6', date: '2026-11-02', status: 'Pending', dob: '2014-01-18', gender: 'Male',
    address: '19 Birch Court, Hill Valley', guardianName: 'James Brooks', guardianRelation: 'Father',
    guardianPhone: '+1 555-0331', guardianEmail: 'j.brooks@email.com', guardianOccupation: 'Architect',
    previousSchool: 'Hill Valley Primary',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Submitted' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Missing' },
      { name: 'Passport Photo', type: 'JPG', status: 'Submitted' },
      { name: 'Immunization Record', type: 'PDF', status: 'Submitted' },
    ],
  },
  {
    id: 'ADM-2405', name: 'Maya Patel', email: 'maya.p@email.com', phone: '+1 555-0444',
    grade: 'Grade 11', date: '2026-11-01', status: 'Pending', dob: '2009-09-04', gender: 'Female',
    address: '420 Elm Drive, Westwood', guardianName: 'Priya Patel', guardianRelation: 'Mother',
    guardianPhone: '+1 555-0442', guardianEmail: 'p.patel@email.com', guardianOccupation: 'Doctor',
    previousSchool: 'Westwood High',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Verified' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Submitted' },
      { name: 'Passport Photo', type: 'JPG', status: 'Verified' },
      { name: 'Immunization Record', type: 'PDF', status: 'Missing' },
    ],
  },
  {
    id: 'ADM-2406', name: 'Noah Williams', email: 'noah.w@email.com', phone: '+1 555-0555',
    grade: 'Grade 8', date: '2026-10-30', status: 'Accepted', dob: '2012-05-27', gender: 'Male',
    address: '67 Pine Road, Eastbrook', guardianName: 'Emma Williams', guardianRelation: 'Mother',
    guardianPhone: '+1 555-0553', guardianEmail: 'e.williams@email.com', guardianOccupation: 'Lawyer',
    previousSchool: 'Eastbrook Middle School',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Verified' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Verified' },
      { name: 'Passport Photo', type: 'JPG', status: 'Verified' },
      { name: 'Immunization Record', type: 'PDF', status: 'Verified' },
    ],
  },
  {
    id: 'ADM-2407', name: 'Olivia Hayes', email: 'olivia.h@email.com', phone: '+1 555-0666',
    grade: 'Grade 12', date: '2026-10-28', status: 'Rejected', dob: '2008-12-11', gender: 'Female',
    address: '14 Spruce Way, Northgate', guardianName: 'Robert Hayes', guardianRelation: 'Father',
    guardianPhone: '+1 555-0664', guardianEmail: 'r.hayes@email.com', guardianOccupation: 'Accountant',
    previousSchool: 'Northgate Academy',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Submitted' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Submitted' },
      { name: 'Passport Photo', type: 'JPG', status: 'Missing' },
      { name: 'Immunization Record', type: 'PDF', status: 'Missing' },
    ],
  },
  {
    id: 'ADM-2408', name: 'James Okoro', email: 'james.o@email.com', phone: '+1 555-0777',
    grade: 'Grade 9', date: '2026-10-27', status: 'Pending', dob: '2011-02-08', gender: 'Male',
    address: '93 Willow Lane, Southfield', guardianName: 'Grace Okoro', guardianRelation: 'Mother',
    guardianPhone: '+1 555-0775', guardianEmail: 'g.okoro@email.com', guardianOccupation: 'Nurse',
    previousSchool: 'Southfield Middle School',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Submitted' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Submitted' },
      { name: 'Passport Photo', type: 'JPG', status: 'Submitted' },
      { name: 'Immunization Record', type: 'PDF', status: 'Missing' },
    ],
  },
  {
    id: 'ADM-2409', name: 'Chloe Bennett', email: 'chloe.b@email.com', phone: '+1 555-0888',
    grade: 'Grade 10', date: '2026-10-25', status: 'Accepted', dob: '2010-06-19', gender: 'Female',
    address: '178 Aspen Circle, Fairview', guardianName: 'David Bennett', guardianRelation: 'Father',
    guardianPhone: '+1 555-0886', guardianEmail: 'd.bennett@email.com', guardianOccupation: 'Business Owner',
    previousSchool: 'Fairview Junior High',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Verified' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Verified' },
      { name: 'Passport Photo', type: 'JPG', status: 'Verified' },
      { name: 'Immunization Record', type: 'PDF', status: 'Verified' },
    ],
  },
  {
    id: 'ADM-2410', name: 'Daniel Foster', email: 'daniel.f@email.com', phone: '+1 555-0999',
    grade: 'Grade 7', date: '2026-10-24', status: 'Rejected', dob: '2013-08-30', gender: 'Male',
    address: '256 Poplar Street, Clearwater', guardianName: 'Linda Foster', guardianRelation: 'Mother',
    guardianPhone: '+1 555-0997', guardianEmail: 'l.foster@email.com', guardianOccupation: 'Journalist',
    previousSchool: 'Clearwater Elementary',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Missing' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Submitted' },
      { name: 'Passport Photo', type: 'JPG', status: 'Missing' },
      { name: 'Immunization Record', type: 'PDF', status: 'Submitted' },
    ],
  },
  {
    id: 'ADM-2411', name: 'Isabella Cruz', email: 'isabella.c@email.com', phone: '+1 555-1010',
    grade: 'Grade 8', date: '2026-10-22', status: 'Pending', dob: '2012-04-14', gender: 'Female',
    address: '34 Magnolia Blvd, Westbrook', guardianName: 'Carlos Cruz', guardianRelation: 'Father',
    guardianPhone: '+1 555-1008', guardianEmail: 'c.cruz@email.com', guardianOccupation: 'Chef',
    previousSchool: 'Westbrook Middle',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Submitted' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Submitted' },
      { name: 'Passport Photo', type: 'JPG', status: 'Submitted' },
      { name: 'Immunization Record', type: 'PDF', status: 'Submitted' },
    ],
  },
  {
    id: 'ADM-2412', name: 'Lucas Morgan', email: 'lucas.m@email.com', phone: '+1 555-1111',
    grade: 'Grade 11', date: '2026-10-21', status: 'Accepted', dob: '2009-10-03', gender: 'Male',
    address: '412 Juniper Way, Pleasant Hill', guardianName: 'Amy Morgan', guardianRelation: 'Mother',
    guardianPhone: '+1 555-1109', guardianEmail: 'a.morgan@email.com', guardianOccupation: 'Designer',
    previousSchool: 'Pleasant Hill High',
    documents: [
      { name: 'Birth Certificate', type: 'PDF', status: 'Verified' },
      { name: 'Previous Report Card', type: 'PDF', status: 'Verified' },
      { name: 'Passport Photo', type: 'JPG', status: 'Verified' },
      { name: 'Immunization Record', type: 'PDF', status: 'Verified' },
    ],
  },
];

export const timetable = [
  { time: '08:00 – 08:50', monday: 'Math', tuesday: 'English', wednesday: 'Physics', thursday: 'Chemistry', friday: 'Biology' },
  { time: '08:55 – 09:45', monday: 'English', tuesday: 'Math', wednesday: 'Chemistry', thursday: 'Physics', friday: 'History' },
  { time: '09:50 – 10:40', monday: 'History', tuesday: 'Biology', wednesday: 'Math', thursday: 'English', friday: 'Geography' },
  { time: '11:00 – 11:50', monday: 'Physics', tuesday: 'Chemistry', wednesday: 'English', thursday: 'Math', friday: 'Art' },
  { time: '11:55 – 12:45', monday: 'Biology', tuesday: 'Geography', wednesday: 'History', thursday: 'P.E.', friday: 'Math' },
  { time: '13:30 – 14:20', monday: 'Art', tuesday: 'P.E.', wednesday: 'Geography', thursday: 'Biology', friday: 'Physics' },
  { time: '14:25 – 15:15', monday: 'Geography', tuesday: 'History', wednesday: 'P.E.', thursday: 'Art', friday: 'Chemistry' },
];

export const attendanceRecords = [
  { student: 'Aisha Rahman', grade: '9-A', present: 42, absent: 3, late: 2, rate: 89.4 },
  { student: 'Liam Carter', grade: '7-B', present: 38, absent: 6, late: 1, rate: 84.4 },
  { student: 'Sofia Nguyen', grade: '10-A', present: 45, absent: 1, late: 0, rate: 97.8 },
  { student: 'Ethan Brooks', grade: '6-C', present: 40, absent: 4, late: 3, rate: 85.1 },
  { student: 'Maya Patel', grade: '11-A', present: 43, absent: 2, late: 1, rate: 93.5 },
  { student: 'Noah Williams', grade: '8-B', present: 37, absent: 5, late: 2, rate: 84.1 },
  { student: 'Olivia Hayes', grade: '12-A', present: 44, absent: 2, late: 0, rate: 95.7 },
  { student: 'James Okoro', grade: '9-B', present: 39, absent: 5, late: 1, rate: 86.7 },
];

export const gradebook = [
  { student: 'Aisha Rahman', math: 88, english: 92, science: 85, history: 79, average: 86.0 },
  { student: 'Liam Carter', math: 74, english: 81, science: 78, history: 83, average: 79.0 },
  { student: 'Sofia Nguyen', math: 95, english: 89, science: 91, history: 87, average: 90.5 },
  { student: 'Ethan Brooks', math: 67, english: 72, science: 70, history: 75, average: 71.0 },
  { student: 'Maya Patel', math: 91, english: 94, science: 88, history: 90, average: 90.75 },
  { student: 'Noah Williams', math: 78, english: 76, science: 82, history: 71, average: 76.75 },
];

export const exams = [
  { name: 'Midterm — Mathematics', grade: 'Grade 10', date: '2026-11-12', room: 'Hall A', status: 'Upcoming' },
  { name: 'Midterm — English', grade: 'Grade 10', date: '2026-11-14', room: 'Hall A', status: 'Upcoming' },
  { name: 'Quiz — Physics', grade: 'Grade 9', date: '2026-11-08', room: 'Room 204', status: 'Upcoming' },
  { name: 'Final — Biology', grade: 'Grade 12', date: '2026-10-28', room: 'Hall B', status: 'Completed' },
  { name: 'Final — History', grade: 'Grade 11', date: '2026-10-30', room: 'Hall B', status: 'Completed' },
];

export const feeRecords = [
  { id: 'FEE-1024', student: 'Aisha Rahman', grade: '9-A', amount: 4200, status: 'Paid', due: '2026-10-05' },
  { id: 'FEE-1025', student: 'Liam Carter', grade: '7-B', amount: 3800, status: 'Pending', due: '2026-11-10' },
  { id: 'FEE-1026', student: 'Sofia Nguyen', grade: '10-A', amount: 4500, status: 'Paid', due: '2026-10-05' },
  { id: 'FEE-1027', student: 'Ethan Brooks', grade: '6-C', amount: 3500, status: 'Overdue', due: '2026-09-20' },
  { id: 'FEE-1028', student: 'Maya Patel', grade: '11-A', amount: 4800, status: 'Pending', due: '2026-11-15' },
  { id: 'FEE-1029', student: 'Noah Williams', grade: '8-B', amount: 4000, status: 'Paid', due: '2026-10-05' },
];

export const books = [
  { id: 'BK-001', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Fiction', available: 6, total: 10 },
  { id: 'BK-002', title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', available: 0, total: 4 },
  { id: 'BK-003', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction', available: 3, total: 8 },
  { id: 'BK-004', title: 'Calculus', author: 'James Stewart', category: 'Mathematics', available: 2, total: 6 },
  { id: 'BK-005', title: 'Chemistry: The Central Science', author: 'Brown, LeMay', category: 'Science', available: 5, total: 7 },
  { id: 'BK-006', title: '1984', author: 'George Orwell', category: 'Fiction', available: 4, total: 9 },
];

export const messages = [
  { id: 1, from: 'Ms. Thompson', subject: 'Parent-teacher meeting schedule', preview: 'The meeting will be held next Friday from 4 PM...', time: '10:24 AM', unread: true },
  { id: 2, from: 'Accounts Office', subject: 'Fee reminder — November', preview: 'This is a reminder that November fees are due...', time: 'Yesterday', unread: true },
  { id: 3, from: 'Mr. Davis', subject: 'Science project extension', preview: 'The deadline for the science project has been...', time: 'Yesterday', unread: false },
  { id: 4, from: 'Principal Office', subject: 'Holiday notice', preview: 'The school will remain closed on Nov 18 for...', time: 'Mon', unread: false },
  { id: 5, from: 'Library', subject: 'Overdue book', preview: 'Please return "A Brief History of Time" as...', time: 'Sun', unread: false },
];

export const notifications = [
  { id: 1, title: 'New admission application', detail: 'Liam Carter applied for Grade 7', time: '5 min ago', type: 'admission' },
  { id: 2, title: 'Fee payment received', detail: 'Aisha Rahman paid $4,200', time: '1 hr ago', type: 'fee' },
  { id: 3, title: 'Attendance alert', detail: 'Grade 8-B below 80% this week', time: '3 hrs ago', type: 'attendance' },
  { id: 4, title: 'Exam scheduled', detail: 'Physics quiz for Grade 9 on Nov 8', time: 'Yesterday', type: 'exam' },
];

// ---- Administrator dashboard ----

export const enrollmentTrend = [
  { month: 'Jun', students: 1180 },
  { month: 'Jul', students: 1205 },
  { month: 'Aug', students: 1198 },
  { month: 'Sep', students: 1222 },
  { month: 'Oct', students: 1238 },
  { month: 'Nov', students: 1248 },
];

export const feesCollectedByMonth = [
  { month: 'Jun', amount: 380000 },
  { month: 'Jul', amount: 420000 },
  { month: 'Aug', amount: 460000 },
  { month: 'Sep', amount: 410000 },
  { month: 'Oct', amount: 490000 },
  { month: 'Nov', amount: 520000 },
];

export const activityFeed = [
  { id: 1, who: 'Ms. Thompson', action: 'submitted midterm grades for Grade 10-A', time: '2 min ago', type: 'grade' },
  { id: 2, who: 'Accounts Office', action: 'recorded a $4,200 fee payment from Aisha Rahman', time: '18 min ago', type: 'fee' },
  { id: 3, who: 'System', action: 'flagged Grade 8-B attendance below 80% this week', time: '1 hr ago', type: 'attendance' },
  { id: 4, who: 'Mr. Davis', action: 'scheduled a Physics quiz for Grade 9 on Nov 8', time: '2 hrs ago', type: 'exam' },
  { id: 5, who: 'Admissions', action: 'approved application ADM-2403 — Sofia Nguyen, Grade 10', time: '5 hrs ago', type: 'admission' },
  { id: 6, who: 'Library', action: 'added 12 new titles to the catalogue', time: 'Yesterday', type: 'library' },
];

// ---- Teacher dashboard ----

export const teacherClasses = [
  { id: 1, period: 'Period 1', time: '08:00 – 08:50', subject: 'Mathematics', grade: 'Grade 10-A', room: 'Room 201', students: 32, status: 'done' },
  { id: 2, period: 'Period 2', time: '08:55 – 09:45', subject: 'Mathematics', grade: 'Grade 9-B', room: 'Room 204', students: 28, status: 'now' },
  { id: 3, period: 'Period 3', time: '09:50 – 10:40', subject: 'Mathematics', grade: 'Grade 11-A', room: 'Room 210', students: 24, status: 'upcoming' },
  { id: 4, period: 'Period 4', time: '11:00 – 11:50', subject: 'Algebra', grade: 'Grade 10-B', room: 'Room 202', students: 30, status: 'upcoming' },
  { id: 5, period: 'Period 5', time: '11:55 – 12:45', subject: 'Statistics', grade: 'Grade 12-A', room: 'Room 215', students: 22, status: 'upcoming' },
];

export const pendingMarking = [
  { id: 1, assessment: 'Midterm — Mathematics', grade: 'Grade 10-A', submitted: 'Nov 1', ungraded: 32 },
  { id: 2, assessment: 'Chapter 5 Quiz', grade: 'Grade 9-B', submitted: 'Nov 3', ungraded: 28 },
  { id: 3, assessment: 'Statistics Assignment', grade: 'Grade 12-A', submitted: 'Oct 29', ungraded: 22 },
];

export const announcements = [
  { id: 1, title: 'Staff meeting moved to Thursday', detail: 'The weekly staff meeting has been rescheduled to Thursday at 3:30 PM in the conference room.', time: '1 hr ago', by: 'Principal Office' },
  { id: 2, title: 'Midterm grade submission deadline', detail: 'All midterm grades must be submitted by Friday, November 14. Please plan accordingly.', time: 'Yesterday', by: 'Academic Office' },
  { id: 3, title: 'New smartboard installed in Room 204', detail: 'Room 204 now has an interactive smartboard. Training materials are in the staff portal.', time: '2 days ago', by: 'IT Department' },
];

// ---- Student/Parent dashboard ----

export const children = [
  { id: 'c1', name: 'Aisha Rahman', grade: 'Grade 9-A', avatar: 'AR' },
  { id: 'c2', name: 'Zayan Rahman', grade: 'Grade 6-B', avatar: 'ZR' },
];

export const studentSummary = {
  c1: {
    attendance: 89.4,
    gpa: 86.0,
    feeBalance: 0,
    upcomingExams: [
      { name: 'Quiz — Physics', date: '2026-11-08', subject: 'Physics' },
      { name: 'Midterm — Mathematics', date: '2026-11-12', subject: 'Mathematics' },
      { name: 'Midterm — English', date: '2026-11-14', subject: 'English' },
    ],
    latestMarks: [
      { subject: 'Mathematics', score: 88, grade: 'A' },
      { subject: 'English', score: 92, grade: 'A' },
      { subject: 'Science', score: 85, grade: 'A' },
      { subject: 'History', score: 79, grade: 'B' },
    ],
    notices: [
      { id: 1, title: 'Parent-teacher meeting', detail: 'Friday, November 14 from 4:00 PM in the main hall.', time: 'Today', urgent: false },
      { id: 2, title: 'Library book overdue', detail: 'Please return "A Brief History of Time" by November 10.', time: 'Yesterday', urgent: true },
      { id: 3, title: 'Science project deadline extended', detail: 'The new submission date is November 18.', time: '2 days ago', urgent: false },
    ],
  },
  c2: {
    attendance: 94.2,
    gpa: 91.5,
    feeBalance: 1200,
    upcomingExams: [
      { name: 'Spelling Test', date: '2026-11-10', subject: 'English' },
      { name: 'Fractions Quiz', date: '2026-11-13', subject: 'Mathematics' },
    ],
    latestMarks: [
      { subject: 'Mathematics', score: 94, grade: 'A' },
      { subject: 'English', score: 89, grade: 'A' },
      { subject: 'Science', score: 91, grade: 'A' },
      { subject: 'Social Studies', score: 88, grade: 'A' },
    ],
    notices: [
      { id: 1, title: 'Field trip permission slip', detail: 'Please sign and return the slip for the Nov 20 museum trip.', time: 'Today', urgent: true },
      { id: 2, title: 'Parent-teacher meeting', detail: 'Friday, November 14 from 4:00 PM in the main hall.', time: 'Today', urgent: false },
    ],
  },
};
