"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Sparkles, ArrowRight, BookOpen, Compass, Award, TrendingUp, 
  ShieldCheck, CheckCircle2, Shield, Target, Users, Quote, UserCheck,
  Building2, MapPin, Phone, Mail, Globe, Send, ChevronDown, Briefcase,
  LayoutDashboard
} from 'lucide-react';

export default function UserPanelHomePage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  const navSections = [
    { name: 'Overview', href: '#hero' },
    { name: 'Our Story', href: '#story' },
    { name: 'How It Started', href: '#about' },
    { name: "Founder's Journey", href: '#founder' },
    { name: 'Core Pillars', href: '#pillars' },
    { name: 'Solutions', href: '#solutions' },
    { name: 'Contact HQ', href: '#contact' },
  ];

  return (
    <div className="space-y-12 pb-16 font-sans relative overflow-hidden text-slate-900 dark:text-slate-100">
      
      {/* Sticky Inner Section Navigation Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md py-3 px-4 rounded-2xl border border-border-subtle shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {navSections.map((sec) => (
            <a 
              key={sec.name} 
              href={sec.href}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-primary px-3 py-1.5 rounded-xl hover:bg-brand-primary/10 transition-all whitespace-nowrap"
            >
              {sec.name}
            </a>
          ))}
        </div>

        <Link href={shareholder?.role === 'SUPER_ADMIN' || shareholder?.role === 'ADMIN' ? '/admin' : '/dashboard'}>
          <span className="text-xs font-extrabold text-white bg-brand-primary hover:bg-brand-primary/95 px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <LayoutDashboard size={14} /> Open Financial Metrics
          </span>
        </Link>
      </div>

      {/* Hero Section (#hero) */}
      <section id="hero" className="relative text-center py-12 px-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 max-w-4xl mx-auto"
        >
          <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary text-[11px] font-extrabold px-4 py-1.5 rounded-full border border-brand-primary/20 uppercase tracking-wider select-none">
            <Sparkles className="w-3.5 h-3.5" /> Visionary Guidance & Enterprise Wealth Architecting
          </span>
          
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            A Fortune-Maker, Lighting the Way to <br className="hidden sm:inline" />
            <span className="text-brand-primary">Great Futures</span>
          </h1>
          
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            We negate concerns and resolve future financial uncertainties right now. Formulating strategic solutions that ensure financial stability for your family across generations.
          </p>
        </motion.div>

        {/* Founder Quote Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl mx-auto bg-gradient-to-r from-brand-primary/15 via-brand-primary/10 to-brand-primary/5 p-6 sm:p-8 rounded-3xl border border-brand-primary/20 shadow-xs relative overflow-hidden text-center mt-6"
        >
          <Quote className="w-10 h-10 text-brand-primary/20 absolute top-3 left-3 pointer-events-none" />
          <p className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white leading-snug italic relative z-10">
            "There are many financial companies and even more offerings. At the end of the day, the customers should be the ones who get the justice. We make sure of that."
          </p>
          <p className="text-xs font-extrabold uppercase tracking-widest text-brand-primary mt-2">— Ragul Siddarth, Founder of Guru of the Universe</p>
        </motion.div>
      </section>

      {/* Section 1: Our Story - The Genesis (#story) */}
      <section id="story" className="max-w-5xl mx-auto pt-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-card border border-border-subtle p-6 sm:p-10 rounded-3xl shadow-xs space-y-4 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-subtle pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                Our Beginnings
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">Our Story</h2>
              <p className="text-xs text-brand-primary font-bold">The Genesis</p>
            </div>
            <BookOpen className="w-8 h-8 text-brand-primary opacity-80" />
          </div>

          <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              "It all began when a financial planning professional discovered the wondrous, far-reaching possibilities of his service."
            </p>
            <p>
              Recognizing that these opportunities held the power to uplift everyone, the mission became clear: this knowledge had to be shared.
            </p>
            <p className="text-xs text-slate-500 font-medium">
              What started as a single professional insight grew into a dedicated organization committed to structuring wealth creation and securing futures for individuals and families across generations.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Section 2: How It Started (#about) */}
      <section id="about" className="max-w-5xl mx-auto pt-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-card border border-border-subtle p-6 sm:p-10 rounded-3xl shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-subtle pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                Founding History
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">How It Started</h2>
            </div>
            <div className="flex items-center gap-2 bg-secondary px-3.5 py-1.5 rounded-xl border border-border-subtle">
              <Award className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Guru of the Universe</span>
            </div>
          </div>

          <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
            <p>
              <strong>Guru of the Universe</strong> was founded by <strong>Ragul Siddarth</strong> with a simple, profound objective: to connect seekers to exactly what they are looking for—and often, to something even better!
            </p>
            <p>
              Leveraging an exemplary career in finance, our founder masters the complex permutations and combinations of wealth creation. We brighten futures by seamlessly blending investments, strategic planning, and spiritual guidance.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Section 3: Founder’s Journey Biography (#founder) */}
      <section id="founder" className="max-w-5xl mx-auto pt-6 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
            Biography & Leadership
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Founder’s Journey</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">Ragul Siddarth, Managing Director 360 Star Solutions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Phase 1: Origin */}
          <div className="bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-brand-primary" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">01. The Origin</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Born in Krishnagiri and raised dynamically across Tamil Nadu, developing early adaptability. Chennai became the launching ground for his career.
            </p>
          </div>

          {/* Phase 2: Professional Ascent */}
          <div className="bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-4 h-4 text-brand-primary" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">02. Professional Ascent</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Territory Sales Leader at American Express Bank (2005), 6 years at Max New York Life Insurance rising to AVP by 2010 managing 30+ financial managers.
            </p>
          </div>

          {/* Phase 3: Visionary Leap */}
          <div className="bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">03. The Visionary Leap</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Founded Guru of the Universe in 2011 to merge financial strategy with spiritual guidance. Empowered over 36,000 clients with a 50+ member team.
            </p>
          </div>

          {/* Phase 4: Global Impact */}
          <div className="bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-brand-primary" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">04. Global Impact & Expertise</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Featured in India Today; MDRT and Court of the Table invites (US & Canada); dual Advance NLP Practitioner, Certified Life Coach, and Level 3 Kriya Yoga practitioner.
            </p>
          </div>

        </div>

        {/* Ultimate Mission Banner */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center gap-2 text-brand-primary font-bold text-xs">
            <ShieldCheck className="w-4 h-4" /> The Ultimate Mission
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Helping individuals discover a life of true abundance by aligning powerful goal-setting with tax-favored financial security, bridging material wealth and spiritual self-realization.
          </p>
        </div>
      </section>

      {/* Section 4: Our Core Pillars (#pillars) */}
      <section id="pillars" className="max-w-5xl mx-auto pt-6 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
            Foundation of Trust
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Our Core Pillars</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-3">
            <TagIcon className="w-6 h-6 text-brand-primary" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Best Price Guaranteed</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Custom-tailored solutions backed by a commitment to optimal value.
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-3">
            <TrendingUp className="w-6 h-6 text-brand-primary" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Finance Analysis</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Meticulously analyzing unique needs and wants to architect the perfect plan.
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-3">
            <Users className="w-6 h-6 text-brand-primary" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Professional Team</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Supported by an elite group of expert financial planners and managers.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Our Solutions (#solutions) */}
      <section id="solutions" className="max-w-5xl mx-auto pt-6">
        <div className="bg-slate-900 text-white p-6 sm:p-10 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/20 px-3 py-1 rounded-full border border-brand-primary/30">
              Strategic Impact
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Our Solutions</h2>
            <p className="text-slate-300 text-xs font-medium">A Fortune-Maker, Lighting the Way to Great Futures</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-brand-primary font-bold text-xs">
                <Shield size={16} /> Generational Financial Stability
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Ensure financial stability for your family across generations with strategic asset structuring and growth plans.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-brand-primary font-bold text-xs">
                <Target size={16} /> Future Liabilities Control
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Control future liabilities with a few smart, proactive moves in the present right now.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Contact Us (#contact) */}
      <section id="contact" className="max-w-5xl mx-auto pt-6 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
            Corporate HQ
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Contact Us</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Executive Info Card */}
          <div className="md:col-span-5 bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
              <UserCheck className="w-5 h-5 text-brand-primary" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">RAGUL SIDDARTH</h3>
                <p className="text-[10px] font-extrabold text-slate-500">Managing Director, 360 Star Solutions</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-brand-primary shrink-0 mt-0.5" />
                <span>Raheja Towers, 10th Upper Floor, MG Road, Bengaluru - 560001</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-brand-primary shrink-0" />
                <span>+91 91641 91641 / +91 93640 00360</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-brand-primary shrink-0" />
                <span>360starsolutions@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="md:col-span-7 bg-card p-6 rounded-2xl border border-border-subtle shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Send Inquiry Message</h3>
            
            {contactSubmitted ? (
              <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">Message Received!</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full Name" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border-subtle text-xs font-semibold" />
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email Address" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border-subtle text-xs font-semibold" />
                </div>
                <input type="text" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone Number" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border-subtle text-xs font-semibold" />
                <textarea rows={3} required value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Your requirements..." className="w-full px-3 py-2 rounded-xl bg-secondary border border-border-subtle text-xs font-semibold" />
                <button type="submit" className="w-full py-2.5 bg-brand-primary text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                  <Send size={13} /> Submit
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

    </div>
  );
}

function TagIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}
