import AuthHeader from '@/components/AuthHeader';
import SiteFooter from '@/components/SiteFooter';

export default function TermsAndConditionsPage() {
  return (
    <>
      <AuthHeader />
      <main className="min-h-screen bg-[#f8f9ff] px-6 py-28 lg:px-20">
        <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600">NotExA</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Terms & Conditions</h1>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
            By using NotExA, you agree to use the platform responsibly for note-taking, file management, collaboration, and study workflows.
          </p>

          <div className="mt-8 space-y-7 text-sm leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-black text-slate-900">Account Responsibility</h2>
              <p className="mt-2">Keep your login details secure. You are responsible for activity from your account and for ensuring shared notes and files are appropriate to share with collaborators.</p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-900">Content & Files</h2>
              <p className="mt-2">Only upload files and notes you have the right to store or share. Do not use NotExA to distribute harmful, illegal, or unauthorized content.</p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-900">AI Features</h2>
              <p className="mt-2">AI output is generated through admin-configured providers and should be reviewed before use. NotExA is a study assistant, not a replacement for your own judgment or academic requirements.</p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
