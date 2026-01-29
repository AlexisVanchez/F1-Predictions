import React from 'react';

export default function Medal({ title, icon, color, desc, isSpecial, locked }) {
    return (
        <div className={`flex flex-col items-center group relative ${locked ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-help'}`}>
            {isSpecial && !locked && (
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-500/10 blur-2xl rounded-full animate-pulse"></div>
            )}
            <div className={`
                w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border transition-all duration-500 relative z-10
                ${locked ? 'border-white/5' : (isSpecial ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(255,174,0,0.2)]' : 'border-white/10 group-hover:border-red-600/50')}
                ${!locked && 'group-hover:scale-110'}
            `}>
                <i className={`fa fa-${icon} ${isSpecial ? 'text-2xl' : 'text-xl'}`} style={{ color: locked ? '#666' : color }}></i>
                {isSpecial && !locked && <div className="absolute inset-0 border-2 border-yellow-500/20 rounded-full animate-spin-slow"></div>}
            </div>
            <span className={`text-[10px] font-black uppercase mt-3 tracking-tighter transition-colors ${locked ? 'text-gray-600' : (isSpecial ? 'text-yellow-500' : 'text-white')}`}>{title}</span>
            <span className={`text-[8px] font-bold text-gray-600 uppercase mt-0.5 ${locked ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity text-center w-24`}>{desc}</span>
        </div>
    );
}
