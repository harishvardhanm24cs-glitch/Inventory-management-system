import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';
import { cn } from '../../lib/utils';

const VoiceAssistant: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);
    const navigate = useNavigate();
    const { materials } = useInventory();

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    useEffect(() => {
        if (!recognition) {
            setIsSupported(false);
            return;
        }

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const command = event.results[0][0].transcript.toLowerCase();
            setTranscript(command);
            handleCommand(command);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };
    }, [recognition]);

    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const handleCommand = (command: string) => {
        console.log('Voice Command Received:', command);

        if (command.includes('show inventory') || command.includes('open inventory')) {
            speak('Showing inventory dashboard.');
            navigate('/inventory');
        } 
        else if (command.includes('check stock of')) {
            const materialName = command.split('check stock of')[1].trim();
            const material = materials.find(m => m.name.toLowerCase().includes(materialName));
            
            if (material) {
                speak(`The current stock of ${material.name} is ${material.stock} ${material.unit}.`);
            } else {
                speak(`I couldn't find any material named ${materialName} in the inventory.`);
            }
        }
        else if (command.includes('go to dashboard')) {
            speak('Navigating to dashboard.');
            navigate('/');
        }
        else if (command.includes('show alerts')) {
            speak('Showing active system alerts.');
            navigate('/alerts');
        }
        else {
            speak("I didn't recognize that command. Please try again.");
        }
    };

    const toggleListening = () => {
        if (isListening) {
            recognition?.stop();
        } else {
            setTranscript('');
            recognition?.start();
            setIsListening(true);
        }
    };

    if (!isSupported) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {transcript && (
                <div className="bg-white/90 backdrop-blur-md border border-primary/20 p-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 max-w-xs">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Volume2 size={10} /> Recognized Command
                    </p>
                    <p className="text-sm font-semibold text-gray-800 italic">"{transcript}"</p>
                </div>
            )}
            
            <button
                onClick={toggleListening}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl group relative",
                    isListening 
                        ? "bg-red-500 scale-110 ring-4 ring-red-500/20" 
                        : "bg-primary hover:bg-primary/90 hover:scale-105"
                )}
            >
                {isListening && (
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25"></span>
                )}
                {isListening ? (
                    <Mic className="text-white w-6 h-6 animate-pulse" />
                ) : (
                    <Mic className="text-white w-6 h-6 group-hover:rotate-12 transition-transform" />
                )}
            </button>
        </div>
    );
};

export default VoiceAssistant;
