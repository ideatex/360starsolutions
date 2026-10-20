Created At: 2026-07-15T05:44:45Z
Completed At: 2026-07-15T05:44:46Z
File Path: `file:///f:/360%20Star%20Solutions/frontend/src/app/page.tsx`
Total Lines: 108
Total Bytes: 5701
Showing lines 1 to 108
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: "use client";
2: 
3: import React from 'react';
4: import { motion } from 'framer-motion';
5: import Link from 'next/link';
6: import { ShieldCheck, BarChart3, Users, Landmark, ArrowRight } from 'lucide-react';
7: 
8: export default function Home() {
9:   return (
10:     <div className="min-h-screen bg-[#070913] text-white flex flex-col justify-between p-6 relative overflow-hidden font-sans">
11:       {/* Background radial gradient glow effects */}
12:       <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
13:       <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-brand-accent/10 blur-[120px] pointer-events-none" />
14: 
15:       {/* Header */}
16:       <header className="max-w-7xl w-full mx-auto flex justify-between items-center py-4 relative z-10 select-none">
17:         <div className="flex items-center gap-2">
18:           <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary border border-brand-primary/20">
19:             <ShieldCheck size={20} />
20:           </div>
21:           <span className="font-extrabold text-sm tracking-tight text-white">360 STAR</span>
22:         </div>
23:         <Link href="/auth/login">
24:           <span className="text-xs font-bold text-gray-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.02] backdrop-blur-md px-4 py-2 rounded-xl transition-all cursor-pointer">
25:             Access Workspace
26:           </span>
27:         </Link>
28:       </header>
29: 
30:       {/* Hero section */}
31:       <main className="max-w-4xl w-full mx-auto text-center my-auto py-16 relative z-10 space-y-8">
32:         <motion.div
33:           initial={{ opacity: 0, y: 15 }}
34:           animate={{ opacity: 1, y: 0 }}
35:           transition={{ duration: 0.5 }}
36:           className="space-y-4"
37:         >
38:           <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-brand-primary/20 uppercase tracking-widest inline-block select-none">
39:             Enterprise Financial CRM
40:           </span>
41:           <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
42:             Secure Capital Routing & <br />
43:             <span className="text-brand-primary">Downline Tree Logistics</span>
44:           </h1>
45:           <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
46:             Redefining portfolio yield proration, multi-level commission logs, and secure ledger audits for corporate referrers.
47:           </p>
48:         </motion.div>
49: 
50:         <motion.div
51:           initial={{ opacity: 0, scale: 0.95 }}
52:           animate={{ opacity: 1, scale: 1 }}
53:           transition={{ duration: 0.5, delay: 0.1 }}
54:           className="flex justify-center gap-4 select-none"
55:         >
56:           <Link href="/auth/register">
57:             <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider">
58:               Register Portfolio Node <ArrowRight size={14} />
59:             </span>
60:           </Link>
61:           <Link href="/auth/login">
62:             <span className="bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/10 font-bold px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider">
63:               Operator Sign In
64:             </span>
65:           </Link>
66:         </motion.div>
67: 
68:         {/* Feature Highlights Grid */}
69:         <motion.div
70:           initial={{ opacity: 0, y: 15 }}
71:           animate={{ opacity: 1, y: 0 }}
72:           transition={{ duration: 0.5, delay: 0.2 }}
73:           className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left"
74:         >
75:           <div className="bg-white/[0.01] backdrop-blur-md border border-white/5 p-5 rounded-2xl space-y-3">
76:             <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary w-fit">
77:               <BarChart3 size={18} />
78:             </div>
79:             <h3 className="text-xs font-bold text-white tracking-wide uppercase">Prorated ROI sharing</h3>
80:             <p className="text-[11px] text-gray-400 leading-normal">Accrue prorated capital growth distributed across active client cycles twice monthly.</p>
81:           </div>
82: 
83:           <div className="bg-white/[0.01] backdrop-blur-md border border-white/5 p-5 rounded-2xl space-y-3">
84:             <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-405 w-fit">
85:               <Users size={18} />
86:             </div>
87:             <h3 className="text-xs font-bold text-white tracking-wide uppercase">7-Level downlines</h3>
88:             <p className="text-[11px] text-gray-400 leading-normal">Visualize manager hierarchies, lineage paths, and partner placements dynamically.</p>
89:           </div>
90: 
91:           <div className="bg-white/[0.01] backdrop-blur-md border border-white/5 p-5 rounded-2xl space-y-3">
92:             <div className="p-2 bg-amber-500/10 rounded-xl text-amber-555 w-fit">
93:               <Landmark size={18} />
94:             </div>
95:             <h3 className="text-xs font-bold text-white tracking-wide uppercase">Audit compliance</h3>
96:             <p className="text-[11px] text-gray-400 leading-normal">Secure configuration controls, batch releases, and immutable action audit trails.</p>
97:           </div>
98:         </motion.div>
99:       </main>
100: 
101:       {/* Footer */}
102:       <footer className="max-w-7xl w-full mx-auto text-center py-4 border-t border-white/5 text-[10px] text-gray-500 select-none">
103:         © {new Date().getFullYear()} 360 Star Solutions. All rights reserved. Enterprise Gateway v1.0.0.
104:       </footer>
105:     </div>
106:   );
107: }
108: 
The above content shows the entire, complete file contents of the requested file.
