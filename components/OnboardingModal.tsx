import React from 'react';
import { Modal } from './Modal.tsx';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const OnboardingModal = ({ isOpen, onClose }: OnboardingModalProps) => {
    return (
        <Modal
            id="onboarding-modal"
            title="Bem-vindo ao Assistente PEI com IA!"
            isOpen={isOpen}
            onClose={onClose}
            footer={
                <button 
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-transform transform hover:scale-105"
                >
                    Começar a usar agora
                </button>
            }
        >
            <div className="text-center space-y-6 py-2">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-4xl text-indigo-600 mb-4">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800">Crie Planos Educacionais Individualizados em minutos, não horas.</h3>
                
                <p className="text-gray-600 leading-relaxed">
                    Esta aplicação utiliza Inteligência Artificial avançada para auxiliar você, educador, na elaboração de PEIs completos, detalhados e personalizados.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mt-6">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-indigo-500 text-xl mb-2"><i className="fa-solid fa-file-pen"></i></div>
                        <h4 className="font-bold text-gray-800 text-sm">Preenchimento Inteligente</h4>
                        <p className="text-xs text-gray-500 mt-1">A IA sugere conteúdos para cada campo com base no contexto do aluno.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-indigo-500 text-xl mb-2"><i className="fa-solid fa-lightbulb"></i></div>
                        <h4 className="font-bold text-gray-800 text-sm">Sugestão de Atividades</h4>
                        <p className="text-xs text-gray-500 mt-1">Receba ideias de atividades adaptadas alinhadas às metas do PEI.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-indigo-500 text-xl mb-2"><i className="fa-solid fa-magnifying-glass-chart"></i></div>
                        <h4 className="font-bold text-gray-800 text-sm">Análise Técnica</h4>
                        <p className="text-xs text-gray-500 mt-1">Valide metas e estratégias com uma análise pedagógica automática.</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};