import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { fieldOrderForPreview, disciplineOptions } from '../constants.tsx';
import { TextAreaWithActions } from './TextAreaWithActions.tsx';
import { callGenerativeAI, Part } from '../services/geminiService.ts';
import { savePei, getPeiById, getAllRagFiles, addActivitiesToBank } from '../services/storageService.ts';
import { Modal } from './Modal.tsx';
import { Activity, PeiData, NewPeiRecordData } from '../types.ts';
import { useAppStore } from '../store.ts';

const helpTexts = {
    'id-diagnostico': 'Descreva o diagnóstico do aluno (se houver) e as necessidades educacionais específicas decorrentes dele. Ex: TDAH, Dislexia, TEA.',
    'id-contexto': 'Apresente um breve resumo do contexto familiar e da trajetória escolar do aluno. Fatores relevantes podem incluir apoio familiar, mudanças de escola, etc.',
    'aval-habilidades': 'Detalhe as competências e dificuldades do aluno em áreas acadêmicas como leitura, escrita e matemática. Use exemplos concretos.',
    'aval-social': 'Descreva como o aluno interage com colegas e professores, seu comportamento em sala e habilidades de comunicação.',
    'aval-coord': 'Aborde aspectos da coordenação motora fina e grossa, bem como a autonomia do aluno em atividades diárias e escolares.',
    'metas-curto': "Defina um objetivo específico e alcançável para os próximos 3 meses. Ex: 'Ler e interpretar frases simples com 80% de precisão'.",
    'metas-medio': 'Estabeleça uma meta para os próximos 6 meses, que represente um avanço em relação à meta de curto prazo.',
    'metas-longo': 'Descreva o objetivo principal a ser alcançado ao final do ano letivo. Deve ser uma meta ampla e significativa.',
    'est-adaptacoes': 'Liste as adaptações necessárias em materiais, avaliações e no ambiente para facilitar o aprendizado. Ex: Provas com fonte ampliada, tempo extra.',
    'est-metodologias': 'Descreva as abordagens pedagógicas que serão utilizadas. Ex: Aulas expositivas com apoio visual, aprendizado baseado em projetos, gamificação.',
    'est-parcerias': 'Indique como será a colaboração com a família, terapeutas e outros profissionais que acompanham o aluno.',
    'resp-regente': 'Descreva as responsabilidades do professor regente na implementação e acompanhamento do PEI.',
    'resp-coord': 'Detalhe o papel do coordenador pedagógico, como supervisão, apoio ao professor e articulação com a família.',
    'resp-familia': 'Especifique como a família participará do processo, apoiando as atividades em casa e mantendo a comunicação com a escola.',
    'resp-apoio': 'Liste outros profissionais (psicólogos, fonoaudiólogos, etc.) e suas respectivas atribuições no plano.',
    'revisao': 'Defina a periodicidade (ex: bimestral, trimestral) e os critérios que serão usados para avaliar o progresso do aluno e a necessidade de ajustes no plano.',
    'revisao-ajustes': 'Resuma as principais modificações feitas no PEI desde a última revisão. Ex: "A meta de curto prazo foi ajustada para focar na interpretação de textos", "Novas estratégias visuais foram incorporadas".',
    'atividades-content': 'Use a IA para sugerir atividades com base nas metas ou descreva suas próprias propostas de atividades adaptadas.',
    'dua-content': 'Descreva como os princípios do Desenho Universal para a Aprendizagem (DUA) serão aplicados para remover barreiras e promover a inclusão.'
};

const requiredFields = [
    ...fieldOrderForPreview.find(s => s.title.startsWith("1."))!.fields.map(f => f.id),
    ...fieldOrderForPreview.find(s => s.title.startsWith("2."))!.fields.map(f => f.id)
];

const AccordionSection = (props) => {
    const { title, isOpen, onToggle, children, color, progress } = props;
    const numberMatch = title.match(/^(\d+)\./);
    const number = numberMatch ? numberMatch[1] : null;
    const cleanTitle = numberMatch ? title.replace(/^\d+\.\s*/, '') : title;

    const isComplete = progress === 100;
    const progressBarColor = isComplete ? 'bg-green-500' : 'bg-blue-500';

    return (
        <div className="rounded-xl shadow-md border border-blue-200 overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className={`w-full flex items-start p-4 text-left transition-colors duration-200 min-h-24 ${isOpen ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'}`}
                aria-expanded={isOpen}
            >
                {number && (
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-4 mt-1 ${color}`}>
                        <span className="text-white font-bold">{number}</span>
                    </div>
                )}
                <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-blue-900">{cleanTitle}</h3>
                    {progress !== undefined && (
                        <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-4 relative">
                                <div
                                    className={`${progressBarColor} h-full rounded-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 ease-in-out`}
                                    style={{ width: `${progress}%` }}
                                >
                                    {progress > 10 && <span>{Math.round(progress)}%</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300 ml-4 mt-1 ${isOpen ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-800'}`}>
                    <i className={`fa-solid ${isOpen ? 'fa-minus' : 'fa-plus'}`}></i>
                </div>
            </button>
            <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}
            >
                <div className="p-6 border-t border-blue-200 bg-white grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const PeiFormView = (props) => {
    const { editingPeiId, onSaveSuccess } = props;
    const { isThinkingModeEnabled, toggleThinkingMode } = useAppStore(); // Access store logic
    const [currentPeiId, setCurrentPeiId] = useState(editingPeiId);
    const [peiData, setPeiData] = useState<PeiData>({});
    const [loadingStates, setLoadingStates] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', content: null, footer: null });
    
    const [isGeneratingFullPei, setIsGeneratingFullPei] = useState(false);
    const [isFullPeiModalOpen, setIsFullPeiModalOpen] = useState(false);
    const [fullPeiContent, setFullPeiContent] = useState('');

    const [aiGeneratedFields, setAiGeneratedFields] = useState(new Set<string>());
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editModalData, setEditModalData] = useState(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [refinementInstruction, setRefinementInstruction] = useState('');
    const [isRefinementInputVisible, setIsRefinementInputVisible] = useState(false);
    const [smartAnalysisResults, setSmartAnalysisResults] = useState({});
    const [goalActivities, setGoalActivities] = useState({});
    const [openSmartAnalysis, setOpenSmartAnalysis] = useState({});
    const [errors, setErrors] = useState({});
    const [autoSaveStatus, setAutoSaveStatus] = useState('ocioso'); // 'ocioso', 'salvando', 'salvo'
    const [isAnalyzingPei, setIsAnalyzingPei] = useState(false);
    const [isSmartAnalysisModalOpen, setIsSmartAnalysisModalOpen] = useState(false);
    const [smartAnalysisData, setSmartAnalysisData] = useState(null);
    const [openAccordionSection, setOpenAccordionSection] = useState<number | null>(0);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [approvalModalData, setApprovalModalData] = useState({
        isOpen: false,
        fieldId: '',
        label: '',
        content: '',
        isAppending: false
    });

    const circleColors = [
        'bg-red-500', 
        'bg-orange-500', 
        'bg-amber-500', 
        'bg-yellow-400', 
        'bg-lime-500', 
        'bg-green-500', 
        'bg-emerald-500', 
        'bg-teal-500'
    ];

    const handleAccordionToggle = (index: number) => {
        setOpenAccordionSection(prevIndex => (prevIndex === index ? null : index));
    };

    // Auto-save logic
    const autoSaveDataRef = useRef({ peiData, aiGeneratedFields, smartAnalysisResults, goalActivities, currentPeiId });

    useEffect(() => {
        autoSaveDataRef.current = { peiData, aiGeneratedFields, smartAnalysisResults, goalActivities, currentPeiId };
    }, [peiData, aiGeneratedFields, smartAnalysisResults, goalActivities, currentPeiId]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const {
                peiData: currentPeiData,
                aiGeneratedFields: currentAiFields,
                smartAnalysisResults: currentSmartResults,
                goalActivities: currentGoalActivities,
                currentPeiId: currentId,
            } = autoSaveDataRef.current;
            
            const studentName = currentPeiData['aluno-nome']?.trim();

            if (studentName) {
                setAutoSaveStatus('salvando');
                const recordData: NewPeiRecordData = {
                    data: currentPeiData,
                    aiGeneratedFields: Array.from(currentAiFields),
                    smartAnalysisResults: currentSmartResults,
                    goalActivities: currentGoalActivities,
                };
                
                const savedRecord = savePei(recordData, currentId, studentName);
                
                if (!currentId && savedRecord.id) {
                    setCurrentPeiId(savedRecord.id);
                }

                setTimeout(() => {
                    setAutoSaveStatus('salvo');
                    setTimeout(() => setAutoSaveStatus('ocioso'), 2000);
                }, 500);
            }
        }, 5000); // 5 seconds

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (editingPeiId) {
            const peiToLoad = getPeiById(editingPeiId);
            if (peiToLoad) {
                setCurrentPeiId(peiToLoad.id);
                setPeiData(peiToLoad.data);
                setAiGeneratedFields(new Set(peiToLoad.aiGeneratedFields || []));
                setSmartAnalysisResults(peiToLoad.smartAnalysisResults || {});
                setGoalActivities(peiToLoad.goalActivities || {});
                setOpenSmartAnalysis({});
            }
        } else {
            handleClearForm();
        }
    }, [editingPeiId]);


    const areRequiredFieldsFilled = useMemo(() => {
        return requiredFields.every(fieldId => peiData[fieldId]?.trim());
    }, [peiData]);

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;
        for (const fieldId of requiredFields) {
            if (!peiData[fieldId]?.trim()) {
                newErrors[fieldId] = 'Este campo é obrigatório.';
                isValid = false;
            }
        }
        setErrors(newErrors);
        if (!isValid) {
            const firstErrorField = document.getElementById(Object.keys(newErrors)[0]);
            firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setOpenAccordionSection(0);
            alert('Por favor, preencha todos os campos obrigatórios destacados.');
        }
        return isValid;
    };

    const handleInputChange = useCallback((e) => {
        const { id, value } = e.target;
        setPeiData(prev => ({ ...prev, [id]: value }));
        if (errors[id]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    }, [errors]);

    const handleTextAreaChange = useCallback((id, value) => {
        setPeiData(prev => ({ ...prev, [id]: value }));
        setAiGeneratedFields(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        if (errors[id]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    }, [errors]);
    
    const buildRagParts = (): Part[] => {
        const allRagFiles = getAllRagFiles();
        const selectedFiles = allRagFiles.filter(f => f.selected);
        const parts: Part[] = [];

        selectedFiles.forEach(file => {
            if (file.type === 'text') {
                parts.push({ text: `\n\n--- INÍCIO DO FICHEIRO DE APOIO: ${file.name} ---\n\n${file.content}\n\n--- FIM DO FICHEIRO DE APOIO: ${file.name} ---\n\n` });
            } else if (file.type === 'image') {
                parts.push({ text: `A imagem a seguir, intitulada "${file.name}", serve como contexto visual:` });
                parts.push({
                    inlineData: {
                        mimeType: file.mimeType,
                        data: file.content // which is base64 string
                    }
                });
            }
        });
        return parts;
    };

    const buildFormContextAsText = (fieldIdToExclude: string): string => {
        let rawFormContent = fieldOrderForPreview
            .flatMap(section => section.fields)
            .map(field => {
                const value = peiData[field.id];
                return value && field.id !== fieldIdToExclude ? `${field.label}: ${value}` : null;
            })
            .filter(Boolean)
            .join('\n');
        return rawFormContent;
    };

    const handleActionClick = async (fieldId, action) => {
        if ((action === 'ai' || action === 'suggest-needs' || action === 'suggest-adaptations') && !areRequiredFieldsFilled) {
            validateForm();
            return;
        }

        setLoadingStates(prev => ({ ...prev, [`${fieldId}-${action}`]: true }));
        try {
            let response = '';
            
            switch (action) {
                case 'ai': {
                    const fieldLabelAi = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
                    const formContext = buildFormContextAsText(fieldId);
                    
                    const aiInstruction = { text: `Aja como um especialista em educação inclusiva. Sua tarefa é preencher o campo "${fieldLabelAi}" de um PEI.
                    
Para garantir coesão e coerência, analise CUIDADOSAMENTE os campos já preenchidos do PEI (e arquivos de apoio se houver) antes de gerar sua resposta.

--- INÍCIO DO CONTEXTO DO PEI ATUAL ---
${formContext}
--- FIM DO CONTEXTO DO PEI ATUAL ---
                        
Agora, com base no contexto, gere o conteúdo para o campo: "${fieldLabelAi}".
Sua resposta deve ser apenas o texto para este campo, sem introduções ou títulos.` };

                    const ragParts = buildRagParts();
                    const aiParts: Part[] = [aiInstruction, ...ragParts];
                    response = await callGenerativeAI(aiParts);
                    
                    setApprovalModalData({
                        isOpen: true,
                        fieldId: fieldId,
                        label: fieldLabelAi,
                        content: response,
                        isAppending: false
                    });
                    break;
                }
                
                case 'suggest-needs': {
                    const diagnosisTextForNeeds = peiData['id-diagnostico'] || '';
                    const skillsTextForNeeds = peiData['aval-habilidades'] || 'Não informado';
                    const ragPartsForNeeds = buildRagParts();
                    const formContextForNeeds = buildFormContextAsText(fieldId);
                    
                    const suggestNeedsInstruction = { text: `
                        Aja como um psicopedogo especialista.
                        Com base no diagnóstico, nas habilidades do aluno e nos ficheiros de apoio, sugira uma lista de necessidades educacionais específicas a serem abordadas no PEI.

                        Contexto do Aluno:
                        ---
                        Diagnóstico e/ou Descrição Atual: ${diagnosisTextForNeeds}
                        Habilidades Acadêmicas Atuais: ${skillsTextForNeeds}
                        ---
                        Contexto do PEI:
                        ---
                        ${formContextForNeeds}
                        ---

                        Liste as necessidades específicas.
                        Sua resposta deve ser uma lista de itens, cada um em uma nova linha, começando com um hífen (-).
                        Exemplo:
                        - Apoio visual para instruções
                        - Tempo extra para avaliações
                        - Mediação em interações sociais

                        Gere apenas a lista, sem introduções ou conclusões.
                    `};
                    const suggestNeedsParts: Part[] = [suggestNeedsInstruction, ...ragPartsForNeeds];
                    response = await callGenerativeAI(suggestNeedsParts);
                    
                    const fieldLabel = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
                    
                    setApprovalModalData({
                        isOpen: true,
                        fieldId: fieldId,
                        label: fieldLabel,
                        content: response,
                        isAppending: true,
                    });
                    break;
                }

                case 'suggest-adaptations': {
                    const diagnosisForAdapt = peiData['id-diagnostico'] || 'Não informado';
                    const ragPartsForAdapt = buildRagParts();
                    const formContextForAdapt = buildFormContextAsText(fieldId);

                    const suggestAdaptationsInstruction = { text: `
                        Aja como um especialista em educação inclusiva e psicopedagogia.
                        Com base no diagnóstico, necessidades, metas do aluno e ficheiros de apoio, sugira uma lista detalhada de adaptações curriculares.

                        Contexto do Aluno:
                        ---
                        Diagnóstico e Necessidades Específicas: ${diagnosisForAdapt}
                        ---
                        Contexto do PEI:
                        ---
                        ${formContextForAdapt}
                        ---

                        Forneça sugestões práticas para adaptações em:
                        1.  **Materiais:** (ex: textos com fontes maiores, uso de audiolivros)
                        2.  **Atividades:** (ex: instruções segmentadas, tempo extra)
                        3.  **Avaliações:** (ex: provas orais, questões de múltipla escolha)
                        4.  **Ambiente:** (ex: sentar próximo ao professor, reduzir estímulos visuais)

                        Gere uma lista bem estruturada e formatada com clareza.
                        Sua resposta deve ser apenas a lista, sem introduções ou conclusões.
                    `};
                    const suggestAdaptationsParts: Part[] = [suggestAdaptationsInstruction, ...ragPartsForAdapt];
                    response = await callGenerativeAI(suggestAdaptationsParts);
                    
                    const adaptationsFieldLabel = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
                    
                    setApprovalModalData({
                        isOpen: true,
                        fieldId: fieldId,
                        label: adaptationsFieldLabel,
                        content: response,
                        isAppending: true,
                    });
                    break;
                }

                case 'smart': {
                    const goalText = peiData[fieldId] || '';
                    if (!goalText) {
                        alert('Por favor, preencha o campo da meta antes de solicitar la análise SMART.');
                        setLoadingStates(prev => ({ ...prev, [`${fieldId}-${action}`]: false }));
                        return;
                    }
                    const smartPrompt = `Analise a seguinte meta de um PEI com base nos critérios SMART (Específica, Mensurável, Atingível, Relevante, Temporal). Forneça uma crítica construtiva e uma sugestão de melhoria para cada critério.
    
Meta para Análise: "${goalText}"

Sua resposta DEVE ser um objeto JSON válido, sem nenhum texto adicional antes ou depois. Use a seguinte estrutura:
{
  "isSpecific": { "critique": "...", "suggestion": "..." },
  "isMeasurable": { "critique": "...", "suggestion": "..." },
  "isAchievable": { "critique": "...", "suggestion": "..." },
  "isRelevant": { "critique": "...", "suggestion": "..." },
  "isTimeBound": { "critique": "...", "suggestion": "..." }
}`;
                    response = await callGenerativeAI(smartPrompt);
                    try {
                        const startIndex = response.indexOf('{');
                        const endIndex = response.lastIndexOf('}');
                        if (startIndex === -1 || endIndex === -1) {
                            throw new Error("Valid JSON object not found in response.");
                        }
                        const jsonString = response.substring(startIndex, endIndex + 1);
                        const analysis = JSON.parse(jsonString);
                        setSmartAnalysisResults(prev => ({ ...prev, [fieldId]: analysis }));
                        setOpenSmartAnalysis(prev => ({ ...prev, [fieldId]: true }));
                    } catch (e) {
                        console.error("Failed to parse SMART analysis JSON:", e, "Raw response:", response);
                        alert("A API retornou uma resposta em um formato inesperado para la análise SMART. Por favor, tente novamente.");
                    }
                    break;
                }
    
                case 'suggest': {
                    const isDuaField = fieldId === 'dua-content';
                    const isGoalField = ['metas-curto', 'metas-medio', 'metas-longo'].includes(fieldId);

                    let promptContextText = '';
                    let promptSubject = '';
                    
                    if (isGoalField) {
                        const goalTextForSuggest = peiData[fieldId] || '';
                        if (!goalTextForSuggest.trim()) {
                            alert('Por favor, preencha o campo da meta antes de solicitar sugestões de atividades.');
                            setLoadingStates(prev => ({ ...prev, [`${fieldId}-${action}`]: false }));
                            return;
                        }
                        promptContextText = `Meta: "${goalTextForSuggest}"`;
                        promptSubject = `na seguinte meta de um PEI`;
                    } else {
                        if (!areRequiredFieldsFilled) {
                            validateForm();
                            setLoadingStates(prev => ({ ...prev, [`${fieldId}-${action}`]: false }));
                            return;
                        }
                        promptContextText = `--- INÍCIO DO CONTEXTO DO PEI ATUAL ---\n\n${buildFormContextAsText(fieldId)}\n--- FIM DO CONTEXTO DO PEI ATUAL ---`;
                        promptSubject = 'no contexto completo do PEI fornecido';
                    }

                    const duaInstruction = isDuaField ? 'Com base nos princípios do Desenho Universal para a Aprendizagem (DUA) e' : 'Com base';
                    const ragPartsForSuggest = buildRagParts();

                    const structureExample = isDuaField
                        ? `[
  {
    "title": "...",
    "description": "...",
    "discipline": "...",
    "skills": ["...", "..."],
    "needs": ["...", "..."],
    "goalTags": ["DUA"],
    "isDUA": true
  }
]`
                        : `[
  {
    "title": "...",
    "description": "...",
    "discipline": "...",
    "skills": ["...", "..."],
    "needs": ["...", "..."],
    "goalTags": ["..."]
  }
]`;

                    const suggestInstruction = { text: `${duaInstruction} ${promptSubject}, sugira 3 a 5 atividades educacionais adaptadas.
                    
Contexto Adicional:
${promptContextText}

Sua resposta DEVE ser um array de objetos JSON válido, sem nenhum texto adicional antes ou depois. Use a seguinte estrutura:
${structureExample}`};
                    
                    const suggestParts: Part[] = [suggestInstruction, ...ragPartsForSuggest];
                    response = await callGenerativeAI(suggestParts);

                    try {
                        const startIndex = response.indexOf('[');
                        const endIndex = response.lastIndexOf(']');
                        if (startIndex === -1 || endIndex === -1) {
                            throw new Error("Valid JSON array not found in response.");
                        }
                        const jsonString = response.substring(startIndex, endIndex + 1);
                        let activities = JSON.parse(jsonString);

                        if (!Array.isArray(activities)) {
                            throw new Error("Response is not an array.");
                        }

                        const goalTypeMap = {
                            'metas-curto': 'Curto Prazo',
                            'metas-medio': 'Médio Prazo',
                            'metas-longo': 'Longo Prazo'
                        };
                        const goalTag = goalTypeMap[fieldId];

                        activities = activities.map(act => {
                            const newTags = new Set(Array.isArray(act.goalTags) ? act.goalTags : []);
                            let isNowDUA = act.isDUA || false;

                            if (isDuaField) {
                                newTags.add('DUA');
                                isNowDUA = true;
                            }
                            if (goalTag) {
                                newTags.add(goalTag);
                            }
                            
                            return {
                                ...act,
                                isDUA: isNowDUA,
                                goalTags: Array.from(newTags)
                            };
                        });
                        
                        if (isGoalField || isDuaField) {
                            setGoalActivities(prev => ({ ...prev, [fieldId]: activities }));
                        }

                        const handleSaveActivities = () => {
                            addActivitiesToBank(activities, currentPeiId);
                            alert(`${activities.length} atividades foram salvas com sucesso no Banco de Atividades!`);
                            setIsModalOpen(false);
                        };
                        
                        const fieldLabelSuggest = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
                        
                        setModalContent({
                            title: `Atividades Sugeridas para "${fieldLabelSuggest}"`,
                            content: renderSuggestedActivities(activities),
                            footer: (
                                <>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                                        Fechar
                                    </button>
                                    <button type="button" onClick={handleSaveActivities} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2">
                                        <i className="fa-solid fa-plus"></i> Adicionar ao Banco
                                    </button>
                                </>
                            )
                        });
                        setIsModalOpen(true);
                    } catch(e) {
                        console.error("Failed to parse suggested activities JSON:", e, "Raw response:", response);
                        alert("A API retornou uma resposta em um formato inesperado para as sugestões de atividades. Por favor, tente novamente.");
                    }
                    break;
                }
            }
    
        } catch (error) {
            console.error(`Error during '${action}' action for '${fieldId}':`, error);
            const errorMessage = error instanceof Error ? error.message : "Verifique o console para mais detalhes.";
            alert(`Ocorreu um erro ao executar a ação de IA. ${errorMessage}`);
        } finally {
            setLoadingStates(prev => ({ ...prev, [`${fieldId}-${action}`]: false }));
        }
    };

    const handleGenerateFullPei = async () => {
        if (!validateForm()) {
            return;
        }

        setIsGeneratingFullPei(true);
        setFullPeiContent('');

        try {
            const ragParts = buildRagParts();
            const formContext = buildFormContextAsText('');

            const instruction = { text: `
                Aja como um especialista em educação especial e psicopedagogia.
                Com base nos dados de ficheiros de apoio e do formulário, elabore um Plano Educacional Individualizado (PEI) completo, coeso e profissional.
                O documento final deve ser bem estruturado, com parágrafos claros e uma linguagem técnica, mas compreensível.
                Conecte as diferentes seções de forma lógica (ex: as metas devem refletir o diagnóstico e a avaliação, e as atividades devem estar alinhadas às metas).
                Se houver campos não preenchidos, use seu conhecimento para fazer inferências razoáveis.
                O tom deve ser formal e respeitoso.

                Contexto do PEI:
                ---
                ${formContext}
                ---

                Elabore o PEI completo a seguir.
            `};
            
            const fullPeiParts: Part[] = [instruction, ...ragParts];
            const response = await callGenerativeAI(fullPeiParts);
            setFullPeiContent(response);
            setIsFullPeiModalOpen(true);

        } catch (error) {
            console.error('Error generating full PEI:', error);
            alert('Ocorreu um erro ao gerar o PEI completo. Tente novamente.');
        } finally {
            setIsGeneratingFullPei(false);
        }
    };
    
    const handleIntelligentAnalysis = async () => {
        if (!validateForm()) {
            return;
        }
        setIsAnalyzingPei(true);
        setSmartAnalysisData(null);
        try {
            const ragParts = buildRagParts();
            const formContext = buildFormContextAsText('');
            const instruction = { text: `
Aja como uma equipe multidisciplinar de especialistas em educação composta por um pedagogo e um psicopedogo.
Sua tarefa é realizar uma análise completa e aprofundada do seguinte Plano Educacional Individualizado (PEI).

Analise o PEI fornecido e retorne um objeto JSON válido, sem nenhum texto ou formatação adicional antes ou depois. A estrutura do JSON deve ser a seguinte:

{
  "strengths": ["Liste aqui os pontos fortes do PEI, como a clareza das metas, a adequação das estratégias, etc."],
  "weaknesses": ["Liste aqui os pontos fracos ou áreas que precisam de mais detalhes, como metas vagas, falta de estratégias específicas, etc."],
  "goalAnalysis": "Forneça uma análise detalhada das metas (curto, médio, longo prazo), avaliando se são SMART (Específica, Mensuráveis, Atingíveis, Relevantes, Temporais) e se estão alinhadas com o perfil do aluno.",
  "pedagogicalAnalysis": "Do ponto de vista pedagógico, analise as estratégias, adaptações curriculares e metodologias. Elas são adequadas para as necessidades do aluno? Estão alinhadas com as boas práticas de educação inclusiva?",
  "psychopedagogicalAnalysis": "Do ponto de vista psicopedagogico, analise a coerência entre o diagnóstico, a avaliação inicial e as propostas de intervenção. O plano considera os aspectos cognitivos, sociais e emocionais do aluno de forma integrada?",
  "suggestions": ["Liste sugestões práticas e acionáveis para melhorar o PEI, abordando os pontos fracos identificados. Seja específico nas suas recomendações."]
}

Certifique-se de que sua análise seja construtiva, profissional e baseada em evidências do próprio PEI.`};
            
            const analysisParts: Part[] = [instruction, { text: `Contexto do PEI:\n---\n${formContext}\n---` }, ...ragParts];
            const response = await callGenerativeAI(analysisParts);
             try {
                const startIndex = response.indexOf('{');
                const endIndex = response.lastIndexOf('}');
                if (startIndex === -1 || endIndex === -1) {
                    throw new Error("Objeto JSON válido não encontrado na resposta.");
                }
                const jsonString = response.substring(startIndex, endIndex + 1);
                const analysis = JSON.parse(jsonString);
                setSmartAnalysisData(analysis);
                setIsSmartAnalysisModalOpen(true);
            } catch (e) {
                console.error("Falha ao analisar JSON da Análise Inteligente:", e, "Resposta bruta:", response);
                alert("A API retornou uma resposta em um formato inesperado para a análise. Por favor, tente novamente.");
            }
        } catch (error) {
            console.error('Erro ao gerar Análise Inteligente:', error);
            alert('Ocorreu um erro ao gerar a análise. Tente novamente.');
        } finally {
            setIsAnalyzingPei(false);
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditModalData(null);
        setRefinementInstruction('');
        setIsRefinementInputVisible(false);
    };

    const handleApproveSuggestion = () => {
        const { fieldId, content, isAppending } = approvalModalData;
        if (isAppending) {
            const existingText = peiData[fieldId] || '';
            const newText = `${existingText}\n\n--- Sugestões Aprovadas ---\n${content}`.trim();
            setPeiData(prev => ({ ...prev, [fieldId]: newText }));
        } else {
            setPeiData(prev => ({ ...prev, [fieldId]: content }));
        }
        setAiGeneratedFields(prev => new Set(prev).add(fieldId));
        setApprovalModalData({ isOpen: false, fieldId: '', label: '', content: '', isAppending: false });
    };

    const handleEditModalRegenerate = async () => {
        if (!editModalData) return;
        setIsRegenerating(true);
        try {
            const { fieldId, label, text } = editModalData;
            const instruction = refinementInstruction || 'Por favor, refine e aprimore este texto.';
            const ragParts = buildRagParts();
            const formContext = buildFormContextAsText(fieldId);

            const instructionPart: Part = { text: `Aja como um especialista em educação. O usuário está editando o campo "${label}" de um PEI.
            
            Texto Atual:
            ---
            ${text}
            ---

            O usuário forneceu a seguinte instrução para refinar o texto: "${instruction}".

            Considere também o seguinte contexto de documentos de apoio e do restante do PEI para manter a coerência.
            
            Contexto do PEI:
            ---
            ${formContext}
            ---
            
            Refine o texto atual com base na instrução e no contexto. Mantenha o propósito original, mas aprimore a clareza e a estrutura. Devolva apenas o texto aprimorado.`};

            const regenerateParts: Part[] = [instructionPart, ...ragParts];
            const response = await callGenerativeAI(regenerateParts);
            setEditModalData(prev => prev ? { ...prev, text: response } : null);
            setAiGeneratedFields(prev => new Set(prev).add(fieldId));
        } catch (error) {
            console.error('Error during regeneration:', error);
            alert('Ocorreu um erro ao refinar o conteúdo.');
        } finally {
            setIsRegenerating(false);
            setIsRefinementInputVisible(false);
            setRefinementInstruction('');
        }
    };

    const handleEditModalSave = () => {
        if (editModalData) {
            setPeiData(prev => ({ ...prev, [editModalData.fieldId]: editModalData.text }));
        }
        closeEditModal();
    };
    
    const handleClearForm = useCallback(() => {
        setPeiData({});
        setAiGeneratedFields(new Set<string>());
        setSmartAnalysisResults({});
        setGoalActivities({});
        setOpenSmartAnalysis({});
        setErrors({});
        setCurrentPeiId(null);
    }, []);

    const handleSavePei = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        const recordData: NewPeiRecordData = {
            data: peiData,
            aiGeneratedFields: Array.from(aiGeneratedFields),
            smartAnalysisResults: smartAnalysisResults,
            goalActivities: goalActivities,
        };

        const studentName = peiData['aluno-nome'] || 'PEI sem nome';
        const savedRecord = savePei(recordData, currentPeiId, studentName);
        setCurrentPeiId(savedRecord.id);
        
        alert('PEI salvo com sucesso!');
        onSaveSuccess();
    };

    const handleShareApp = async () => {
        const shareData = {
            title: 'Assistente PEI com IA',
            text: 'Crie Planos Educacionais Individualizados com a ajuda da IA!',
            url: 'https://editorpei.netlify.app/',
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                alert('Link da aplicação copiado para a área de transferência!');
            }
        } catch (err) {
            console.error('Erro ao compartilhar:', err);
            if (err.name !== 'AbortError') {
                alert('Não foi possível compartilhar a aplicação.');
            }
        }
    };

    const renderSmartAnalysis = (analysis: Record<string, {critique: string; suggestion: string}>) => {
        const criteriaMap = {
            isSpecific: "Específica (Specific)", isMeasurable: "Mensurável (Measurable)",
            isAchievable: "Atingível (Achievable)", isRelevant: "Relevante (Relevant)", isTimeBound: "Temporal (Time-Bound)",
        };
        return (
            <div className="space-y-4 text-sm">
                {Object.entries(analysis).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800">{criteriaMap[key]}</h4>
                        <p className="text-gray-600 mt-1"><span className="font-medium">Crítica:</span> {value.critique}</p>
                        <p className="text-green-700 mt-1"><span className="font-medium">Sugestão:</span> {value.suggestion}</p>
                    </div>
                ))}
            </div>
        );
    };
    
    const renderSuggestedActivities = (activities) => {
        return (
            <div className="space-y-3">
                {activities.map((activity, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        <h4 className="font-semibold text-gray-800">{activity.title}</h4>
                        <p className="text-gray-600 mt-1">{activity.description}</p>
                        <div className="mt-2 text-xs flex flex-wrap gap-x-4">
                            <p><span className="font-medium">Disciplina:</span> {activity.discipline}</p>
                            <p><span className="font-medium">Habilidades:</span> {Array.isArray(activity.skills) ? activity.skills.join(', ') : ''}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderIntelligentAnalysisContent = () => {
        if (!smartAnalysisData) return null;
    
        const AnalysisSection = ({ icon, title, content, colorClass = 'indigo' }) => {
            const isList = Array.isArray(content);
            const iconMap = {
                'strengths': 'fa-check-circle',
                'weaknesses': 'fa-exclamation-triangle',
                'goalAnalysis': 'fa-bullseye',
                'pedagogicalAnalysis': 'fa-chalkboard-teacher',
                'psychopedagogicalAnalysis': 'fa-brain',
                'suggestions': 'fa-lightbulb'
            };
            const colorMap = {
                'strengths': { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
                'weaknesses': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
                'suggestions': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
                'default': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' }
            };
            const colors = colorMap[colorClass] || colorMap['default'];
    
            return (
                <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
                    <h4 className={`text-md font-bold ${colors.text} flex items-center gap-2 mb-2`}>
                        <i className={`fa-solid ${iconMap[icon]}`}></i>
                        {title}
                    </h4>
                    {isList ? (
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {content.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-700 leading-relaxed">{content}</p>
                    )}
                </div>
            );
        };
    
        return (
            <div className="space-y-4">
                <AnalysisSection icon="strengths" title="Pontos Fortes" content={smartAnalysisData.strengths} colorClass="strengths" />
                <AnalysisSection icon="weaknesses" title="Pontos a Melhorar" content={smartAnalysisData.weaknesses} colorClass="weaknesses" />
                <AnalysisSection icon="goalAnalysis" title="Análise de Metas" content={smartAnalysisData.goalAnalysis} colorClass="default" />
                <AnalysisSection icon="pedagogicalAnalysis" title="Análise Pedagógica" content={smartAnalysisData.pedagogicalAnalysis} colorClass="default" />
                <AnalysisSection icon="psychopedagogicalAnalysis" title="Análise Psicopedagógica" content={smartAnalysisData.psychopedagogicalAnalysis} colorClass="default" />
                <AnalysisSection icon="suggestions" title="Sugestões de Melhorias" content={smartAnalysisData.suggestions} colorClass="suggestions" />
            </div>
        );
    };

    const handleEditClick = (fieldId) => {
        const fieldLabel = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
        setEditModalData({
            fieldId,
            label: fieldLabel,
            text: peiData[fieldId] || '',
        });
        setIsEditModalOpen(true);
    };
    
    const handleViewGoalActivities = (fieldId: string) => {
        const activities = goalActivities[fieldId];
        if (!activities || activities.length === 0) return;

        const fieldLabel = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';

        setModalContent({
            title: `Atividades para a Meta: "${fieldLabel}"`,
            content: renderSuggestedActivities(activities),
            footer: (
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                    Fechar
                </button>
            )
        });
        setIsModalOpen(true);
    };

    const renderField = (field) => {
        const { id, label } = field;
        const hasError = !!errors[id];
        const helpText = helpTexts[id];
        const isAiGenerated = aiGeneratedFields.has(id);
        const textAreaFields = [
            'id-diagnostico', 'id-contexto', 'aval-habilidades', 'aval-social', 'aval-coord',
            'metas-curto', 'metas-medio', 'metas-longo', 'est-adaptacoes', 'est-metodologias',
            'est-parcerias', 'resp-regente', 'resp-coord', 'resp-familia', 'resp-apoio',
            'revisao', 'revisao-ajustes', 'atividades-content', 'dua-content',
            'conteudos-bimestre', 'restricoes-evitar'
        ];

        const goalFields = ['metas-curto', 'metas-medio', 'metas-longo'];
        const activitySuggestionFields = ['atividades-content', 'dua-content'];

        if (textAreaFields.includes(id)) {
            const isGoal = goalFields.includes(id);
            const canSuggestActivities = isGoal || activitySuggestionFields.includes(id);
            const isDiagnosisField = id === 'id-diagnostico';
            const isAdaptationsField = id === 'est-adaptacoes';

            return (
                <div key={id} className="md:col-span-2">
                    <TextAreaWithActions
                        id={id}
                        label={label}
                        value={peiData[id] || ''}
                        onChange={(value) => handleTextAreaChange(id, value)}
                        onAiClick={() => handleActionClick(id, 'ai')}
                        onSmartClick={isGoal ? () => handleActionClick(id, 'smart') : undefined}
                        onSuggestClick={canSuggestActivities ? () => handleActionClick(id, 'suggest') : undefined}
                        onSuggestNeedsClick={isDiagnosisField ? () => handleActionClick(id, 'suggest-needs') : undefined}
                        onSuggestAdaptationsClick={isAdaptationsField ? () => handleActionClick(id, 'suggest-adaptations') : undefined}
                        onEditClick={() => handleEditClick(id)}
                        isAiLoading={loadingStates[`${id}-ai`]}
                        isSmartLoading={loadingStates[`${id}-smart`]}
                        isSuggestLoading={loadingStates[`${id}-suggest`]}
                        isSuggestNeedsLoading={loadingStates[`${id}-suggest-needs`]}
                        isSuggestAdaptationsLoading={loadingStates[`${id}-suggest-adaptations`]}
                        isGoal={canSuggestActivities}
                        placeholder={`Descreva sobre "${label}" aqui...`}
                        rows={isGoal ? 6 : 5}
                        helpText={helpText}
                        error={errors[id]}
                        isAiActionDisabled={!areRequiredFieldsFilled}
                        isAiGenerated={isAiGenerated}
                    />
                    {isGoal && goalActivities[id] && goalActivities[id].length > 0 && (
                         <button
                            type="button"
                            onClick={() => handleViewGoalActivities(id)}
                            className="mt-2 px-4 py-2 text-sm font-medium text-blue-800 bg-blue-100 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                        >
                            <i className="fa-solid fa-list-check"></i>
                            Ver Atividades para a Meta
                        </button>
                    )}
                    {goalFields.includes(id) && smartAnalysisResults[id] && (
                        <div className="mt-2 border border-gray-200 rounded-lg shadow-sm">
                            <button
                                type="button"
                                onClick={() => setOpenSmartAnalysis(prev => ({ ...prev, [id]: !prev[id] }))}
                                className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                aria-expanded={!!openSmartAnalysis[id]}
                                aria-controls={`smart-analysis-${id}`}
                            >
                                <span className="font-medium text-sm text-indigo-700">Resultado da Análise SMART</span>
                                <i className={`fa-solid fa-chevron-down text-gray-500 transition-transform duration-200 ${openSmartAnalysis[id] ? 'rotate-180' : ''}`}></i>
                            </button>
                            {openSmartAnalysis[id] && (
                                <div id={`smart-analysis-${id}`} className="p-4 border-t border-gray-200 bg-white rounded-b-lg max-h-60 overflow-y-auto">
                                    {renderSmartAnalysis(smartAnalysisResults[id])}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        const renderLabelWithHelp = () => (
            <div className="flex items-center mb-1">
                <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
                 {isAiGenerated && (
                    <div className="relative group ml-2">
                        <i className="fa-solid fa-wand-magic-sparkles text-indigo-500 text-xs"></i>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                            Conteúdo gerado por IA
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></div>
                        </div>
                    </div>
                )}
                {helpText && (
                  <div className="relative group ml-2">
                    <i className="fa-regular fa-circle-question text-gray-400 cursor-help"></i>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 transform">
                      {helpText}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></div>
                    </div>
                  </div>
                )}
            </div>
        );

        if (id === 'disciplina') {
            return (
                 <div key={id}>
                    {renderLabelWithHelp()}
                    <select
                        id={id}
                        value={peiData[id] || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2.5 border rounded-lg bg-gray-50 transition-all duration-200 focus:outline-none
                            ${hasError 
                                ? 'border-red-500 focus:ring-2 focus:ring-red-300 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500'
                            }`}
                    >
                        <option value="">Selecione uma disciplina...</option>
                        {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {hasError && <p className="text-red-600 text-xs mt-1">{errors[id]}</p>}
                </div>
            );
        }

        const inputType = id.includes('-nasc') || id.includes('-data-elab') || id.includes('-data') ? 'date' : 'text';
        
        return (
            <div key={id}>
                {renderLabelWithHelp()}
                <input
                    type={inputType}
                    id={id}
                    value={peiData[id] || ''}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 border rounded-lg bg-gray-50 transition-all duration-200 focus:outline-none appearance-none min-w-0
                        ${hasError 
                            ? 'border-red-500 focus:ring-2 focus:ring-red-300 focus:border-red-500' 
                            : 'border-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500'
                        }`}
                />
                {hasError && <p className="text-red-600 text-xs mt-1">{errors[id]}</p>}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto">
            <Modal
                id="ai-results-modal"
                title={modalContent.title}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                footer={modalContent.footer}
                wide
            >
                {modalContent.content}
            </Modal>
            
             <Modal
                id="approval-modal"
                title={`Aprovar Sugestão da IA: ${approvalModalData.label}`}
                isOpen={approvalModalData.isOpen}
                onClose={() => setApprovalModalData({ ...approvalModalData, isOpen: false })}
                footer={<>
                    <button
                        type="button"
                        onClick={() => setApprovalModalData({ ...approvalModalData, isOpen: false })}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                    >
                        Rejeitar
                    </button>
                    <button
                        type="button"
                        onClick={handleApproveSuggestion}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                        Aprovar e Utilizar Texto
                    </button>
                </>}
                wide
            >
                <p className="text-sm text-gray-600 mb-2">
                    A sugestão abaixo foi gerada pela IA. Você pode editá-la diretamente no campo abaixo antes de aprovar.
                </p>
                <textarea
                    value={approvalModalData.content}
                    onChange={(e) => setApprovalModalData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full h-64 p-2.5 border rounded-lg transition-all duration-200 bg-gray-50 text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                />
            </Modal>


            <Modal
                id="smart-analysis-modal"
                title="Análise Inteligente do PEI"
                isOpen={isSmartAnalysisModalOpen}
                onClose={() => setIsSmartAnalysisModalOpen(false)}
                footer={
                    <button
                        type="button"
                        onClick={() => setIsSmartAnalysisModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                        Fechar
                    </button>
                }
                wide
            >
                {renderIntelligentAnalysisContent()}
            </Modal>

            <Modal
                id="full-pei-modal"
                title="PEI Gerado por IA"
                isOpen={isFullPeiModalOpen}
                onClose={() => setIsFullPeiModalOpen(false)}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(fullPeiContent);
                                alert('Texto copiado para a área de transferência!');
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Copiar Texto
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFullPeiModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                            Fechar
                        </button>
                    </>
                }
                wide
            >
                <div className="prose max-w-none whitespace-pre-wrap font-serif text-gray-800 p-2 bg-gray-50 rounded-md">
                    {fullPeiContent}
                </div>
            </Modal>

            {/* Pré-visualização do PEI Modal */}
            <Modal
                id="preview-pei-modal"
                title="Pré-visualização do PEI"
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                wide
                footer={
                    <button
                        type="button"
                        onClick={() => setIsPreviewModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                        Fechar
                    </button>
                }
            >
                 <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">{peiData['aluno-nome'] || 'PEI sem nome'}</h2>
                    {fieldOrderForPreview.map((section, idx) => {
                         const hasData = section.fields.some(field => peiData[field.id]);
                         if (!hasData) return null;
                         
                         return (
                            <div key={idx} className="border-b border-gray-200 pb-4 mb-4 last:border-0">
                                <h3 className="text-lg font-semibold text-indigo-700 mb-3">{section.title}</h3>
                                <div className="space-y-3">
                                    {section.fields.map(field => {
                                        const value = peiData[field.id];
                                        if (!value) return null;
                                        return (
                                            <div key={field.id} className="bg-gray-50 p-3 rounded-md">
                                                <h4 className="font-medium text-gray-800 text-sm mb-1">{field.label}</h4>
                                                <div className="text-gray-600 text-sm whitespace-pre-wrap">{value}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {editModalData && (
                 <Modal
                    id="edit-ai-modal"
                    title={`Editar: ${editModalData.label}`}
                    isOpen={isEditModalOpen}
                    onClose={closeEditModal}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleEditModalSave}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                                Salvar Alterações
                            </button>
                        </>
                    }
                    wide
                >
                    <textarea
                        value={editModalData.text}
                        onChange={(e) => setEditModalData(prev => prev ? { ...prev, text: e.target.value } : null)}
                        className="w-full h-64 p-2.5 border rounded-lg transition-all duration-200 bg-gray-50 text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                        placeholder="Edite o conteúdo aqui..."
                    />
                    <div className="mt-4">
                        {!isRefinementInputVisible ? (
                             <button
                                type="button"
                                onClick={() => setIsRefinementInputVisible(true)}
                                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 flex items-center gap-2 transition-all duration-200 ease-in-out"
                            >
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                                Assim mas...
                            </button>
                        ) : (
                             <div className="space-y-2 p-4 border border-indigo-200 rounded-lg bg-indigo-50/50 animate-fade-in">
                                <label htmlFor="refinement-instruction" className="block text-sm font-medium text-gray-700">Instrução para Refinamento:</label>
                                <input
                                    type="text"
                                    id="refinement-instruction"
                                    value={refinementInstruction}
                                    onChange={(e) => setRefinementInstruction(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg bg-white text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                                    placeholder="Ex: 'Torne o texto mais formal', 'Adicione um exemplo prático', etc."
                                />
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsRefinementInputVisible(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleEditModalRegenerate} 
                                        disabled={isRegenerating}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2"
                                        style={{minWidth: '90px'}}
                                    >
                                        {isRegenerating ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            "Enviar"
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            <div className="text-center mb-8">
                {editingPeiId && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                        <button
                            type="button"
                            onClick={() => { /* Navigation handled by parent via props but kept for UI completeness */ }}
                            className="hover:text-indigo-600 hover:underline transition-colors flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            PEIs Salvos
                        </button>
                        <span className="text-gray-300">/</span>
                        <span className="font-medium text-gray-700 truncate max-w-xs">{peiData['aluno-nome'] || 'PEI Atual'}</span>
                    </div>
                )}
                <div className="flex items-center justify-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-800 tracking-tight">{editingPeiId ? 'Editando PEI' : 'Editor de PEI'}</h2>
                    <button
                        type="button"
                        onClick={handleShareApp}
                        className="text-gray-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                        title="Compartilhar Aplicação"
                    >
                        <i className="fa-solid fa-arrow-up-from-bracket text-xl"></i>
                    </button>
                </div>
                <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                    {editingPeiId ? `Você está editando o PEI de ${peiData['aluno-nome'] || 'aluno'}.` : 'Preencha os campos abaixo para criar um novo Plano Educacional Individualizado.'}
                </p>
            </div>

            <div id="ai-mode-toggle" className="mb-6">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                     <div 
                        className="relative group h-full"
                        onClick={() => isThinkingModeEnabled && toggleThinkingMode()}
                     >
                         <div
                            className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer h-full flex flex-col ${!isThinkingModeEnabled ? 'bg-amber-50 border-amber-400 shadow-lg' : 'bg-white border-gray-200 hover:border-amber-200'}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <i className={`fa-solid fa-bolt text-xl ${!isThinkingModeEnabled ? 'text-amber-500' : 'text-gray-400'}`}></i>
                                {!isThinkingModeEnabled && <i className="fa-solid fa-check text-amber-500 text-lg"></i>}
                            </div>
                            <div className="flex-grow">
                                <h4 className={`font-semibold ${!isThinkingModeEnabled ? 'text-gray-800' : 'text-gray-500'}`}>Respostas rápidas de IA</h4>
                            </div>
                        </div>
                        <div className="absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 text-center">
                            Gemini Flash: Rápido e eficiente para a maioria das tarefas.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                        </div>
                    </div>
                    
                    <div 
                        className="relative group h-full"
                        onClick={() => !isThinkingModeEnabled && toggleThinkingMode()}
                    >
                        <div
                            className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer h-full flex flex-col ${isThinkingModeEnabled ? 'bg-indigo-50 border-indigo-500 shadow-lg' : 'bg-white border-gray-200 hover:border-indigo-200'}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <i className={`fa-solid fa-brain text-xl ${isThinkingModeEnabled ? 'text-indigo-600' : 'text-gray-400'}`}></i>
                                {isThinkingModeEnabled && <i className="fa-solid fa-check text-indigo-600 text-lg"></i>}
                            </div>
                             <div className="flex-grow">
                                <h4 className={`font-semibold ${isThinkingModeEnabled ? 'text-gray-800' : 'text-gray-500'}`}>Modo Avançado (Thinking)</h4>
                            </div>
                        </div>
                         <div className="absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 text-center">
                            Gemini Thinking: Melhor raciocínio para tarefas complexas.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                        </div>
                    </div>
                </div>
            </div>


            <form onSubmit={handleSavePei} className="space-y-4">
                {fieldOrderForPreview.map((section, sectionIndex) => {
                    const totalFields = section.fields.length;
                    const filledFields = totalFields > 0
                        ? section.fields.filter(field => peiData[field.id]?.trim()).length
                        : 0;
                    const progress = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
                    
                    return (
                        <AccordionSection
                            key={sectionIndex}
                            title={section.title}
                            isOpen={openAccordionSection === sectionIndex}
                            onToggle={() => handleAccordionToggle(sectionIndex)}
                            color={circleColors[sectionIndex % circleColors.length]}
                            progress={progress}
                        >
                            {section.fields.map(field => renderField(field))}
                        </AccordionSection>
                    );
                })}

                <div className="bg-white p-6 rounded-xl shadow-md mt-6 border border-gray-200 grid grid-cols-2 gap-3 md:flex md:justify-end md:items-center md:flex-wrap md:gap-4">
                    <div className="col-span-2 text-center md:text-left md:mr-auto md:col-auto text-sm text-gray-500 italic pl-2 transition-opacity duration-500">
                        {autoSaveStatus === 'salvando' && (
                            <span className="flex items-center justify-center md:justify-start gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                Salvando...
                            </span>
                        )}
                        {autoSaveStatus === 'salvo' && (
                            <span className="flex items-center justify-center md:justify-start gap-2 text-green-600 font-medium">
                                <i className="fa-solid fa-check"></i>
                                Salvo automaticamente
                            </span>
                        )}
                    </div>
                    
                    <button
                        type="button"
                        onClick={handleIntelligentAnalysis}
                        disabled={isAnalyzingPei || !areRequiredFieldsFilled}
                        className="col-span-2 px-6 py-2.5 text-sm font-medium text-gray-800 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        title={!areRequiredFieldsFilled ? "Preencha os campos obrigatórios para habilitar" : "Executar análise completa do PEI"}
                    >
                        {isAnalyzingPei ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                Analisando...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-lightbulb"></i>
                                Análise Inteligente
                            </>
                        )}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={handleGenerateFullPei} 
                        disabled={isGeneratingFullPei || !areRequiredFieldsFilled}
                        className="col-span-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        title={!areRequiredFieldsFilled ? "Preencha os campos obrigatórios para habilitar" : "Gerar PEI completo com IA"}
                    >
                        {isGeneratingFullPei ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Gerando...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-file-invoice"></i>
                                Gerar PEI Completo com IA
                            </>
                        )}
                    </button>
                     <button
                        type="button"
                        onClick={() => setIsPreviewModalOpen(true)}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-eye"></i>
                        Pré-visualizar PEI
                    </button>
                    <button type="button" onClick={handleClearForm} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                        <i className="fa-solid fa-trash-can"></i>
                        Limpar Formulário
                    </button>
                    <button type="submit" className="col-span-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center justify-center gap-2">
                        <i className="fa-solid fa-floppy-disk"></i>
                        Salvar PEI
                    </button>
                </div>
            </form>
        </div>
    );
};