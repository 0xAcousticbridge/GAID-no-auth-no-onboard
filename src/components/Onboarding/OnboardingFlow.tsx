import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Home, Book, Heart, ArrowRight, ArrowLeft, Check, Clock, Brain } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user, profile, completeOnboarding } = useStore();
  const navigate = useNavigate();

  // Redirect if user is not logged in or has completed onboarding
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (profile?.onboarding_completed) {
      navigate('/dashboard');
    }
  }, [user, profile, navigate]);

  const [preferences, setPreferences] = useState({
    schedule: {
      wakeTime: '07:00',
      sleepTime: '22:00',
      productiveHours: ['morning']
    },
    goals: [] as string[],
    focusAreas: [] as string[],
    aiPreferences: {
      suggestionsFrequency: 'sometimes',
      categories: [] as string[]
    }
  });

  const handleComplete = async () => {
    try {
      setLoading(true);

      // Save user preferences
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          daily_routine_preferences: preferences.schedule,
          suggestions_frequency: preferences.aiPreferences.suggestionsFrequency,
          focus_areas: preferences.focusAreas,
          preferred_categories: preferences.aiPreferences.categories,
          goals: preferences.goals
        });

      if (prefsError) throw prefsError;

      // Generate initial AI suggestions based on preferences
      const { error: suggestionsError } = await supabase
        .from('ai_suggestions')
        .insert(preferences.goals.map(goal => ({
          user_id: user?.id,
          category: goal,
          content: `Based on your ${goal} goal, here are some suggestions...`,
          context: {
            schedule: preferences.schedule,
            focusAreas: preferences.focusAreas
          }
        })));

      if (suggestionsError) throw suggestionsError;

      // Mark onboarding as complete
      await completeOnboarding();
      
      navigate('/dashboard');
      toast.success('Setup complete! Your personalized AI suggestions are ready.');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Let's Get Started",
      description: "First, tell us about your daily schedule",
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-300 mb-1 block">When do you usually wake up?</span>
              <input
                type="time"
                value={preferences.schedule.wakeTime}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, wakeTime: e.target.value }
                }))}
                className="w-full bg-gray-700 border-gray-600 rounded-lg text-gray-100"
              />
            </label>

            <label className="block">
              <span className="text-gray-300 mb-1 block">When do you usually go to bed?</span>
              <input
                type="time"
                value={preferences.schedule.sleepTime}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, sleepTime: e.target.value }
                }))}
                className="w-full bg-gray-700 border-gray-600 rounded-lg text-gray-100"
              />
            </label>

            <div>
              <span className="text-gray-300 mb-2 block">When are you most productive?</span>
              <div className="grid grid-cols-3 gap-4">
                {['morning', 'afternoon', 'evening'].map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      const hours = preferences.schedule.productiveHours.includes(time)
                        ? preferences.schedule.productiveHours.filter(h => h !== time)
                        : [...preferences.schedule.productiveHours, time];
                      setPreferences(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, productiveHours: hours }
                      }));
                    }}
                    className={`p-4 rounded-lg border-2 ${
                      preferences.schedule.productiveHours.includes(time)
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <Clock className="h-5 w-5 mx-auto mb-2" />
                    <span className="block text-sm capitalize">{time}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Set Your Goals",
      description: "What would you like to achieve?",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'productivity', label: 'Boost Productivity', icon: Brain },
              { id: 'health', label: 'Improve Health', icon: Heart },
              { id: 'learning', label: 'Learn New Skills', icon: Book },
              { id: 'balance', label: 'Better Work-Life Balance', icon: Home }
            ].map((goal) => (
              <button
                key={goal.id}
                onClick={() => {
                  const goals = preferences.goals.includes(goal.id)
                    ? preferences.goals.filter(g => g !== goal.id)
                    : [...preferences.goals, goal.id];
                  setPreferences(prev => ({ ...prev, goals }));
                }}
                className={`p-6 rounded-lg border-2 ${
                  preferences.goals.includes(goal.id)
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <goal.icon className="h-8 w-8 mx-auto mb-3" />
                <span className="block text-sm font-medium">{goal.label}</span>
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "AI Preferences",
      description: "Let's personalize your AI suggestions",
      content: (
        <div className="space-y-6">
          <div>
            <span className="text-gray-300 mb-2 block">How often would you like AI suggestions?</span>
            <div className="grid grid-cols-3 gap-4">
              {['often', 'sometimes', 'rarely'].map((freq) => (
                <button
                  key={freq}
                  onClick={() => setPreferences(prev => ({
                    ...prev,
                    aiPreferences: { ...prev.aiPreferences, suggestionsFrequency: freq }
                  }))}
                  className={`p-4 rounded-lg border-2 ${
                    preferences.aiPreferences.suggestionsFrequency === freq
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="block text-sm capitalize">{freq}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-gray-300 mb-2 block">What areas would you like AI help with?</span>
            <div className="grid grid-cols-2 gap-4">
              {[
                'daily-routine',
                'meal-planning',
                'exercise',
                'learning',
                'work',
                'hobbies'
              ].map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    const categories = preferences.aiPreferences.categories.includes(category)
                      ? preferences.aiPreferences.categories.filter(c => c !== category)
                      : [...preferences.aiPreferences.categories, category];
                    setPreferences(prev => ({
                      ...prev,
                      aiPreferences: { ...prev.aiPreferences, categories }
                    }));
                  }}
                  className={`p-4 rounded-lg border-2 ${
                    preferences.aiPreferences.categories.includes(category)
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="block text-sm capitalize">{category.replace('-', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/95 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full border border-gray-700 p-6">
        <div className="flex justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">{steps[currentStep].title}</h2>
            <p className="text-gray-400">{steps[currentStep].description}</p>
          </div>
          <div className="flex space-x-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === currentStep ? 'bg-yellow-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {steps[currentStep].content}

        <div className="flex justify-between mt-8">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              className="flex items-center text-gray-300 hover:text-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (currentStep < steps.length - 1) {
                setCurrentStep(s => s + 1);
              } else {
                handleComplete();
              }
            }}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
}