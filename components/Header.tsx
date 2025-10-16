
import React from 'react';
import { Sparkles } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="py-6 md:py-8 border-b border-gray-800/50 bg-brand-surface/20">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center items-center gap-3">
          <Sparkles className="h-8 w-8 text-brand-primary" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-primary via-brand-secondary to-blue-400">
            Guide d'Installation de l'API Gemini
          </h1>
        </div>
        <p className="mt-2 text-lg text-brand-text-secondary">
          Un guide simple pour intégrer la puissance de Gemini dans vos applications.
        </p>
      </div>
    </header>
  );
};

export default Header;
