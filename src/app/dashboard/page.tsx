'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { KPIStrip } from '@/components/KPI/KPIStrip';
import { JobCard } from '@/components/Jobs/JobCard';
import { PaymentModal } from '@/components/Jobs/PaymentModal';
import { RequestPaymentModal } from '@/components/Jobs/RequestPaymentModal';
import { ReviewLinkModal } from '@/components/Jobs/ReviewLinkModal';
import { getDB } from '@/lib/db';
import { Job, Customer, Pet, JobState } from '@/lib/db/schema';
import { JobStateMachine } from '@/lib/jobs/stateMachine';
import { Plus, Settings as SettingsIcon, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { triggerSMSAction } from '@/lib/sms';
import { InstallPwaPrompt } from '@/components/pwa/InstallPwaPrompt';
import { isStandalone, shouldShowPrompt, markPromptShown, markAsInstalled } from '@/lib/pwa-utils';
import { Header } from '@/components/Navigation/Header';

// Helper to seed data if empty (For verification) -> DISABLED FOR PRODUCTION/SAAS
// async function seedDataIfEmpty() {
//   const db = await getDB();
//   const count = await db.count('customers');
//   if (count === 0) {
//     const customerId = uuidv4();
//     const petId = uuidv4();
//     const jobId = uuidv4();

//     await db.put('customers', {
//       id: customerId,
//       name: 'Alice Johnson',
//       phone: '555-0123',
//       address: '123 Maple St',
//       notes: 'Gate code 1234',
//       createdAt: Date.now(),
//       updatedAt: Date.now()
//     });

//     await db.put('pets', {
//       id: petId,
//       customerId: customerId,
//       name: 'Bella',
//       notes: 'Hates nail trimming',
//       createdAt: Date.now(),
//       updatedAt: Date.now()
//     });

//     await db.put('jobs', {
//       id: jobId,
//       customerId: customerId,
//       petIds: [petId],
//       state: JobState.Scheduled,
//       scheduledDate: format(new Date(), 'yyyy-MM-dd'),
//       scheduledTime: '10:00',
//       address: '123 Maple St',
//       createdAt: Date.now(),
//       updatedAt: Date.now()
//     });
//     console.log('Seeded initial data');
//     return true;
//   }
//   return false;
// }

import { useDataLoader } from '@/hooks/useDataLoader';

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [pets, setPets] = useState<Record<string, Pet>>({});
  const [kpi, setKpi] = useState({
    completed: 0,
    requested: 0,
    confirmed: 0,
    reviews: 0
  });

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [requestPaymentModalOpen, setRequestPaymentModalOpen] = useState(false);
  const [reviewLinkModalOpen, setReviewLinkModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const router = useRouter();
  const { loadJobs, loadCustomers, loadPets, isImpersonating, impersonatedBusinessId } = useDataLoader();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const loadData = async () => {
    try {
      setLoading(true);
      // Load data using impersonation-aware hook
      const allJobs = await loadJobs();
      const allCustomers = await loadCustomers();
      const allPets = await loadPets();

      // Index customers and pets for easy lookup
      const custMap: Record<string, Customer> = {};
      allCustomers.forEach(c => custMap[c.id] = c);
      setCustomers(custMap);

      const petMap: Record<string, Pet> = {};
      allPets.forEach(p => petMap[p.id] = p);
      setPets(petMap);

      // Filter for Today with strict state rules
      const todaysJobs = allJobs.filter(j =>
        (j.scheduledDate === todayStr &&
          [
            JobState.Scheduled,
            JobState.ReminderSent,
            JobState.InProgress,
            JobState.Completed
          ].includes(j.state)) ||
        j.state === JobState.InProgress
      );

      // Chronological Sort: Soonest -> Latest
      todaysJobs.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

      setJobs(todaysJobs);

      // KPI Calc (Last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

      const jobsLast30Days = allJobs.filter(j => j.scheduledDate >= thirtyDaysAgoStr);

      setKpi({
        completed: jobsLast30Days.filter(j => j.state === JobState.Completed || j.state === JobState.PaymentRequested || j.state === JobState.Paid || j.state === JobState.Closed).length,
        requested: jobsLast30Days.filter(j => j.state === JobState.PaymentRequested).length,
        confirmed: jobsLast30Days.filter(j => j.state === JobState.Paid || j.state === JobState.Closed).length,
        reviews: jobsLast30Days.filter(j => j.state === JobState.Closed).length
      });

    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [todayStr, isImpersonating, impersonatedBusinessId]);

  useEffect(() => {
    if (isStandalone()) {
      markAsInstalled();
      return;
    }
    if (!shouldShowPrompt()) return;
    const timer = setTimeout(() => {
      setShowInstallPrompt(true);
      markPromptShown();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAction = async (jobId: string, action: any) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      const customer = job ? customers[job.customerId] : null;

      if (action === 'REQUEST_PAYMENT') {
        setSelectedJobId(jobId);
        setRequestPaymentModalOpen(true);
        return;
      }

      if (action === 'LOG_PAYMENT') {
        setSelectedJobId(jobId);
        setPaymentModalOpen(true);
        return;
      }

      if (job && customer && ['SEND_REMINDER', 'SEND_REVIEW_REQUEST'].includes(action)) {
        const db = await getDB();
        const settings = await db.get('settings', 'default');

        if (action === 'SEND_REVIEW_REQUEST' && !settings?.review_url) {
          setSelectedJobId(jobId);
          setReviewLinkModalOpen(true);
          return;
        }
        triggerSMSAction(job, customer, action, { settings });
      }

      if (!['REQUEST_PAYMENT', 'LOG_PAYMENT', 'SEND_REMINDER', 'SEND_REVIEW_REQUEST'].includes(action)) {
        await JobStateMachine.transition(jobId, action);
        await loadData();
      }

      if (['SEND_REMINDER', 'SEND_REVIEW_REQUEST', 'SKIP_REVIEW'].includes(action)) {
        await JobStateMachine.transition(jobId, action);
        await loadData();
      }
    } catch (e) {
      console.error('Transition failed', e);
      alert('Action failed');
    }
  };

  const handleRequestPayment = async (amount: number) => {
    if (!selectedJobId) return;
    try {
      const job = jobs.find(j => j.id === selectedJobId);
      const customer = job ? customers[job.customerId] : null;
      const db = await getDB();
      const settings = await db.get('settings', 'default');
      await JobStateMachine.transition(selectedJobId, 'REQUEST_PAYMENT');
      if (job && customer) {
        triggerSMSAction(job, customer, 'REQUEST_PAYMENT', { amount, settings });
      }
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const initialPaymentAmount = selectedJob
    ? (selectedJob.services?.reduce((sum, s) => sum + s.price, 0) || 0) * (selectedJob.petIds.length || 1)
    : 0;

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <Header
        title={format(new Date(), 'EEE, MMM d')}
        label="Today"
      />

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <KPIStrip
          completedJobs={kpi.completed}
          paymentsRequested={kpi.requested}
          paymentsConfirmed={kpi.confirmed}
          reviewsSent={kpi.reviews}
        />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginBottom: 'var(--space-6)',
        marginTop: 'var(--space-2)'
      }}>
        <h2 className="text-h2" style={{ marginBottom: 'var(--space-4)', width: '100%' }}>
          {jobs.length === 0
            ? "No Jobs Scheduled Today"
            : (() => {
              const remaining = jobs.filter(j => ![JobState.Completed, JobState.PaymentRequested, JobState.Paid, JobState.Closed].includes(j.state)).length;
              return remaining === 0 ? "All Jobs Completed Today!" : `${remaining} Jobs Remaining Today`;
            })()
          }
        </h2>
        <Link href="/jobs/new" style={{
          color: 'var(--brand-primary)',
          background: 'var(--brand-primary-light)',
          padding: '12px 24px',
          borderRadius: '30px',
          fontSize: 'var(--font-size-base)',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          textDecoration: 'none',
          width: 'fit-content',
          boxShadow: '0 2px 8px rgba(108, 92, 231, 0.2)',
          border: '1px solid rgba(108, 92, 231, 0.1)'
        }}>
          <Plus size={20} /> Add Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <p>No jobs scheduled for today.</p>
        </div>
      ) : (
        <div className="job-list">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              customerName={customers[job.customerId]?.name || 'Unknown Customer'}
              petNames={job.petIds.map(id => pets[id]?.name).filter(Boolean)}
              onAction={(action) => handleAction(job.id, action)}
            />
          ))}
        </div>
      )}

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={async (amount, method) => {
          if (selectedJobId) {
            await JobStateMachine.transition(selectedJobId, 'LOG_PAYMENT', {
              payment_amount: amount,
              payment_method: method as any,
              payment_logged_at: Date.now(),
              payment_source: 'manual'
            });
            setPaymentModalOpen(false);
            setSelectedJobId(null);
            loadData();
          }
        }}
      />

      <RequestPaymentModal
        isOpen={requestPaymentModalOpen}
        onClose={() => setRequestPaymentModalOpen(false)}
        onConfirm={(amount) => handleRequestPayment(amount)}
        initialAmount={initialPaymentAmount}
      />

      <ReviewLinkModal
        isOpen={reviewLinkModalOpen}
        onClose={() => setReviewLinkModalOpen(false)}
        onSave={async (url) => {
          if (selectedJobId) {
            const db = await getDB();
            const settings = await db.get('settings', 'default') || { id: 'default', updatedAt: Date.now() };
            const newSettings = { ...settings, review_url: url, updatedAt: Date.now() };
            await db.put('settings', newSettings);
            const job = jobs.find(j => j.id === selectedJobId);
            const customer = job ? customers[job.customerId] : null;
            if (job && customer) {
              triggerSMSAction(job, customer, 'SEND_REVIEW_REQUEST', { settings: newSettings });
            }
            setReviewLinkModalOpen(false);
            setSelectedJobId(null);
          }
        }}
      />
      <InstallPwaPrompt
        isOpen={showInstallPrompt}
        onClose={() => setShowInstallPrompt(false)}
      />
    </div>
  );
}
