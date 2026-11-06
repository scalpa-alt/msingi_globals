import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, User, Users, FileText,
  CheckCircle2, XCircle, Clock, FileCheck, FileWarning, FileX, GraduationCap,
} from 'lucide-react';
import Badge, { variantForStatus } from '@/components/Badge';
import Modal from '@/components/Modal';
import { applicants, type Applicant } from '@/lib/supabase';

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const docIcon = {
  Verified: FileCheck,
  Submitted: FileText,
  Missing: FileX,
};

const docColor = {
  Verified: 'text-emerald-500',
  Submitted: 'text-sky-500',
  Missing: 'text-rose-500',
};

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function ApplicantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const applicant = applicants.find((a) => a.id === id);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Applicant['status']>(applicant?.status ?? 'Pending');

  if (!applicant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="h-12 w-12 text-slate-300 dark:text-slate-700" />
        <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Applicant not found</p>
        <p className="mt-1 text-sm text-slate-400">The application ID "{id}" doesn't exist.</p>
        <Link to="/admissions" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to Admissions
        </Link>
      </div>
    );
  }

  const verifiedDocs = applicant.documents.filter((d) => d.status === 'Verified').length;

  const statusActions = [
    { label: 'Accept', value: 'Accepted' as const, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10' },
    { label: 'Reject', value: 'Rejected' as const, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'hover:bg-rose-50 dark:hover:bg-rose-500/10' },
    { label: 'Keep Pending', value: 'Pending' as const, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'hover:bg-amber-50 dark:hover:bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/admissions" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Admissions</Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-medium text-slate-900 dark:text-white">{applicant.id}</span>
        </div>
        <button
          onClick={() => navigate('/admissions')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-xl font-bold text-white">
              {initials(applicant.name)}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{applicant.name}</h1>
              <p className="mt-0.5 text-sm text-slate-400">{applicant.grade} · Applied {applicant.date}</p>
              <div className="mt-2"><Badge variant={variantForStatus(currentStatus)} dot>{currentStatus}</Badge></div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
            >
              <FileCheck className="h-4 w-4" /> Update Status
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Personal details */}
        <SectionCard title="Personal Details" icon={User}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <InfoRow icon={Calendar} label="Date of Birth" value={applicant.dob} />
            <InfoRow icon={User} label="Gender" value={applicant.gender || '—'} />
            <InfoRow icon={Mail} label="Email" value={applicant.email} />
            <InfoRow icon={Phone} label="Phone" value={applicant.phone} />
            <InfoRow icon={MapPin} label="Address" value={applicant.address || '—'} />
            <InfoRow icon={GraduationCap} label="Previous School" value={applicant.previousSchool || '—'} />
          </div>
        </SectionCard>

        {/* Guardian info */}
        <SectionCard title="Guardian Information" icon={Users}>
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
              {initials(applicant.guardianName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{applicant.guardianName}</p>
              <p className="text-xs text-slate-400">{applicant.guardianRelation || 'Guardian'}</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <InfoRow icon={Phone} label="Phone" value={applicant.guardianPhone} />
            <InfoRow icon={Mail} label="Email" value={applicant.guardianEmail || '—'} />
            <InfoRow icon={User} label="Occupation" value={applicant.guardianOccupation || '—'} />
          </div>
        </SectionCard>

        {/* Documents */}
        <SectionCard title="Documents" icon={FileText}>
          <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">Verification progress</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">{verifiedDocs}/{applicant.documents.length}</span>
          </div>
          <div className="space-y-2">
            {applicant.documents.map((doc) => {
              const Icon = docIcon[doc.status];
              return (
                <div key={doc.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <Icon className={`h-5 w-5 shrink-0 ${docColor[doc.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{doc.name}</p>
                    <p className="text-xs text-slate-400">{doc.type} · {doc.status}</p>
                  </div>
                  {doc.status === 'Missing' ? (
                    <span className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">Missing</span>
                  ) : doc.status === 'Verified' ? (
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">Verified</span>
                  ) : (
                    <span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">Submitted</span>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Status update modal */}
      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Application Status"
        description={`Change the status for ${applicant.name}'s application.`}
        footer={
          <>
            <button onClick={() => setStatusModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
            <button
              onClick={() => setStatusModalOpen(false)}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Confirm
            </button>
          </>
        }
      >
        <div className="space-y-2">
          {statusActions.map((action) => (
            <button
              key={action.value}
              onClick={() => setCurrentStatus(action.value)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                currentStatus === action.value
                  ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20 dark:bg-teal-500/5'
                  : `border-slate-200 dark:border-slate-700 ${action.bg}`
              }`}
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{action.label}</p>
                <p className="text-xs text-slate-400">Set status to "{action.value}"</p>
              </div>
              {currentStatus === action.value && <CheckCircle2 className="ml-auto h-5 w-5 text-teal-500" />}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
