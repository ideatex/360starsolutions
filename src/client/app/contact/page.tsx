"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { 
  Phone, Mail, MapPin, Globe, 
  ArrowRight, Send, CheckCircle2, UserCheck, Building2, MessageSquare
} from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      <PublicHeader />

      <main className="relative z-10 space-y-16 py-12 max-w-6xl mx-auto px-6 w-full">
        {/* Banner Header */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary text-[11px] font-extrabold px-4 py-1.5 rounded-full border border-brand-primary/20 uppercase tracking-wider select-none">
            <Building2 className="w-3.5 h-3.5" /> Corporate Headquarters
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Get in Touch</h1>
          <p className="text-slate-600 text-sm font-medium">Contact 360 Star Solutions & Our Management Team</p>
        </motion.div>

        {/* Contact Info Grid & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Contact Details Card */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Managing Director Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Executive Leadership</span>
                  <h3 className="text-lg font-black text-slate-900">RAGUL SIDDARTH</h3>
                  <p className="text-xs font-extrabold text-slate-500">Managing Director, 360 Star Solutions</p>
                </div>
              </div>
            </div>

            {/* Direct Channels */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Contact Channels</h3>
              
              {/* Phone Numbers */}
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-100 text-brand-primary shrink-0 mt-0.5">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Phone Enquiries</span>
                  <a href="tel:+919164191641" className="text-xs font-bold text-slate-800 hover:text-brand-primary transition-colors block">+91 91641 91641</a>
                  <a href="tel:+919364000360" className="text-xs font-bold text-slate-800 hover:text-brand-primary transition-colors block">+91 93640 00360</a>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-100 text-brand-primary shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Official Email</span>
                  <a href="mailto:360starsolutions@gmail.com" className="text-xs font-bold text-slate-800 hover:text-brand-primary transition-colors block">360starsolutions@gmail.com</a>
                </div>
              </div>

              {/* Office Address */}
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-100 text-brand-primary shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Corporate Office</span>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                    Raheja Towers, 10th Upper Floor, <br />
                    MG Road, Bengaluru - 560001, India
                  </p>
                </div>
              </div>

              {/* Official Links & Socials */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Official Digital Channels</span>
                
                <div className="flex flex-wrap gap-2">
                  <a 
                    href="https://360starsolutions.com/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-primary/10 text-slate-700 hover:text-brand-primary text-xs font-bold transition-all border border-slate-200"
                  >
                    <Globe size={13} /> Website
                  </a>

                  <a 
                    href="https://in.linkedin.com/company/360starsolutions" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-primary/10 text-slate-700 hover:text-brand-primary text-xs font-bold transition-all border border-slate-200"
                  >
                    <LinkedinIcon size={13} /> LinkedIn
                  </a>

                  <a 
                    href="https://www.instagram.com/360starsolution/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-primary/10 text-slate-700 hover:text-brand-primary text-xs font-bold transition-all border border-slate-200"
                  >
                    <InstagramIcon size={13} /> Instagram
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Form Column */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                Send Message
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Connect With Financial Advisors</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Submit your enquiry below and our advisory team will respond promptly.</p>
            </div>

            {submitted ? (
              <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">Message Received!</h3>
                <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                  Thank you for reaching out to 360 Star Solutions. Our team will contact you shortly.
                </p>
                <button 
                  onClick={() => setSubmitted(false)} 
                  className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="Ragul Sharma" 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={form.email} 
                      onChange={e => setForm({...form, email: e.target.value})}
                      placeholder="name@example.com" 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      required 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})}
                      placeholder="+91 98765 43210" 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                    <input 
                      type="text" 
                      required 
                      value={form.subject} 
                      onChange={e => setForm({...form, subject: e.target.value})}
                      placeholder="Financial Planning Consultation" 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Message Details</label>
                  <textarea 
                    rows={4} 
                    required 
                    value={form.message} 
                    onChange={e => setForm({...form, message: e.target.value})}
                    placeholder="Briefly describe your requirements or questions..." 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold rounded-xl transition-all shadow-md shadow-brand-primary/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={14} /> Submit Inquiry
                </button>
              </form>
            )}
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function LinkedinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
}

function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}
