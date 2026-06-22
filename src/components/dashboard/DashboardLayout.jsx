import React, { useState, useEffect } from 'react';
import SplineBackground from './SplineBackground';
import DashboardOverview from './DashboardOverview';
import CreateAssignmentModal from './CreateAssignmentModal';
import Leaderboard from './Leaderboard';
import CandidateProfile from './CandidateProfile';
import RecruiterService from '../../services/RecruiterService';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Menu, X, LayoutDashboard, Award, FileCheck, LogOut } from 'lucide-react';

const DashboardLayout = ({ onLogout }) => {
    const [view, setView] = useState('dashboard'); // 'dashboard', 'create', 'results', 'profile'
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Fetch recruiter's assessments on mount
    useEffect(() => {
        const fetchAssessments = async () => {
            try {
                const data = await RecruiterService.getAssessments();
                setAssessments(data);
                if (data.length > 0) {
                    setSelectedAssessmentId(data[0].id);
                }
            } catch (err) {
                console.error('Failed to load assessments:', err);
            }
        };
        fetchAssessments();
    }, []);

    // Handle browser back/forward navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Alt + Left Arrow for back
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                window.history.back();
            }
            // Alt + Right Arrow for forward
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                window.history.forward();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            const menuElement = document.getElementById('recruiter-menu');
            if (menuElement && !menuElement.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'results', label: 'Leaderboard', icon: Award },
        { id: 'create', label: 'Assessment', icon: FileCheck },
    ];

    const handleMenuClick = (menuId) => {
        setView(menuId);
        setIsMenuOpen(false);
        setSelectedCandidate(null);
    };

    const refreshAssessments = async () => {
        try {
            const data = await RecruiterService.getAssessments();
            setAssessments(data);
            if (data.length > 0 && !selectedAssessmentId) {
                setSelectedAssessmentId(data[0].id);
            }
        } catch (err) {
            console.error('Failed to refresh assessments:', err);
        }
    };

    const renderContent = () => {
        switch (view) {
            case 'dashboard':
                return <DashboardOverview assessments={assessments} onRefresh={refreshAssessments} />;
            case 'create':
                return (
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <h2 className="text-2xl font-bold">Manage Assessments</h2>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            + Create New Assessment
                        </button>
                    </div>
                );
            case 'results':
                return (
                    <div>
                        {assessments.length > 1 && (
                            <div className="mb-6 flex items-center space-x-4">
                                <label className="text-gray-400 text-sm">Select Assessment:</label>
                                <select
                                    value={selectedAssessmentId || ''}
                                    onChange={(e) => setSelectedAssessmentId(e.target.value)}
                                    className="bg-black/60 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                >
                                    {assessments.map((a) => (
                                        <option key={a.id} value={a.id}>{a.title} ({a.questionCount} Q)</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <Leaderboard assessmentId={selectedAssessmentId} onSelectCandidate={(candidate) => { setSelectedCandidate(candidate); setView('profile'); }} />
                    </div>
                );
            case 'profile':
                return selectedCandidate ? <CandidateProfile candidate={selectedCandidate} onBack={() => setView('results')} /> : <Leaderboard assessmentId={selectedAssessmentId} onSelectCandidate={(candidate) => { setSelectedCandidate(candidate); setView('profile'); }} />;
            default:
                return <DashboardOverview />;
        }
    };

    return (
        <div className="relative min-h-screen bg-[#030003] text-white font-sans">
            <SplineBackground />

            {/* AI Core Floating Element - below the navbar, top right */}
            <div className="fixed top-28 right-8 w-24 h-24 pointer-events-none z-0 hidden lg:block">
                <div className="relative w-full h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                    <div className="absolute inset-2 border border-white/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-6 border border-white/40 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white] animate-ping"></div>
                    </div>
                </div>
            </div>

            {/* Recruiter Navbar — single full-width fixed bar (replaces the global navbar here) */}
            <nav id="recruiter-menu" className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
                <div className="flex items-center justify-between h-16 md:h-20 px-4 sm:px-8 max-w-screen-2xl mx-auto">
                    {/* Brand */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-lg flex items-center justify-center">
                            <LayoutDashboard className="text-white" size={20} />
                        </div>
                        <span className="text-lg md:text-xl font-bold text-white">Recruiter</span>
                    </div>

                    {/* Desktop section tabs + sign out */}
                    <div className="hidden md:flex items-center gap-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = view === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleMenuClick(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-purple-600/20 border border-purple-500/30 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <Icon size={18} className={isActive ? 'text-purple-400' : ''} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all ml-2"
                        >
                            <LogOut size={18} />
                            <span>Sign Out</span>
                        </button>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden text-gray-300 hover:text-white p-2 shrink-0"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>

                {/* Mobile dropdown */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-black border-t border-white/10 overflow-hidden"
                        >
                            <div className="px-4 py-3 space-y-1">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = view === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleMenuClick(item.id)}
                                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-purple-600/20 border border-purple-500/30 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            <Icon size={20} className={isActive ? 'text-purple-400' : 'text-gray-500'} />
                                            <span className="font-medium text-sm">{item.label}</span>
                                        </button>
                                    );
                                })}
                                <div className="border-t border-white/10 my-2"></div>
                                <button
                                    onClick={() => { setIsMenuOpen(false); onLogout(); }}
                                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                >
                                    <LogOut size={20} />
                                    <span className="font-medium text-sm">Sign Out</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                <main className="flex-1 pt-24 md:pt-28 px-4 sm:px-8 relative z-10 pb-24">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Footer */}
                <footer className="bg-[#030003] border-t border-white/10 py-4 z-20 hidden">
                    <div className="flex justify-between items-center px-4 text-sm text-gray-500">
                        <p>© {new Date().getFullYear()} DevScoreAI. All rights reserved.</p>
                        <div className="flex space-x-6">
                            <button className="hover:text-white transition-colors">Privacy Policy</button>
                            <button className="hover:text-white transition-colors">Terms of Service</button>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-8 right-8 z-40 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)] border border-white/20 group"
            >
                <Plus size={28} className="text-white group-hover:rotate-90 transition-transform duration-300" />
            </motion.button>

            <CreateAssignmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); refreshAssessments(); }} />
        </div>
    );
};

export default DashboardLayout;
