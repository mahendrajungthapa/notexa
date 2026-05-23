'use client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Users, Zap, Shield, Heart } from 'lucide-react';

const team = [
  { name: 'Your Name', role: 'Developer & Designer', initial: 'Y' },
  { name: 'Team Member', role: 'Backend Developer', initial: 'T' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="py-16 lg:py-24 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-3">About Us</p>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6">Built for better<br />collaboration.</h1>
            <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
              Notexa is a collaborative note-taking platform created as a college minor project. We believe taking notes should be simple, beautiful, and collaborative. Our platform lets you create rich notes, share them with friends using @usernames or share codes, and even get AI-powered summaries of your content.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">What We Believe In</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Heart, title: 'Simplicity', desc: 'No clutter, no confusion. Just notes.', color: 'bg-rose-50 text-rose-600' },
                { icon: Users, title: 'Collaboration', desc: 'Built from the ground up for teams.', color: 'bg-indigo-50 text-indigo-600' },
                { icon: Shield, title: 'Privacy', desc: 'Your notes, your data, your control.', color: 'bg-emerald-50 text-emerald-600' },
                { icon: Zap, title: 'Speed', desc: 'Fast everywhere — on any device.', color: 'bg-amber-50 text-amber-600' },
              ].map((v, i) => (
                <div key={i} className="text-center p-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${v.color}`}>
                    <v.icon size={24} />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-500">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-10">Our Team</h2>
            <div className="flex flex-wrap justify-center gap-8">
              {team.map((m, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold mb-3">
                    {m.initial}
                  </div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-sm text-gray-500">{m.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-6">Tech Stack</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {['Laravel 12','Next.js 14','MySQL','Tailwind CSS','Cloudflare R2','API Nepal','Pusher','DeepSeek AI','TypeScript','TipTap Editor'].map((t,i)=>(
                <span key={i} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700">{t}</span>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
