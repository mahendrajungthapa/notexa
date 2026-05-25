import AuthHeader from '@/components/AuthHeader';
import SiteFooter from '@/components/SiteFooter';

export default function PrivacyPolicyPage() {
  return (
    <>
      <AuthHeader />
      <main className="min-h-screen bg-[#f8f9ff] px-6 py-28 lg:px-20">
        <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600">NotExA</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
            NotExA stores the account, notes, files, collaboration, and friend data needed to run the study workspace. We use this data to authenticate users, sync notes, manage sharing permissions, send verification or password reset emails, and operate admin-managed AI features.
          </p>

          <div className="mt-8 space-y-7 text-sm leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-black text-slate-900">Data We Collect</h2>
              <p className="mt-2">We collect profile details, login credentials, notes, uploaded files, friend relationships, sharing activity, and app settings. Email verification and reset codes are stored only as hashes with expiry times.</p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-900">How Data Is Used</h2>
              <p className="mt-2">Your data is used to provide the NotExA app experience, including note editing, file preview, sharing, real-time collaboration, SMTP emails, and AI requests through server-side admin API keys.</p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-900">Your Control</h2>
              <p className="mt-2">You control what you create and share. Admins can manage platform settings and user status. You can delete notes and files from your workspace subject to app retention and backup practices.</p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
