import { useState } from "react";

interface AdditionalInstructionsProps {
    value: string;
    onChange: (val: string) => void;
}

export function AdditionalInstructions({ value, onChange }: AdditionalInstructionsProps) {
    const [isRephrasing, setIsRephrasing] = useState(false);

    const handleRephrase = async () => {
        if (!value.trim()) return;
        try {
            setIsRephrasing(true);
            const res = await fetch('/api/gemini/generate-phrase', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ context: value }),
            });
            const data = await res.json();
            if (data.success) {
                onChange(data.generatedText);
            } else {
                console.error("Gemini Error:", data.error);
            }
        } catch (err) {
            console.error("Rephrase Failed:", err);
        } finally {
            setIsRephrasing(false);
        }
    };

    return (
        <div className="w-full mx-0 mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
                Additional Instructions
            </label>
            <div className="relative">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-24 p-3 pr-12 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter any additional instructions for the call..."
                />
                <button
                    type="button"
                    title="Maya-Rephrase"
                    onClick={handleRephrase}
                    className="
            absolute top-2 right-2
            h-8 px-3 rounded-md
            bg-gray-100 hover:bg-gray-200
            flex items-center gap-1
            border border-gray-300 shadow-sm
            text-xs font-medium text-gray-700
          "
                >
                    {isRephrasing ? (
                        <span className="animate-spin text-gray-600">⏳</span>
                    ) : (
                        <>✨</>
                    )}
                </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
                These instructions will be provided as context for the voice agent.
            </p>
        </div>
    );
}