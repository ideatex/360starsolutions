"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  MonitorPlay,
  Box,
  CalendarCheck2,
  FileSpreadsheet,
  Send,
  BarChart3,
  BadgePercent,
  Search,
  Zap,
  ShieldCheck,
  TrendingUp,
  Share2,
  Smartphone,
  Headphones,
  Maximize2,
  Layers,
  ChevronRight,
  Check,
  Star,
  Flame,
  Volume2,
  Lightbulb,
  Tv,
  X,
  Phone,
} from "lucide-react";

type DurationKey = "3m" | "6m" | "12m";

interface TierPlan {
  id: string;
  level: string;
  name: string;
  subtitle: string;
  recommended?: boolean;
  accentColor: string;
  badge?: string;
  idealFor: string;
  pricing: Record<
    DurationKey,
    {
      price: string;
      period: string;
      monthlyEquivalent: string;
      savingsBadge?: string;
    }
  >;
  highlights: string[];
}

export default function Home() {
  const [duration, setDuration] = useState<DurationKey>("12m");
  const [selectedTier, setSelectedTier] = useState<TierPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    businessName: "",
    contactPerson: "",
    phone: "",
    city: "",
  });

  const tiers: TierPlan[] = [
    {
      id: "level-1",
      level: "Level 1: The '3'",
      name: "Starter Portfolio",
      subtitle: "For boutique rental operators & freelance AV specialists launching their professional presence.",
      accentColor: "border-slate-300",
      idealFor: "Sound operators, DJ rental kits, small party lighting setups, and single-screen LED suppliers.",
      pricing: {
        "3m": {
          price: "₹1,199",
          period: "for 3 months",
          monthlyEquivalent: "~₹399 / month",
        },
        "6m": {
          price: "₹2,199",
          period: "for 6 months",
          monthlyEquivalent: "~₹366 / month",
          savingsBadge: "Save ~10%",
        },
        "12m": {
          price: "₹3,690",
          period: "for 1 year",
          monthlyEquivalent: "~₹307 / month",
          savingsBadge: "Save ~20%",
        },
      },
      highlights: [
        "Interactive AV Portfolio Builder (Showcase up to 25 setups)",
        "Instant Technical Spec-Sheet PDF Generator",
        "Direct Client Inquiry & RFQ Pipeline",
        "Equipment Inventory Listing (Up to 50 active items)",
        "Mobile-First Field Access for On-Site Techs",
        "Zero Commission Model (Keep 100% of all client bookings)",
        "Standard Email & WhatsApp Platform Support",
      ],
    },
    {
      id: "level-2",
      level: "Level 2: The '6'",
      name: "Professional Studio",
      subtitle: "The industry standard for established sound, lights, and LED screen rental houses across India.",
      recommended: true,
      badge: "Most Popular in India",
      accentColor: "border-brand-primary",
      idealFor: "Full-service stage rental providers, concert audio crews, corporate lighting & wedding visual teams.",
      pricing: {
        "3m": {
          price: "₹4,499",
          period: "for 3 months",
          monthlyEquivalent: "~₹1,499 / month",
        },
        "6m": {
          price: "₹8,199",
          period: "for 6 months",
          monthlyEquivalent: "~₹1,366 / month",
          savingsBadge: "Save ~10%",
        },
        "12m": {
          price: "₹14,369",
          period: "for 1 year",
          monthlyEquivalent: "~₹1,197 / month",
          savingsBadge: "Best Value / Save ~20%",
        },
      },
      highlights: [
        "Everything in Level 1 +",
        "Immersive 3D & Virtual Preview Tools (Lighting throws & speaker coverage)",
        "Real-Time Equipment & Rental Calendar (Prevents double-booking)",
        "Advanced Spec-Sheet Generator with Custom Branding & Power Riders",
        "Visitor Analytics & Insights Dashboard (Track hottest gear & riders)",
        "Flexible Rate Management for Peak Wedding & Festive Surges",
        "Cross-Collaborative B2B Sub-Rental Network Access",
        "Priority 7-Day Technical Customer Success Support",
      ],
    },
    {
      id: "level-3",
      level: "Level 3: The '9'",
      name: "Enterprise Network",
      subtitle: "For multi-city event production agencies, stadium tour rigs, and mega-inventory warehouses.",
      badge: "Maximum Scale",
      accentColor: "border-amber-400",
      idealFor: "Large production houses, stadium concert sound line arrays, nationwide trussing and LED megawalls.",
      pricing: {
        "3m": {
          price: "₹9,999",
          period: "for 3 months",
          monthlyEquivalent: "~₹3,333 / month",
        },
        "6m": {
          price: "₹18,369",
          period: "for 6 months",
          monthlyEquivalent: "~₹3,061 / month",
          savingsBadge: "Save ~10%",
        },
        "12m": {
          price: "₹35,369",
          period: "for 1 year",
          monthlyEquivalent: "~₹2,947 / month",
          savingsBadge: "Best Value / Save ~20%",
        },
      },
      highlights: [
        "Everything in Level 2 +",
        "Multi-Warehouse & Multi-City Inventory Fleet Management",
        "Unlimited High-Fidelity 3D Virtual Previews & CAD Stage Importers",
        "Multi-User RFQ Routing with Multi-Manager Team Access",
        "Custom Domain & White-Label Client Portals (yourcompany.369portfolio.com)",
        "Priority Placement in India AV Directory & Verified Partner Badge",
        "Dedicated VIP Account Executive & 24/7 WhatsApp Tech Concierge",
        "Frictionless Multi-Year Asset History & Scalability Guarantee",
      ],
    },
  ];

  const deliverables = [
    {
      num: "01",
      title: "Interactive AV Portfolio Builder",
      desc: "Showcase stunning, high-resolution visual galleries of your past events, stage designs, architectural lighting layouts, and indoor/outdoor LED wall setups.",
      icon: MonitorPlay,
      badge: "High-Resolution Galleries",
    },
    {
      num: "02",
      title: "Immersive 3D & Virtual Preview Tools",
      desc: "Give prospective clients a clear visual preview of lighting throw patterns, speaker coverage zones, and stage setups before the big day.",
      icon: Box,
      badge: "Spatial Simulation",
    },
    {
      num: "03",
      title: "Real-Time Equipment & Rental Calendar",
      desc: "Keep track of your high-demand assets (moving heads, line arrays, trussing, and displays) with an integrated calendar that prevents double-booking during rush periods.",
      icon: CalendarCheck2,
      badge: "Zero Double-Booking",
    },
    {
      num: "04",
      title: "Instant Technical Spec-Sheet Generator",
      desc: "Automatically generate and share clean, professional PDF technical sheets detailing power requirements, lumens, sound output, and dimensions for technical directors.",
      icon: FileSpreadsheet,
      badge: "1-Click PDF Export",
    },
    {
      num: "05",
      title: "Direct Client Inquiry & RFQ Pipeline",
      desc: "Capture serious event leads through a customized Request For Quote (RFQ) system configured for venue size, crowd capacity, and specific rider details.",
      icon: Send,
      badge: "Verified Event Leads",
    },
    {
      num: "06",
      title: "Visitor Analytics & Insights Dashboard",
      desc: "Gain actionable data on which of your equipment portfolios, project case studies, and configuration catalogs draw the most attention from event planners.",
      icon: BarChart3,
      badge: "Actionable Intelligence",
    },
  ];

  const benefits = [
    {
      num: "1",
      title: "Zero Commission Model",
      desc: "Keep 100% of your earnings, rental fees, and booking revenue secured through platform-generated leads.",
      icon: BadgePercent,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      num: "2",
      title: "Niche Industry Visibility",
      desc: "Stand out directly to event organizers, wedding planners, and corporate houses searching specifically for displays, sound, and lighting solutions.",
      icon: Search,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      num: "3",
      title: "Streamlined Sales Cycles",
      desc: "Cut down endless back-and-forth WhatsApp chats and phone calls by 70% using structured digital portfolios and standardized technical riders.",
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      num: "4",
      title: "Polished Brand Credibility",
      desc: "Move away from messy Google Drive links and scattered PDF brochures with a sleek, high-end, dedicated web presence.",
      icon: ShieldCheck,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    {
      num: "5",
      title: "Flexible Rate Management",
      desc: "Easily adjust and update your rental rates dynamically to match peak wedding seasons, festive months, and corporate financial quarters.",
      icon: TrendingUp,
      color: "text-cyan-500",
      bg: "bg-cyan-50",
    },
    {
      num: "6",
      title: "Cross-Collaborative Networking",
      desc: "Connect seamlessly with other industry peers on the network to sub-rent or partner up for massive multi-city projects.",
      icon: Share2,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      num: "7",
      title: "Mobile-First Field Access",
      desc: "Access your live portfolios, equipment lists, and spec sheets instantly from your smartphone while managing on-site venue setups.",
      icon: Smartphone,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      num: "8",
      title: "Priority Customer Success Support",
      desc: "Receive prompt, dedicated technical assistance to ensure your digital showroom runs smoothly without interruption.",
      icon: Headphones,
      color: "text-teal-500",
      bg: "bg-teal-50",
    },
    {
      num: "9",
      title: "Frictionless Scalability",
      desc: "Upgrade your tier effortlessly as your inventory expands and your project footprint grows, without ever losing your historical portfolio data.",
      icon: Maximize2,
      color: "text-violet-500",
      bg: "bg-violet-50",
    },
  ];

  const handleOpenPlan = (tier: TierPlan) => {
    setSelectedTier(tier);
    setIsModalOpen(true);
    setInquirySuccess(false);
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySuccess(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      <PublicHeader />

      <main className="relative z-10 w-full space-y-24 py-10">
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 pt-4 sm:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-5 max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-primary/15 via-brand-primary/10 to-indigo-500/10 text-brand-primary text-xs font-black px-4 py-2 rounded-full border border-brand-primary/20 uppercase tracking-widest shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Visual DE System — 369portfolio.com</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08]">
              The <span className="text-brand-primary">"369" Advantage</span> for Displays, Sound & Lights
            </h1>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm max-w-3xl mx-auto">
              <p className="text-slate-800 text-sm sm:text-base md:text-lg font-bold leading-relaxed">
                <span className="text-brand-primary font-black">3 Powerful Tiers</span> •{" "}
                <span className="text-indigo-600 font-black">6 Core Business Deliverables</span> •{" "}
                <span className="text-emerald-600 font-black">9 Commercial Growth Benefits</span>
              </p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Built specifically for the Displays, Sound, and Lights industry across India.
              </p>
            </div>

            <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
              Select the duration that fits your business rhythm. Enjoy significant savings when you choose our 6-month or 12-month plans to power your operations through India's peak wedding, festival, and corporate event seasons.
            </p>
          </motion.div>

          {/* Quick Pillar Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2">
            <div className="flex items-center justify-center gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs">
              <Tv className="w-5 h-5 text-brand-primary" />
              <div className="text-left">
                <p className="text-xs font-black text-slate-900">LED Walls & Displays</p>
                <p className="text-[10px] text-slate-500 font-medium">Indoor & Outdoor Rigs</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs">
              <Volume2 className="w-5 h-5 text-indigo-600" />
              <div className="text-left">
                <p className="text-xs font-black text-slate-900">Pro Audio & Acoustics</p>
                <p className="text-[10px] text-slate-500 font-medium">Line Arrays & Stage Sound</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <p className="text-xs font-black text-slate-900">Intelligent Lighting</p>
                <p className="text-[10px] text-slate-500 font-medium">Beams, Truss & Lasers</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <a href="#pricing">
              <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-brand-primary/25 text-xs sm:text-sm uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
                🌟 Choose Your Growth Plan <ArrowRight size={16} />
              </span>
            </a>
            <a href="#deliverables">
              <span className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-black px-8 py-4 rounded-2xl transition-all text-xs sm:text-sm uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
                ⚙️ View 6 Deliverables
              </span>
            </a>
          </div>
        </section>

        {/* PRICING PLANS SECTION */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-700 text-[11px] font-black px-4 py-1.5 rounded-full border border-amber-500/20 uppercase tracking-widest">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> Tiered Membership Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              🌟 Choose Your Growth Plan
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">
              Select the duration that fits your business rhythm. Power your operations through India's peak wedding, festival, and corporate event seasons.
            </p>

            {/* DURATION SELECTOR TABS */}
            <div className="pt-4 flex justify-center">
              <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-300/70 shadow-inner max-w-md w-full">
                <button
                  type="button"
                  onClick={() => setDuration("3m")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                    duration === "3m"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  3-Month Plan
                </button>
                <button
                  type="button"
                  onClick={() => setDuration("6m")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all relative ${
                    duration === "6m"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>6-Month</span>
                  <span className="ml-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                    Save ~10%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDuration("12m")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all relative ${
                    duration === "12m"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>12-Month</span>
                  <span className="ml-1 text-[9px] font-extrabold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-full">
                    Save ~20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 TIERS CARDS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4">
            {tiers.map((tier) => {
              const pricing = tier.pricing[duration];
              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col justify-between rounded-3xl p-7 sm:p-8 transition-all duration-300 ${
                    tier.recommended
                      ? "bg-white border-2 border-brand-primary shadow-xl shadow-brand-primary/10 ring-4 ring-brand-primary/5"
                      : "bg-white border border-slate-200 shadow-sm hover:border-slate-300"
                  }`}
                >
                  {/* Top Badge */}
                  {tier.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" /> {tier.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                        {tier.level}
                      </span>
                      <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                        {tier.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                        {tier.subtitle}
                      </p>
                    </div>

                    {/* Pricing Box */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                          {pricing.price}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          / {pricing.period}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-brand-primary font-black">
                          {pricing.monthlyEquivalent}
                        </span>
                        {pricing.savingsBadge && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            {pricing.savingsBadge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ideal for note */}
                    <div className="text-[11px] text-slate-600 bg-slate-100/70 p-3 rounded-xl border border-slate-200/60 font-medium">
                      <strong>Best For:</strong> {tier.idealFor}
                    </div>

                    {/* Features list */}
                    <div className="space-y-3 pt-2">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                        Included Features & Perks:
                      </p>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {tier.highlights.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                tier.recommended ? "text-brand-primary" : "text-emerald-600"
                              }`}
                            />
                            <span className="font-semibold leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="pt-8 mt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenPlan(tier)}
                      className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        tier.recommended
                          ? "bg-brand-primary hover:bg-brand-primary/95 text-white shadow-md shadow-brand-primary/20"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      <span>Choose {tier.name}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FULL COMPARISON TABLE */}
          <div id="comparison" className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-6 sm:p-8">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                Official Pricing & Duration Schedule
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Transparent rates across all 3 tiers with built-in seasonal savings.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700">
                    <th className="py-3.5 px-4 font-black">Membership Tier</th>
                    <th className="py-3.5 px-4 font-black">3-Month Plan</th>
                    <th className="py-3.5 px-4 font-black">
                      6-Month Plan <span className="text-emerald-700 font-extrabold text-[11px]">(Save ~10%)</span>
                    </th>
                    <th className="py-3.5 px-4 font-black">
                      12-Month Plan <span className="text-brand-primary font-extrabold text-[11px]">(Best Value / Save ~20%)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 font-black text-slate-900">
                      Level 1: The "3"
                      <span className="block text-xs font-semibold text-slate-500">Starter Portfolio</span>
                    </td>
                    <td className="py-4 px-4 font-bold">
                      <span className="text-slate-900 font-black">₹1,199</span> / 3 months
                      <span className="block text-[11px] text-slate-500">(~₹399 / month)</span>
                    </td>
                    <td className="py-4 px-4 font-bold">
                      <span className="text-slate-900 font-black">₹2,199</span> / 6 months
                      <span className="block text-[11px] text-slate-500">(~₹366 / month)</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-brand-primary">
                      <span className="text-brand-primary font-black">₹3,690</span> / year
                      <span className="block text-[11px] text-brand-primary/80">(~₹307 / month)</span>
                    </td>
                  </tr>

                  <tr className="hover:bg-brand-primary/5 bg-brand-primary/[0.02] transition-colors">
                    <td className="py-4 px-4 font-black text-slate-900">
                      Level 2: The "6"
                      <span className="block text-xs font-semibold text-brand-primary">Professional Studio (Recommended)</span>
                    </td>
                    <td className="py-4 px-4 font-bold">
                      <span className="text-slate-900 font-black">₹4,499</span> / 3 months
                      <span className="block text-[11px] text-slate-500">(~₹1,499 / month)</span>
                    </td>
                    <td className="py-4 px-4 font-bold">
                      <span className="text-slate-900 font-black">₹8,199</span> / 6 months
                      <span className="block text-[11px] text-slate-500">(~₹1,366 / month)</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-brand-primary">
                      <span className="text-brand-primary font-black">₹14,369</span> / year
                      <span className="block text-[11px] text-brand-primary/80">(~₹1,197 / month)</span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 font-black text-slate-900">
                      Level 3: The "9"
                      <span className="block text-xs font-semibold text-slate-500">Enterprise Network</span>
                    </td>
                    <td className="py-4 px-4 font-bold">
                      <span className="text-slate-900 font-black">₹9,999</span> / 3 months
                      <span className="block text-[11px] text-slate-500">(~₹3,333 / month)</span>
                    </td>
                    <td className="py-4 px-4 font-bold">
                      <span className="text-slate-900 font-black">₹18,369</span> / 6 months
                      <span className="block text-[11px] text-slate-500">(~₹3,061 / month)</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-brand-primary">
                      <span className="text-brand-primary font-black">₹35,369</span> / year
                      <span className="block text-[11px] text-brand-primary/80">(~₹2,947 / month)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* THE 6 CORE DELIVERABLES SECTION */}
        <section id="deliverables" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-700 text-[11px] font-black px-4 py-1.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Complete Operational Suite
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              ⚙️ The 6 Core Deliverables
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">
              Included with every subscription on 369portfolio.com to streamline your daily operations:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliverables.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.num}
                  className="bg-white border border-slate-200 hover:border-brand-primary/40 p-7 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-4 group"
                >
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20 group-hover:bg-brand-primary group-hover:text-white transition-all">
                      <Icon size={22} />
                    </div>
                    <span className="text-[11px] font-black text-slate-400 group-hover:text-brand-primary transition-colors">
                      {item.num}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-md">
                      {item.badge}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* THE 9 COMMERCIAL GROWTH BENEFITS SECTION */}
        <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-800 text-[11px] font-black px-4 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Commercial Advantages
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              📈 The 9 Commercial Growth Benefits
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">
              Unlock the ultimate competitive edge and scale your enterprise across the Indian market:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.num}
                  className="bg-white border border-slate-200 p-6 sm:p-7 rounded-3xl shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl ${benefit.bg} ${benefit.color} flex items-center justify-center font-bold`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-black text-slate-400">
                      BENEFIT #{benefit.num}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 pt-1">
                    {benefit.num}. {benefit.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {benefit.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CALL TO ACTION BANNER */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 border border-slate-800">
            <div className="absolute -right-16 -bottom-16 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-4 text-center lg:text-left max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3.5 py-1.5 rounded-full border border-amber-400/20">
                Ready to Upgrade Your AV Footprint?
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                Ready to elevate your displays, sound, and lights business?
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
                Join India's dedicated network of professional stage rental houses, lighting designers, and visual production specialists. Zero commission, high-fidelity portfolios, and instant technical riders.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => handleOpenPlan(tiers[1])}
                className="bg-brand-primary hover:bg-brand-primary/95 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-brand-primary/30 text-xs sm:text-sm uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-2"
              >
                Get Started on 369portfolio.com Today <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* PLAN SELECTION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden space-y-6"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>

              {!inquirySuccess ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-md">
                      Get Started on 369portfolio.com
                    </span>
                    <h3 className="text-2xl font-black text-slate-900">
                      Join {selectedTier?.name || "369portfolio"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Selected Tier: <strong>{selectedTier?.level}</strong> (
                      {selectedTier?.pricing[duration].price} {selectedTier?.pricing[duration].period})
                    </p>
                  </div>

                  <form onSubmit={handleSubmitInquiry} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        Business / Company / Rental House Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex Visuals & Sound Works"
                        value={inquiryForm.businessName}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, businessName: e.target.value })}
                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={inquiryForm.contactPerson}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, contactPerson: e.target.value })}
                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          Phone / WhatsApp
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +91 98765 43210"
                          value={inquiryForm.phone}
                          onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                          className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          City / State
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Bengaluru, KA"
                          value={inquiryForm.city}
                          onChange={(e) => setInquiryForm({ ...inquiryForm, city: e.target.value })}
                          className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3.5 px-6 rounded-2xl bg-brand-primary hover:bg-brand-primary/95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Confirm & Start Membership <Check size={16} />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Welcome to 369portfolio.com!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium leading-relaxed">
                    Thank you, <strong>{inquiryForm.contactPerson}</strong>. Our onboarding team has reserved your spot for <strong>{selectedTier?.name}</strong>. We are contacting you via WhatsApp on <strong>{inquiryForm.phone}</strong> to activate your portfolio and technical rider tools.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-wider"
                  >
                    Close Window
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PublicFooter />
    </div>
  );
}
// =========================================================================
// ORIGINAL 360 STAR SOLUTIONS HOME PAGE
// Preserved cleanly in src/client/preserved_360_pages/home.page.tsx
// To restore at any time, copy preserved_360_pages/home.page.tsx back here.
// =========================================================================

