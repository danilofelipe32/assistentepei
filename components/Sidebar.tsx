import React from 'react';
import { useAppStore } from '../store.ts';
import { 
    BrainIcon, 
    EditorIcon, 
    ActivityIcon, 
    ArchiveIcon, 
    PaperclipIcon, 
    ShieldIcon 
} from '../constants.tsx';

// FIX: Added interface for props
interface SidebarProps {
    isSidebarOpen: boolean;
    onNavigate: (view: any) => void;
}

export const Sidebar = ({ isSidebarOpen, onNavigate }: SidebarProps) => {
    const { currentView } = useAppStore();

    const menuItems = [
        { id: 'pei-form-view', label: 'Novo PEI', icon: <EditorIcon /> },
        { id: 'pei-list-view', label: 'PEIs Salvos', icon: <ArchiveIcon /> },
        { id: 'activity-bank-view', label: 'Banco de Atividades', icon: <ActivityIcon /> },
        { id: 'files-view', label: 'Ficheiros de Apoio', icon: <PaperclipIcon /> },
        { id: 'privacy-policy-view', label: 'Política de Privacidade', icon: <ShieldIcon /> },
    ];

    return (
        <aside 
            className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-auto
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
            <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                <div className="text-3xl text-indigo-600"><BrainIcon /></div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Assistente PEI</h1>
                    <p className="text-xs text-indigo-500 font-medium mt-1">com Inteligência Artificial</p>
                </div>
            </div>

            <nav className="p-4 space-y-1">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
                            ${currentView === item.id 
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <span className={`text-lg w-6 flex justify-center ${currentView === item.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {item.icon}
                        </span>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="absolute bottom-0 w-full p-6 border-t border-gray-100">
                 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-xs font-semibold opacity-80 uppercase tracking-wider mb-1">Dica Pro</p>
                    <p className="text-sm">Use os Ficheiros de Apoio para personalizar a IA com o contexto da sua escola.</p>
                </div>
            </div>
        </aside>
    );
};