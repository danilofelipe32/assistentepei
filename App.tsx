import React, { useState, useEffect } from 'react';
import { useAppStore } from './store.ts';

// Views
import { PeiFormView } from './components/PeiFormView.tsx';
import { ActivityBankView } from './components/ActivityBankView.tsx';
import { PeiListView } from './components/PeiListView.tsx';
import { SupportFilesView } from './components/SupportFilesView.tsx';
import { PrivacyPolicyView } from './components/PrivacyPolicyView.tsx';
import { ActivityDetailView } from './components/ActivityDetailView.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { BrainIcon } from './constants.tsx';


const App = () => {
    // Read state and actions from the global store
    const { currentView, editingPeiId } = useAppStore();
    const { navigateToView, navigateToNewPei } = useAppStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
        if (!hasCompletedOnboarding) {
            setShowOnboarding(true);
        }
    }, []);

    const handleOnboardingFinish = () => {
        localStorage.setItem('hasCompletedOnboarding', 'true');
        setShowOnboarding(false);
    };

    const handleNavigation = (targetView) => {
        if (targetView === 'pei-form-view') {
            navigateToNewPei();
        } else {
            navigateToView(targetView);
        }
        setIsSidebarOpen(false);
    };

    const renderCurrentView = () => {
        switch (currentView) {
            case 'pei-form-view':
                return <PeiFormView 
                            key={editingPeiId || 'new'} 
                            editingPeiId={editingPeiId} 
                            onSaveSuccess={() => navigateToView('pei-list-view')} 
                        />;
            case 'activity-bank-view':
                return <ActivityBankView />;
            case 'pei-list-view':
                return <PeiListView />;
            case 'files-view':
                return <SupportFilesView />;
            case 'privacy-policy-view':
                return <PrivacyPolicyView />;
            case 'activity-detail-view':
                return <ActivityDetailView />;
            default:
                return <div>Página não encontrada</div>;
        }
    };


    return (
        <div className="h-screen w-screen bg-gray-100 flex flex-col md:flex-row font-sans">
            <OnboardingModal isOpen={showOnboarding} onClose={handleOnboardingFinish} />
            {/* Mobile Header */}
            <header className="md:hidden flex justify-between items-center p-4 bg-white border-b border-gray-200">
                 <div className="flex items-center gap-3">
                    <div className="text-2xl text-indigo-600"><BrainIcon /></div>
                    <h1 className="text-xl font-bold text-gray-800">Assistente PEI</h1>
                </div>
                <button type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600">
                    <i className="fa-solid fa-bars text-xl"></i>
                </button>
            </header>
            
            <Sidebar 
                isSidebarOpen={isSidebarOpen} 
                onNavigate={handleNavigation}
            />
            
            <main className="flex-1 flex flex-col overflow-hidden">
                 <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-100">
                    {renderCurrentView()}
                 </div>
            </main>
        </div>
    );
};

export default App;