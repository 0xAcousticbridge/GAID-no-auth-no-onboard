import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Wand2, Save, Trash2, Loader2, Send } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface AIPromptBuilderProps {
  onGenerate: (prompt: string) => void;
}

export function AIPromptBuilder({ onGenerate }: AIPromptBuilderProps) {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useStore();

  useEffect(() => {
    if (user) {
      fetchUserPreferences();
    }
  }, [user]);

  const fetchUserPreferences = async () => {
    try {
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (prefsError) throw prefsError;
      setUserPreferences(prefs);

      // Fetch AI suggestions based on preferences
      const { data: suggestions, error: suggestionsError } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (suggestionsError) throw suggestionsError;
      setSuggestions(suggestions || []);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const generatePrompt = () => {
    if (!userPreferences) return;

    // Generate personalized prompt based on preferences
    const { daily_routine_preferences, goals, focus_areas } = userPreferences;
    const wakeTime = daily_routine_preferences.wakeTime;
    const productiveHours = daily_routine_preferences.productiveHours;

    let generatedPrompt = `Help me optimize my ${focus_areas.join(' and ')} considering:\n`;
    generatedPrompt += `- I wake up at ${wakeTime}\n`;
    generatedPrompt += `- I'm most productive during ${productiveHours.join(', ')}\n`;
    generatedPrompt += `- My goals include: ${goals.join(', ')}\n`;
    generatedPrompt += `\nSuggest specific actions I can take to improve these areas.`;

    setPrompt(generatedPrompt);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || !user) return;

    setLoading(true);
    try {
      // Save the prompt
      const { error: saveError } = await supabase
        .from('saved_prompts')
        .insert([{
          user_id: user.id,
          content: prompt,
          context: {
            preferences: userPreferences
          }
        }]);

      if (saveError) throw saveError;

      // Call the parent's onGenerate
      onGenerate(prompt);
      
      toast.success('Prompt generated successfully!');
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Sparkles className="h-6 w-6 text-yellow-500 mr-2" />
          <h2 className="text-xl font-bold text-gray-100">AI Prompt Builder</h2>
        </div>
        <button
          onClick={generatePrompt}
          className="flex items-center px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Generate Prompt
        </button>
      </div>

      <div className="space-y-4">
        <TextareaAutosize
          ref={promptRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you'd like help with..."
          className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 resize-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          minRows={3}
        />

        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setPrompt('')}
            className="px-4 py-2 text-gray-400 hover:text-gray-300"
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !prompt.trim()}
            className="flex items-center px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-100 mb-4">Previous Suggestions</h3>
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-4 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-yellow-500">{suggestion.category}</span>
                    <button
                      onClick={() => setPrompt(suggestion.content)}
                      className="text-sm text-gray-400 hover:text-gray-300"
                    >
                      Use This
                    </button>
                  </div>
                  <p className="text-gray-300">{suggestion.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}