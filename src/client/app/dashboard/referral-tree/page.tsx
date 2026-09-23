"use client";

import React from 'react';
import ReferralTree from '@/components/ReferralTree';
import { motion } from 'framer-motion';

export default function ReferralTreePage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35 }}
      className="max-w-7xl mx-auto space-y-6 font-outfit pb-12"
    >
      <ReferralTree />
    </motion.div>
  );
}
