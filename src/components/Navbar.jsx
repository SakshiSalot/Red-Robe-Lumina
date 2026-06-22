import React, { useState } from 'react';
import { Menu, X, Code2, Sparkles, LogOut, ArrowLeft, LayoutDashboard } from 'lucide-react';

const Navbar = ({ onLogin, onJoin, onNavigate, isLoggedIn, onLogout, onDashboard, dashboardLabel, showBack, onBack }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    const go = (fn) => () => { fn(); setIsMobileMenuOpen(false); };

    return (
        <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
            {/* Top bar: consistent height across breakpoints so nothing floats/overlaps */}
            <div className="flex items-center justify-between h-16 md:h-20 px-4 lg:px-8 max-w-screen-2xl mx-auto">
                {/* Left: optional back button + logo (one flex group, so they never overlap the hamburger) */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                {showBack && (
                    <button
                        onClick={onBack}
                        aria-label="Go back"
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white transition-all shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}
                {/* Logo */}
                <div className="flex items-center space-x-2 cursor-pointer group" onClick={go(() => onNavigate('landing'))}>
                    <div className="relative">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300 group-hover:scale-110">
                            <Code2 className="text-white" size={20} strokeWidth={2.5} />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <Sparkles className="text-white" size={10} />
                        </div>
                    </div>
                    <div className="flex items-baseline space-x-0.5">
                        <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">DevScore</span>
                        <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">.ai</span>
                    </div>
                </div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-8">
                    <button className="text-gray-300 hover:text-white text-sm font-medium" onClick={() => onNavigate('landing')}>Home</button>
                    <button className="text-gray-300 hover:text-white text-sm font-medium" onClick={() => onNavigate('about')}>About</button>
                    <button className="text-gray-300 hover:text-white text-sm font-medium" onClick={() => onNavigate('contact')}>Contact</button>

                    {isLoggedIn ? (
                        <>
                            <button
                                onClick={onDashboard}
                                className="flex items-center space-x-2 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-purple-500/50 text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
                            >
                                <LayoutDashboard size={16} />
                                <span>{dashboardLabel || 'Dashboard'}</span>
                            </button>
                            <button
                                onClick={onLogout}
                                className="flex items-center space-x-2 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
                            >
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Candidate Dropdown */}
                            <div className="relative" onMouseEnter={() => setActiveDropdown('candidate')} onMouseLeave={() => setActiveDropdown(null)}>
                                <button className="text-gray-300 hover:text-white text-sm font-medium py-4">Candidate</button>
                                {activeDropdown === 'candidate' && (
                                    <div className="absolute top-full right-0 w-40 bg-black border border-white/10 rounded-lg shadow-xl overflow-hidden py-1">
                                        <button onClick={() => { onLogin('candidate'); setActiveDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white">Login</button>
                                        <button onClick={() => { onJoin('candidate'); setActiveDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white">Join</button>
                                    </div>
                                )}
                            </div>

                            {/* Recruiter Dropdown */}
                            <div className="relative" onMouseEnter={() => setActiveDropdown('recruiter')} onMouseLeave={() => setActiveDropdown(null)}>
                                <button className="text-gray-300 hover:text-white text-sm font-medium py-4">Recruiter</button>
                                {activeDropdown === 'recruiter' && (
                                    <div className="absolute top-full right-0 w-40 bg-black border border-white/10 rounded-lg shadow-xl overflow-hidden py-1">
                                        <button onClick={() => { onLogin('recruiter'); setActiveDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white">Login</button>
                                        <button onClick={() => { onJoin('recruiter'); setActiveDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white">Join</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden text-gray-300 hover:text-white p-2 shrink-0"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-black border-t border-white/10">
                    <div className="px-6 py-4 space-y-4 flex flex-col">
                        <button className="text-gray-300 hover:text-white text-sm font-medium text-left" onClick={go(() => onNavigate('landing'))}>Home</button>
                        <button className="text-gray-300 hover:text-white text-sm font-medium text-left" onClick={go(() => onNavigate('about'))}>About</button>
                        <button className="text-gray-300 hover:text-white text-sm font-medium text-left" onClick={go(() => onNavigate('contact'))}>Contact</button>

                        {isLoggedIn ? (
                            <>
                                <div className="h-px bg-white/10 my-2" />
                                <button onClick={go(onDashboard)} className="flex items-center space-x-2 text-gray-300 hover:text-white text-sm font-medium text-left">
                                    <LayoutDashboard size={16} />
                                    <span>{dashboardLabel || 'Dashboard'}</span>
                                </button>
                                <button onClick={go(onLogout)} className="flex items-center space-x-2 text-red-400 hover:text-red-300 text-sm font-medium text-left">
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="h-px bg-white/10 my-2" />
                                <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Candidate</div>
                                <button onClick={go(() => onLogin('candidate'))} className="text-gray-300 hover:text-white text-sm font-medium text-left pl-4">Login</button>
                                <button onClick={go(() => onJoin('candidate'))} className="text-gray-300 hover:text-white text-sm font-medium text-left pl-4">Join</button>
                                <div className="h-px bg-white/10 my-2" />
                                <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Recruiter</div>
                                <button onClick={go(() => onLogin('recruiter'))} className="text-gray-300 hover:text-white text-sm font-medium text-left pl-4">Login</button>
                                <button onClick={go(() => onJoin('recruiter'))} className="text-gray-300 hover:text-white text-sm font-medium text-left pl-4">Join</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
