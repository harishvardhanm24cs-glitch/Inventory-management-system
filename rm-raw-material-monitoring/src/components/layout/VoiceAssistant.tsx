import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, Headphones, Sparkles, Command } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

const VoiceAssistant: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(true);
    const { materials } = useInventory();
    const navigate = useNavigate();
    
    // Web Speech API
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const text = event.results[0][0].transcript.toLowerCase();
                setTranscript(text);
                handleCommand(text);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                speak('I encountered an error. Please try again.');
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        } else {
            setIsSupported(false);
        }
    }, [materials]);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
        setFeedback(text);
        setTimeout(() => setFeedback(prev => prev === text ? null : prev), 6000);
    };

    const handleCommand = (text: string) => {
        console.log("Voice Command Recognized:", text);

        if (text.includes('show inventory') || text.includes('open inventory') || text.includes('check inventory')) {
            speak('Accessing real-time inventory records now.');
            navigate('/inventory');
        } 
        else if (text.includes('check stock of') || text.includes('what is the stock of') || text.includes('how much')) {
            let materialName = '';
            if (text.includes('stock of')) {
                materialName = text.split('stock of')[1].trim();
            } else if (text.includes('quantity of')) {
                materialName = text.split('quantity of')[1].trim();
            }

            materialName = materialName.replace(/is there|do we have|left|remaining/g, '').trim();

            const material = materials.find(m => 
                m.name.toLowerCase().includes(materialName) || 
                materialName.includes(m.name.toLowerCase())
            );

            if (material) {
                const statusInfo = material.stock <= material.criticalLimit ? 'and is critically low.' : 
                                 material.stock <= material.minLimit ? 'and is reaching safety limits.' : '.';
                speak(`The stock of ${material.name} is currently ${material.stock} ${material.unit} ${statusInfo}`);
            } else {
                speak(`I couldn't locate ${materialName} in our registry. Please verify the name.`);
            }
        } 
        else if (text.includes('go to dashboard') || text.includes('show dashboard')) {
            speak('Returning to the mission control dashboard.');
            navigate('/');
        } 
        else if (text.includes('digital twin') || text.includes('show warehouse')) {
            speak('Opening the digital twin warehouse visualization.');
            navigate('/warehouse');
        }
        else if (text.includes('warehouse map') || text.includes('open map')) {
            speak('Consulting the warehouse map.');
            navigate('/map');
        }
        else if (text.includes('show alerts') || text.includes('check alerts')) {
            speak('Retrieving critical system alerts.');
            navigate('/alerts');
        }
        else if (text.includes('hello') || text.includes('hi assistant')) {
            speak('Hello! I am your Raw Material Monitor AI. How can I assist you today?');
        }
        else {
            speak("Command not recognized. Try asking for stock levels or showing the inventory dashboard.");
        }
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setTranscript('');
            setFeedback(null);
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    if (!isSupported) return null;

    return (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-5">
            {feedback && (
                <div className="bg-slate-900 shadow-2xl rounded-3xl p-5 max-w-sm border border-white/10 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setFeedback(null)} className="text-white/40 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30 animate-pulse">
                            <Sparkles size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Monitor AI Assistant</p>
                            <p className="text-sm font-bold text-white leading-relaxed tracking-tight italic">
                                "{feedback}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {isListening && (
                <div className="bg-white/80 backdrop-blur-2xl px-6 py-4 rounded-[32px] border border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-5 scale-in-center animate-in zoom-in duration-300">
                    <div className="flex items-end gap-1 h-6">
                        <div className="w-1.5 h-3 bg-primary rounded-full animate-voice-wave" />
                        <div className="w-1.5 h-6 bg-primary rounded-full animate-voice-wave-delayed-1" />
                        <div className="w-1.5 h-4 bg-primary rounded-full animate-voice-wave-delayed-2" />
                        <div className="w-1.5 h-2 bg-primary rounded-full animate-voice-wave-delayed-3" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Awaiting Command</span>
                        <span className="text-xs font-bold text-slate-400">Speak now...</span>
                    </div>
                </div>
            )}

            <div className="relative group">
                <div className={cn(
                    "absolute -inset-4 bg-primary/10 rounded-full blur-2xl transition-all duration-700",
                    isListening ? "opacity-100 scale-150 animate-pulse" : "opacity-0 scale-50"
                )} />
                
                <button
                    onClick={toggleListening}
                    className={cn(
                        "relative w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-500 shadow-2xl transform active:scale-90 overflow-hidden",
                        isListening 
                            ? "bg-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]" 
                            : "bg-slate-900 shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-primary"
                    )}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    {isListening && (
                        <div className="absolute inset-0 border-4 border-white/20 rounded-[24px] animate-ping" />
                    )}

                    <div className="relative z-10 text-white flex flex-col items-center">
                        {isListening ? (
                            <MicOff size={28} className="animate-in zoom-in spin-in-45 duration-300" />
                        ) : (
                            <>
                                <Headphones size={28} className="group-hover:translate-y-10 transition-transform duration-500" />
                                <Mic size={28} className="absolute -translate-y-10 group-hover:translate-y-0 transition-transform duration-500" />
                            </>
                        )}
                    </div>
                </button>

                <div className="absolute right-full mr-6 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 border border-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 pointer-events-none shadow-2xl">
                    <div className="flex items-center gap-3">
                        <Command size={14} className="text-primary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">Voice AI</span>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes voice-wave {
                    0%, 100% { height: 8px; }
                    50% { height: 24px; }
                }
                .animate-voice-wave { animation: voice-wave 0.8s ease-in-out infinite; }
                .animate-voice-wave-delayed-1 { animation: voice-wave 0.8s ease-in-out 0.2s infinite; }
                .animate-voice-wave-delayed-2 { animation: voice-wave 0.8s ease-in-out 0.4s infinite; }
                .animate-voice-wave-delayed-3 { animation: voice-wave 0.8s ease-in-out 0.6s infinite; }
                .scale-in-center {
                    animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
                }
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}} />
        </div>
    );
};

export default VoiceAssistant;
