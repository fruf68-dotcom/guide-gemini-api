
import React from 'react';

interface InstructionStepProps {
  step: string;
  title: string;
  children: React.ReactNode;
}

const InstructionStep: React.FC<InstructionStepProps> = ({ step, title, children }) => {
  return (
    <section className="bg-brand-surface p-6 md:p-8 rounded-xl shadow-2xl border border-gray-700/50 transition-all duration-300 hover:border-brand-primary/50">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0 bg-brand-primary h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
          {step}
        </div>
        <h2 className="text-2xl font-bold text-brand-text-primary">{title}</h2>
      </div>
      <div className="pl-0 md:pl-16">
        {children}
      </div>
    </section>
  );
};

export default InstructionStep;
