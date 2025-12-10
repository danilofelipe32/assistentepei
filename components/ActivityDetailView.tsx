import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store.ts';
import { getAllActivities } from '../services/storageService.ts';
import { Activity } from '../types.ts';

export const ActivityDetailView = () => {
    const { selectedActivityId, navigateToView } = useAppStore();
    const [activity, setActivity] = useState<Activity | null>(null);

    useEffect(() => {
        if (selectedActivityId) {
            const allActivities = getAllActivities();
            const found = allActivities.find(a => a.id === selectedActivityId);
            setActivity(found || null);
        }
    }, [selectedActivityId]);

    if (!selectedActivityId || !activity) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-6xl text-gray-300 mb-4">
                    <i className="fa-regular fa-folder-open"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Nenhuma atividade selecionada</h2>
                <p className="text-gray-500 mb-6">Selecione uma atividade no banco de atividades para ver os detalhes.</p>
                <button 
                    onClick={() => navigateToView('activity-bank-view')}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Voltar ao Banco de Atividades
                </button>
            </div>
        );
    }

    const skillsList = Array.isArray(activity.skills) 
        ? activity.skills 
        : (activity.skills as string).split(',').map(s => s.trim());

    const needsList = Array.isArray(activity.needs) 
        ? activity.needs 
        : (activity.needs as string).split(',').map(s => s.trim());

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <button 
                    onClick={() => navigateToView('activity-bank-view')}
                    className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <i className="fa-solid fa-arrow-left"></i>
                    Voltar
                </button>
                <div className="flex gap-2">
                    {activity.isFavorited && (
                        <span className="text-amber-500" title="Favorito">
                            <i className="fa-solid fa-star text-xl"></i>
                        </span>
                    )}
                    {activity.isDUA && (
                         <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full flex items-center">
                            DUA
                        </span>
                    )}
                </div>
            </div>

            <div className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{activity.title}</h1>
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold mb-6">
                    {activity.discipline}
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Descrição da Atividade</h3>
                        <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                            {activity.description}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Habilidades Trabalhadas</h3>
                            {skillsList.length > 0 && skillsList[0] !== '' ? (
                                <div className="flex flex-wrap gap-2">
                                    {skillsList.map((skill, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">Nenhuma habilidade especificada.</p>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Necessidades Atendidas</h3>
                            {needsList.length > 0 && needsList[0] !== '' ? (
                                <div className="flex flex-wrap gap-2">
                                    {needsList.map((need, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg border border-sky-200 text-sm">
                                            {need}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">Nenhuma necessidade específica listada.</p>
                            )}
                        </div>
                    </div>

                    {activity.goalTags && activity.goalTags.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Tags de Metas</h3>
                            <div className="flex flex-wrap gap-2">
                                {activity.goalTags.map((tag, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium uppercase tracking-wide">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};