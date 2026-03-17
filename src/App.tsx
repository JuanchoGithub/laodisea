import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft, 
  BarChart3, 
  RotateCcw,
  GraduationCap,
  User,
  Baby,
  Loader2,
  Layout,
  FileText,
  Settings,
  Type,
  Sun,
  Moon,
  Coffee,
  Plus,
  Minus
} from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { Difficulty, Chapter, Question, Attempt, UserProgress, ReadingMode, ReaderSettings, Theme, Font, VocabularyItem } from './types';
import { CANTO_TITLES } from './constants';
import { getChapter, getChapterQuestions } from './services/odysseyService';
import { STATIC_VOCABULARY } from './data/vocabulary';

const CHAPTER_COUNT = 24;

const THEMES = {
  light: { 
    bg: 'bg-[#F5F2ED]', 
    card: 'bg-white', 
    text: 'text-[#1A1A1A]', 
    accent: 'text-[#5A5A40]',
    border: 'border-black/5'
  },
  sepia: { 
    bg: 'bg-[#F4ECD8]', 
    card: 'bg-[#FCF5E5]', 
    text: 'text-[#5B4636]', 
    accent: 'text-[#8B4513]',
    border: 'border-[#D2B48C]/30'
  },
  dark: { 
    bg: 'bg-[#121212]', 
    card: 'bg-[#1E1E1E]', 
    text: 'text-[#E0E0E0]', 
    accent: 'text-[#A0A080]',
    border: 'border-white/10'
  }
};

const FONTS = {
  serif: 'font-serif',
  sans: 'font-sans',
  mono: 'font-mono'
};

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>('full');
  const [currentChapterId, setCurrentChapterId] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'reader' | 'quiz' | 'stats' | 'difficulty' | 'chapters'>('difficulty');
  const [showSettings, setShowSettings] = useState(false);
  const [highlightVocabulary, setHighlightVocabulary] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState<VocabularyItem | null>(null);

  // Reader settings
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('odyssey_settings');
    return saved ? JSON.parse(saved) : { fontSize: 18, theme: 'light', font: 'serif' };
  });

  useEffect(() => {
    localStorage.setItem('odyssey_settings', JSON.stringify(settings));
  }, [settings]);
  
  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);

  // Progress state
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('odyssey_progress');
    const defaultProgress: UserProgress = { 
      difficulty: 'secundaria', 
      attempts: [],
      lastRead: {
        full: { chapterId: 1 },
        page: { chapterId: 1, pageIndex: 0 }
      }
    };
    
    if (!saved) return defaultProgress;
    const parsed = JSON.parse(saved);
    // Migration for old progress format
    if (!parsed.lastRead) {
      return { ...parsed, lastRead: defaultProgress.lastRead };
    }
    return parsed;
  });

  useEffect(() => {
    localStorage.setItem('odyssey_progress', JSON.stringify(progress));
  }, [progress]);

  // Update progress when reading
  useEffect(() => {
    if (view === 'reader' && chapter) {
      setProgress(prev => ({
        ...prev,
        lastRead: {
          ...prev.lastRead,
          [readingMode]: readingMode === 'page' 
            ? { chapterId: currentChapterId, pageIndex: currentPageIndex }
            : { chapterId: currentChapterId }
        }
      }));
    }
  }, [currentPageIndex, currentChapterId, readingMode, view, chapter]);

  const loadChapter = async (id: number, startAtPage?: number) => {
    setLoading(true);
    try {
      const content = await getChapter(id, difficulty || 'secundaria');
      setChapter(content);
      setCurrentChapterId(id);
      setCurrentPageIndex(startAtPage ?? 0);
      setView('reader');
    } catch (error) {
      console.error("Error loading chapter:", error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!difficulty || !chapter) return;
    setLoading(true);
    try {
      const allQuestions = await getChapterQuestions(currentChapterId, difficulty, chapter.fullText);
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      setSelectedQuestions(shuffled.slice(0, 6));
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setQuizFinished(false);
      setView('quiz');
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);
    
    if (currentQuestionIndex < selectedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const finishQuiz = (finalAnswers: number[]) => {
    const attemptQuestions = selectedQuestions.map((q, i) => ({
      question: q.text,
      givenAnswer: finalAnswers[i],
      correctAnswer: q.correctAnswer,
      isCorrect: finalAnswers[i] === q.correctAnswer
    }));

    const correctCount = attemptQuestions.filter(q => q.isCorrect).length;
    const score = (correctCount / selectedQuestions.length) * 100;

    const newAttempt: Attempt = {
      timestamp: Date.now(),
      chapterId: currentChapterId,
      difficulty: difficulty!,
      questions: attemptQuestions,
      score
    };

    setProgress(prev => ({
      ...prev,
      attempts: [...prev.attempts, newAttempt]
    }));
    setQuizFinished(true);
  };

  const stats = useMemo(() => {
    if (progress.attempts.length === 0) return null;
    const total = progress.attempts.length;
    const avgScore = progress.attempts.reduce((acc, curr) => acc + curr.score, 0) / total;
    return { total, avgScore };
  }, [progress.attempts]);

  const highlightText = (text: string) => {
    if (!highlightVocabulary || !currentChapterId || !difficulty || !STATIC_VOCABULARY[difficulty]?.[currentChapterId]) {
      return text;
    }

    const vocab = STATIC_VOCABULARY[difficulty][currentChapterId];
    const sortedVocab = [...vocab].sort((a, b) => b.word.length - a.word.length);
    
    let parts: (string | React.ReactNode)[] = [text];

    sortedVocab.forEach(item => {
      const newParts: (string | React.ReactNode)[] = [];
      parts.forEach(part => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }

        const regex = new RegExp(`(\\b${item.word}\\b)`, 'gi');
        const split = part.split(regex);
        
        split.forEach((s, i) => {
          if (s.toLowerCase() === item.word.toLowerCase()) {
            newParts.push(
              <span 
                key={`${item.word}-${i}-${Math.random()}`}
                className={cn(
                  "cursor-help border-b-2 transition-all px-0.5 rounded-sm",
                  settings.theme === 'dark' 
                    ? "bg-[#A0A080]/20 border-[#A0A080] hover:bg-[#A0A080]/40" 
                    : "bg-yellow-200/50 border-yellow-500 hover:bg-yellow-300/50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVocab(item);
                }}
              >
                {s}
              </span>
            );
          } else if (s !== '') {
            newParts.push(s);
          }
        });
      });
      parts = newParts;
    });

    return parts;
  };

  const processChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, child => {
      if (typeof child === 'string') {
        return highlightText(child);
      }
      if (React.isValidElement(child) && (child.props as any).children) {
        return React.cloneElement(child, {
          children: processChildren((child.props as any).children)
        } as any);
      }
      return child;
    });
  };

  const markdownComponents = {
    p: ({ children }: any) => <p>{processChildren(children)}</p>,
    li: ({ children }: any) => <li>{processChildren(children)}</li>,
    em: ({ children }: any) => <em>{processChildren(children)}</em>,
    strong: ({ children }: any) => <strong>{processChildren(children)}</strong>,
    h1: ({ children }: any) => <h1>{processChildren(children)}</h1>,
    h2: ({ children }: any) => <h2>{processChildren(children)}</h2>,
    h3: ({ children }: any) => <h3>{processChildren(children)}</h3>,
    h4: ({ children }: any) => <h4>{processChildren(children)}</h4>,
    h5: ({ children }: any) => <h5>{processChildren(children)}</h5>,
    h6: ({ children }: any) => <h6>{processChildren(children)}</h6>,
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-300", THEMES[settings.theme].bg, THEMES[settings.theme].text, FONTS[settings.font])}>
      {/* Navigation Rail */}
      {view !== 'difficulty' && (
        <nav className={cn("fixed top-0 left-0 right-0 h-16 border-b z-50 px-6 flex items-center justify-between transition-colors duration-300", settings.theme === 'dark' ? "bg-[#1E1E1E]/80 border-white/10" : "bg-white/80 border-black/5", "backdrop-blur-md")}>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setView(view === 'chapters' ? 'difficulty' : 'chapters')}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <span className={cn("font-bold text-lg hidden sm:inline", THEMES[settings.theme].accent)}>La Odisea</span>
            <div className="h-4 w-px bg-black/10 hidden sm:block" />
            <span className="font-medium">
              {view === 'chapters' ? 'Selección de Cantos' : `Canto ${currentChapterId}`}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {view === 'reader' && (
              <div className="bg-black/5 p-1 rounded-full flex mr-2">
                <button 
                  onClick={() => setReadingMode('full')}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    readingMode === 'full' ? "bg-white shadow-sm " + THEMES[settings.theme].accent : "text-gray-400"
                  )}
                  title="Capítulo Completo"
                >
                  <Layout size={18} />
                </button>
                <button 
                  onClick={() => setReadingMode('page')}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    readingMode === 'page' ? "bg-white shadow-sm " + THEMES[settings.theme].accent : "text-gray-400"
                  )}
                  title="Página por Página"
                >
                  <FileText size={18} />
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-full transition-all hover:bg-black/5 mr-2",
                showSettings ? THEMES[settings.theme].accent : "text-gray-400"
              )}
              title="Configuración de Lectura"
            >
              <Settings size={20} />
            </button>

            <button 
              onClick={() => setView('chapters')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                view === 'chapters' ? (settings.theme === 'dark' ? "bg-[#A0A080] text-black" : "bg-[#5A5A40] text-white") : "hover:bg-black/5"
              )}
            >
              Cantos
            </button>
            <button 
              onClick={() => setView('stats')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                view === 'stats' ? (settings.theme === 'dark' ? "bg-[#A0A080] text-black" : "bg-[#5A5A40] text-white") : "hover:bg-black/5"
              )}
            >
              Progreso
            </button>
          </div>
        </nav>
      )}

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-20 right-6 w-72 p-6 rounded-3xl shadow-xl border z-40 backdrop-blur-md",
              settings.theme === 'dark' ? "bg-[#1E1E1E]/95 border-white/10" : "bg-white/95 border-black/5"
            )}
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-widest opacity-50 font-bold">Tamaño de Texto</label>
                <div className="flex items-center justify-between bg-black/5 rounded-2xl p-2">
                  <button 
                    onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(12, s.fontSize - 2) }))}
                    className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-mono font-bold">{settings.fontSize}px</span>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, fontSize: Math.min(32, s.fontSize + 2) }))}
                    className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs uppercase tracking-widest opacity-50 font-bold">Tema</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'sepia', 'dark'] as Theme[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setSettings(s => ({ ...s, theme: t }))}
                      className={cn(
                        "h-10 rounded-xl border-2 transition-all flex items-center justify-center",
                        t === 'light' ? "bg-white text-black" : t === 'sepia' ? "bg-[#F4ECD8] text-[#5B4636]" : "bg-[#121212] text-white",
                        settings.theme === t ? "border-[#5A5A40]" : "border-transparent"
                      )}
                    >
                      {t === 'light' ? <Sun size={16} /> : t === 'sepia' ? <Coffee size={16} /> : <Moon size={16} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs uppercase tracking-widest opacity-50 font-bold">Fuente</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['serif', 'sans', 'mono'] as Font[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setSettings(s => ({ ...s, font: f }))}
                      className={cn(
                        "h-10 rounded-xl border-2 transition-all text-xs font-bold",
                        f === 'serif' ? "font-serif" : f === 'sans' ? "font-sans" : "font-mono",
                        settings.theme === 'dark' ? "bg-white/5" : "bg-black/5",
                        settings.font === f ? "border-[#5A5A40]" : "border-transparent"
                      )}
                    >
                      {f === 'serif' ? 'Aa' : f === 'sans' ? 'Aa' : 'Aa'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-32 px-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-4"
            >
              <Loader2 className="animate-spin text-[#5A5A40]" size={48} />
              <p className="italic text-gray-500">Preparando el Canto para tu lectura...</p>
            </motion.div>
          ) : view === 'difficulty' ? (
            <motion.div 
              key="difficulty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-4xl mx-auto text-center space-y-12 py-12"
            >
              <div className="space-y-4">
                <h1 className={cn("text-7xl font-bold tracking-tight", THEMES[settings.theme].accent)}>La Odisea</h1>
                <p className="text-2xl italic opacity-60">Selecciona tu nivel de estudio para comenzar la lectura íntegra.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { id: 'primaria', label: '4to Grado', icon: Baby, desc: 'Versión Argentina (Narrativa)' },
                  { id: 'secundaria', label: 'Secundaria', icon: GraduationCap, desc: 'Texto íntegro original' },
                  { id: 'adulto', label: 'Adulto', icon: User, desc: 'Texto íntegro original' }
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => {
                      setDifficulty(level.id as Difficulty);
                      setProgress(prev => ({ ...prev, difficulty: level.id as Difficulty }));
                      setView('chapters');
                    }}
                    className={cn(
                      "group p-10 rounded-[3rem] shadow-sm border transition-all flex flex-col items-center space-y-6 hover:shadow-2xl hover:-translate-y-2",
                      settings.theme === 'dark' ? "bg-white/5 border-white/10 hover:border-[#A0A080]" : "bg-white border-black/5 hover:border-[#5A5A40]"
                    )}
                  >
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center transition-colors",
                      settings.theme === 'dark' ? "bg-white/10 group-hover:bg-[#A0A080] group-hover:text-black" : "bg-[#F5F2ED] group-hover:bg-[#5A5A40] group-hover:text-white"
                    )}>
                      <level.icon size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold">{level.label}</h3>
                      <p className="text-sm opacity-50">{level.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : view === 'chapters' ? (
            <motion.div
              key="chapters"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className={cn("text-3xl font-bold", THEMES[settings.theme].accent)}>Cantos de la Odisea</h2>
                  <p className="opacity-60">Selecciona un canto para comenzar la lectura</p>
                </div>
                
                <button
                  onClick={() => {
                    const last = progress.lastRead[readingMode];
                    loadChapter(last.chapterId, (last as any).pageIndex || 0);
                  }}
                  className={cn(
                    "flex items-center space-x-3 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 shadow-md",
                    settings.theme === 'dark' ? "bg-[#A0A080] text-black" : "bg-[#5A5A40] text-white"
                  )}
                >
                  <RotateCcw size={18} />
                  <div className="text-left leading-tight">
                    <p className="text-[10px] uppercase tracking-widest opacity-70">
                      Canto {progress.lastRead[readingMode].chapterId}
                      {readingMode === 'page' && ` • Página ${progress.lastRead.page.pageIndex + 1}`}
                    </p>
                    <p>Continuar donde dejé</p>
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: CHAPTER_COUNT }).map((_, i) => {
                  const id = i + 1;
                  const isLastRead = progress.lastRead[readingMode].chapterId === id;
                  
                  return (
                    <button
                      key={id}
                      onClick={() => loadChapter(id)}
                      className={cn(
                        "p-8 h-52 rounded-[2.5rem] border text-left transition-all hover:shadow-xl group relative overflow-hidden flex flex-col justify-center",
                        isLastRead 
                          ? (settings.theme === 'dark' ? "bg-[#A0A080]/10 border-[#A0A080]" : "bg-[#5A5A40]/5 border-[#5A5A40]")
                          : (settings.theme === 'dark' ? "bg-white/5 border-white/10 hover:border-white/30" : "bg-white border-black/5 hover:border-black/20")
                      )}
                    >
                      <div className="relative z-10">
                        <h3 className={cn("text-4xl font-bold tracking-tighter", isLastRead ? THEMES[settings.theme].accent : "opacity-90")}>
                          Canto {id}
                        </h3>
                        <p className="text-sm font-medium mt-2 opacity-50 leading-snug group-hover:translate-x-1 transition-transform line-clamp-3">
                          {CANTO_TITLES[id]}
                        </p>
                      </div>
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BookOpen size={80} />
                      </div>
                      {isLastRead && (
                        <div className={cn("absolute top-4 right-4 w-2 h-2 rounded-full", settings.theme === 'dark' ? "bg-[#A0A080]" : "bg-[#5A5A40]")} />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : view === 'reader' ? (
            <motion.div 
              key="reader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <h2 className={cn("text-4xl font-bold", THEMES[settings.theme].accent)}>{chapter?.title}</h2>
                  <div className="flex items-center space-x-4 text-sm opacity-50 italic">
                    <span>Texto Íntegro</span>
                    {readingMode === 'page' && chapter && (
                      <>
                        <div className="w-1 h-1 bg-current rounded-full" />
                        <span>Página {chapter.pages[currentPageIndex]?.number}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setHighlightVocabulary(!highlightVocabulary)}
                  className={cn(
                    "flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-md",
                    highlightVocabulary 
                      ? (settings.theme === 'dark' ? "bg-[#A0A080] text-black" : "bg-[#5A5A40] text-white")
                      : (settings.theme === 'dark' ? "bg-white/5 text-gray-400 border border-white/10" : "bg-white text-gray-400 border border-black/5")
                  )}
                >
                  <Type size={18} />
                  <span>Vocabulario</span>
                </button>
              </div>
              
              <div className={cn(
                "p-12 rounded-[2rem] shadow-sm border min-h-[60vh] relative overflow-hidden transition-colors duration-300",
                THEMES[settings.theme].card,
                THEMES[settings.theme].border
              )}>
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <BookOpen size={200} />
                </div>
                
                <div 
                  className={cn(
                    "prose prose-lg max-w-none text-justify leading-relaxed first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left relative z-10",
                    THEMES[settings.theme].text,
                    FONTS[settings.font]
                  )}
                  style={{ fontSize: `${settings.fontSize}px`, lineHeight: 1.6 }}
                >
                  {readingMode === 'full' ? (
                    <div className="space-y-6">
                      {chapter?.pages.map((p, i) => (
                        <div key={i} className="relative">
                          <span className="absolute -left-8 top-0 text-[10px] opacity-30 font-mono">p.{p.number}</span>
                          <Markdown components={markdownComponents as any}>{p.content}</Markdown>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      key={currentPageIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <Markdown components={markdownComponents as any}>{chapter?.pages[currentPageIndex]?.content}</Markdown>
                    </motion.div>
                  )}
                </div>

                {readingMode === 'page' && chapter && (
                  <div className={cn("flex justify-center items-center space-x-8 mt-12 pt-8 border-t", THEMES[settings.theme].border)}>
                    <button
                      disabled={currentPageIndex === 0}
                      onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                      className="p-2 hover:bg-black/5 rounded-full disabled:opacity-20 transition-all"
                    >
                      <ChevronLeft size={32} />
                    </button>
                    <span className="font-mono text-sm">
                      {currentPageIndex + 1} / {chapter.pages.length}
                    </span>
                    <button
                      disabled={currentPageIndex === chapter.pages.length - 1}
                      onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                      className="p-2 hover:bg-black/5 rounded-full disabled:opacity-20 transition-all"
                    >
                      <ChevronRight size={32} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-12">
                <button
                  disabled={currentChapterId === 1}
                  onClick={() => {
                    const nextId = currentChapterId - 1;
                    setCurrentChapterId(nextId);
                    loadChapter(nextId);
                  }}
                  className="flex items-center space-x-2 opacity-50 hover:opacity-100 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                  <span>Canto Anterior</span>
                </button>
                
                <button
                  onClick={startQuiz}
                  className={cn(
                    "px-10 py-4 rounded-full font-bold hover:shadow-xl hover:scale-105 transition-all flex items-center space-x-2 text-white",
                    settings.theme === 'dark' ? "bg-[#A0A080] text-black" : "bg-[#5A5A40]"
                  )}
                >
                  <BookOpen size={20} />
                  <span>Realizar Cuestionario</span>
                </button>

                <button
                  disabled={currentChapterId === CHAPTER_COUNT}
                  onClick={() => {
                    const nextId = currentChapterId + 1;
                    setCurrentChapterId(nextId);
                    loadChapter(nextId);
                  }}
                  className="flex items-center space-x-2 opacity-50 hover:opacity-100 disabled:opacity-30 transition-all"
                >
                  <span>Siguiente Canto</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          ) : view === 'quiz' ? (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              {!quizFinished ? (
                <>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-sm uppercase tracking-widest text-gray-500">Pregunta {currentQuestionIndex + 1} de 6</span>
                      <h3 className="text-2xl font-bold">Pon a prueba tu conocimiento</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-[#5A5A40]">{Math.round(((currentQuestionIndex) / 6) * 100)}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-black/5 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-[#5A5A40] h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex) / 6) * 100}%` }}
                    />
                  </div>

                  <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-black/5 space-y-8">
                    <p className="text-2xl leading-relaxed font-medium">{selectedQuestions[currentQuestionIndex]?.text}</p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {selectedQuestions[currentQuestionIndex]?.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(idx)}
                          className="w-full text-left p-6 rounded-2xl border border-black/5 hover:border-[#5A5A40] hover:bg-[#F5F2ED] transition-all group flex items-center justify-between"
                        >
                          <span className="text-lg">{option}</span>
                          <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-8">
                  <div className="w-24 h-24 bg-[#5A5A40] text-white rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold">¡Cuestionario Completado!</h2>
                    <p className="text-xl text-gray-500 italic">Has terminado el estudio del Canto {currentChapterId}.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
                      <span className="text-sm uppercase tracking-widest text-gray-500">Puntuación</span>
                      <p className="text-5xl font-bold text-[#5A5A40]">{Math.round(progress.attempts[progress.attempts.length - 1].score)}%</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
                      <span className="text-sm uppercase tracking-widest text-gray-500">Correctas</span>
                      <p className="text-5xl font-bold text-[#5A5A40]">{progress.attempts[progress.attempts.length - 1].questions.filter(q => q.isCorrect).length}/6</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <button
                      onClick={() => setView('reader')}
                      className="px-8 py-3 rounded-full border border-[#5A5A40] text-[#5A5A40] font-bold hover:bg-[#5A5A40] hover:text-white transition-all"
                    >
                      Volver a Leer
                    </button>
                    <button
                      onClick={startQuiz}
                      className="px-8 py-3 rounded-full bg-[#5A5A40] text-white font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <RotateCcw size={20} />
                      <span>Reintentar</span>
                    </button>
                    <button
                      onClick={() => {
                        if (currentChapterId < CHAPTER_COUNT) {
                          const next = currentChapterId + 1;
                          setCurrentChapterId(next);
                          loadChapter(next);
                        } else {
                          setView('stats');
                        }
                      }}
                      className="px-8 py-3 rounded-full bg-[#1A1A1A] text-white font-bold hover:shadow-lg transition-all"
                    >
                      {currentChapterId < CHAPTER_COUNT ? 'Siguiente Canto' : 'Ver Estadísticas'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-[#5A5A40]">Tu Bitácora de Viaje</h2>
                <p className="text-gray-600">Seguimiento detallado de tu progreso a través de la obra íntegra.</p>
              </div>

              {stats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
                      <BarChart3 className="text-[#5A5A40] mb-4" size={32} />
                      <span className="text-sm uppercase tracking-widest text-gray-500">Intentos Totales</span>
                      <p className="text-4xl font-bold">{stats.total}</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
                      <CheckCircle2 className="text-emerald-600 mb-4" size={32} />
                      <span className="text-sm uppercase tracking-widest text-gray-500">Precisión Media</span>
                      <p className="text-4xl font-bold">{Math.round(stats.avgScore)}%</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
                      <GraduationCap className="text-blue-600 mb-4" size={32} />
                      <span className="text-sm uppercase tracking-widest text-gray-500">Nivel Actual</span>
                      <p className="text-4xl font-bold capitalize">{difficulty}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold">Historial de Intentos</h3>
                    <div className="space-y-4">
                      {progress.attempts.slice().reverse().map((attempt, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm space-y-6">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                              <div className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl",
                                attempt.score >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                              )}>
                                {Math.round(attempt.score)}%
                              </div>
                              <div>
                                <h4 className="font-bold text-lg">Canto {attempt.chapterId}</h4>
                                <p className="text-xs text-gray-400">{new Date(attempt.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                            <span className="text-xs font-medium px-4 py-2 bg-black/5 rounded-full capitalize">{attempt.difficulty}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {attempt.questions.map((q, qIdx) => (
                              <div key={qIdx} className="text-sm p-5 rounded-2xl bg-[#F5F2ED]/50 border border-black/5">
                                <div className="flex items-start space-x-3">
                                  {q.isCorrect ? <CheckCircle2 size={18} className="text-emerald-600 mt-1 shrink-0" /> : <XCircle size={18} className="text-red-600 mt-1 shrink-0" />}
                                  <div className="space-y-2">
                                    <p className="font-medium leading-relaxed">{q.question}</p>
                                    {!q.isCorrect && (
                                      <div className="flex flex-col space-y-1 pt-1 border-t border-black/5">
                                        <p className="text-xs text-red-600">Tu respuesta: Opción {q.givenAnswer + 1}</p>
                                        <p className="text-xs text-emerald-600">Correcta: Opción {q.correctAnswer + 1}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-black/20">
                  <p className="text-xl text-gray-400 italic">Aún no has realizado ningún cuestionario. ¡Comienza tu viaje!</p>
                  <button 
                    onClick={() => setView('reader')}
                    className="mt-6 px-8 py-3 bg-[#5A5A40] text-white rounded-full font-bold"
                  >
                    Ir a la Lectura
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Vocabulary Popup */}
      <AnimatePresence>
        {selectedVocab && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVocab(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border",
                settings.theme === 'dark' ? "bg-[#1E1E1E] border-white/10" : "bg-white border-black/5"
              )}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest opacity-50 font-bold">Vocabulario</span>
                  <button 
                    onClick={() => setSelectedVocab(null)}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <XCircle size={20} className="opacity-50" />
                  </button>
                </div>
                <h3 className={cn("text-3xl font-bold", THEMES[settings.theme].accent)}>{selectedVocab.word}</h3>
                <p className="text-lg leading-relaxed opacity-80">{selectedVocab.explanation}</p>
                <button
                  onClick={() => setSelectedVocab(null)}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all mt-4",
                    settings.theme === 'dark' ? "bg-[#A0A080] text-black" : "bg-[#5A5A40] text-white"
                  )}
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
