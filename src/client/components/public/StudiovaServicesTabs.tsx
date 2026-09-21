"use client";

import React, { useState } from "react";

export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  tagline: string;
  description: string;
  deliverables: string[];
  gradient: string;
}

interface StudiovaServicesTabsProps {
  tagNumber?: string;
  tagLabel?: string;
  heading?: string;
  subheading?: string;
  services?: ServiceItem[];
  brandLink?: string;
  className?: string;
}

export const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: "brand",
    number: "01",
    title: "Brand Identity",
    tagline: "High-conviction art direction & distinctive visual systems",
    description:
      "We design comprehensive visual languages that command authority in saturated markets—from logo geometry and typography hierarchies to bespoke motion guidelines.",
    deliverables: [
      "Visual Positioning & Manifesto",
      "Dynamic Logo Architecture",
      "Typography & Color Systems",
      "Comprehensive Digital Brand Book",
    ],
    gradient: "from-amber-500/20 via-yellow-600/10 to-transparent",
  },
  {
    id: "web",
    number: "02",
    title: "Web Development",
    tagline: "High-performance React, Next.js & WebGL experiences",
    description:
      "Precision-crafted frontend applications built for sub-second page loads, fluid scroll physics, zero layout shifts, and search engine prominence.",
    deliverables: [
      "Next.js App Router Architecture",
      "GSAP & Three.js 3D Viewports",
      "Modular Headless CMS Integration",
      "99+ Google Lighthouse Scores",
    ],
    gradient: "from-emerald-500/20 via-teal-600/10 to-transparent",
  },
  {
    id: "uiux",
    number: "03",
    title: "UI/UX Experience",
    tagline: "Intuitive product design engineered for enterprise conversion",
    description:
      "User flows and ergonomic dashboard interfaces mapped to real customer psychology, reducing friction while accelerating time-to-value for complex SaaS workflows.",
    deliverables: [
      "Customer Journey Blueprinting",
      "Interactive High-Fidelity Prototypes",
      "Atomic Token Design Systems",
      "Usability & Conversion Audits",
    ],
    gradient: "from-blue-500/20 via-indigo-600/10 to-transparent",
  },
  {
    id: "motion",
    number: "04",
    title: "Motion & 3D Visuals",
    tagline: "Kinetic storytelling that stops scrollers in their tracks",
    description:
      "Custom shaders, procedural particle canvas simulations, and tactile interactive physics that transform static marketing websites into memorable digital journeys.",
    deliverables: [
      "Interactive 3D Asset Renders",
      "Canvas Particle Physics Engines",
      "Micro-interaction Choreography",
      "Exported Lottie & WebM Loops",
    ],
    gradient: "from-rose-500/20 via-purple-600/10 to-transparent",
  },
];

export function StudiovaServicesTabs({
  tagNumber = "03",
  tagLabel = "Capabilities",
  heading = "What we do",
  subheading = "A glimpse into our multidisciplinary execution—exploring luxury design systems, successful venture collaborations, and transformative digital experiences.",
  services = DEFAULT_SERVICES,
  brandLink = "https://scriptly.store/",
  className = "",
}: StudiovaServicesTabsProps) {
  const [activeTab, setActiveTab] = useState(services[0].id);
  const activeService = services.find((s) => s.id === activeTab) || services[0];

  return (
    <section
      className={`py-16 px-4 md:px-8 bg-[#090a0f] text-white relative overflow-hidden font-sans rounded-3xl ${className}`}
    >
      {/* Subtle background glow */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#E2B774]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-14">
          <div className="lg:col-span-4 flex items-center gap-4">
            <span className="w-9 h-9 rounded-full bg-[#E2B774] text-black font-semibold text-sm flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(226,183,116,0.3)]">
              {tagNumber}
            </span>
            <div className="h-[1px] w-12 bg-white/20" />
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-medium tracking-wider text-zinc-300">
              {tagLabel}
            </span>
          </div>

          <div className="lg:col-span-8 max-w-2xl">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-3">
              {heading}
            </h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              {subheading}
            </p>
          </div>
        </div>

        {/* Interactive Layout: Left Interactive Tabs / Right Dynamic Feature Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Accordion / Tab Buttons */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {services.map((item) => {
              const isActive = item.id === activeTab;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`cursor-pointer rounded-2xl p-6 transition-all duration-300 border ${
                    isActive
                      ? "bg-[#141520] border-[#E2B774]/60 shadow-[0_10px_30px_rgba(226,183,116,0.1)]"
                      : "bg-[#0d0e15]/60 border-white/5 hover:border-white/15 hover:bg-[#12131c]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                          isActive
                            ? "bg-[#E2B774] text-black"
                            : "bg-white/5 text-zinc-400"
                        }`}
                      >
                        {item.number}
                      </span>
                      <h3
                        className={`text-lg md:text-xl font-bold transition-colors ${
                          isActive ? "text-white" : "text-zinc-300"
                        }`}
                      >
                        {item.title}
                      </h3>
                    </div>

                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 ${
                        isActive
                          ? "bg-[#E2B774] text-black rotate-45"
                          : "text-zinc-500 bg-white/5"
                      }`}
                    >
                      <svg
                        className="w-3.5 h-3.5 stroke-current stroke-2 fill-none"
                        viewBox="0 0 24 24"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </div>

                  {/* Expanded Content for Active Tab */}
                  {isActive && (
                    <div className="mt-4 pt-4 border-t border-white/10 animate-fadeIn">
                      <p className="text-xs font-medium text-[#E2B774] mb-2 font-mono">
                        {item.tagline}
                      </p>
                      <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-4">
                        {item.description}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.deliverables.map((del, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[11px] text-zinc-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E2B774]" />
                            <span>{del}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Showcase Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl p-8 bg-[#12131d] border border-white/10 relative overflow-hidden">
            {/* Dynamic Ambient Gradient Mask */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${activeService.gradient} opacity-50 pointer-events-none transition-all duration-500`}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-mono font-bold tracking-widest text-[#E2B774] uppercase">
                  Service Specification
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                  {activeService.number} / 04
                </span>
              </div>

              {/* Graphic Showcase Canvas Mockup */}
              <div className="w-full h-48 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center p-6 relative overflow-hidden mb-6 shadow-inner">
                {/* Decorative Grid Lines */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* Central Visual Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E2B774]/20 to-white/10 border border-[#E2B774]/40 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(226,183,116,0.2)]">
                  <svg
                    className="w-8 h-8 text-[#E2B774] stroke-current stroke-1.5 fill-none"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                  {activeService.title}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1">
                  Ready for Production Implementation
                </span>
              </div>

              <h4 className="text-lg font-bold text-white mb-2">
                {activeService.tagline}
              </h4>
              <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                {activeService.description}
              </p>
            </div>

            {/* Bottom Action */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
              <a
                href={brandLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#E2B774] hover:underline flex items-center gap-1.5"
              >
                <span>Explore on Scriptly</span>
                <span>↗</span>
              </a>
              <span className="text-[10px] font-mono text-zinc-500">
                Studiova Agency Suite
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudiovaServicesTabs;
