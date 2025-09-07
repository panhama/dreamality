import React from 'react';
import { CheckCircle, Clock, Sparkles, Image, Mic, BookOpen } from 'lucide-react';

interface GenerationProgressProps {
  currentStep: number;
  isLoading: boolean;
}

const steps = [
  {
    id: 1,
    title: "Planning Your Story",
    description: "Creating a magical storyline just for you",
    icon: BookOpen,
    duration: "5-10 seconds"
  },
  {
    id: 2,
    title: "Writing Your Adventure",
    description: "Crafting an engaging story with your personality",
    icon: Sparkles,
    duration: "10-15 seconds"
  },
  {
    id: 3,
    title: "Generating Images",
    description: "Creating beautiful illustrations for each scene",
    icon: Image,
    duration: "20-30 seconds"
  },
  {
    id: 4,
    title: "Recording Narration",
    description: "Adding magical voice narration to your story",
    icon: Mic,
    duration: "65-95 seconds"
  }
];

export default function GenerationProgress({ currentStep, isLoading }: GenerationProgressProps) {
  if (!isLoading || currentStep === 0) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-yellow-400/20 via-orange-400/20 to-amber-400/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400 rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-16 w-16 h-16 bg-orange-400 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-20 w-12 h-12 bg-amber-400 rounded-full animate-pulse delay-2000"></div>
          <div className="absolute bottom-32 right-10 w-8 h-8 bg-yellow-500 rounded-full animate-pulse delay-3000"></div>
        </div>
        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-yellow-600 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-ping"></div>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
              Creating Your Magical Story
            </h2>
          </div>
          <p className="text-gray-600 font-medium">Please wait while we craft something special just for you...</p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-700 ease-in-out transform ${
                  isCurrent
                    ? 'bg-yellow-50 border-2 border-yellow-200 shadow-md scale-105'
                    : isCompleted
                    ? 'bg-green-50 border-2 border-green-200 scale-100'
                    : 'bg-gray-50 border-2 border-gray-200 scale-100'
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-yellow-500 text-white animate-pulse'
                    : 'bg-gray-300 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : isCurrent ? (
                    <Clock className="h-6 w-6 animate-spin" />
                  ) : (
                    <step.icon className="h-6 w-6" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold transition-colors duration-500 ${
                    isCompleted
                      ? 'text-green-800'
                      : isCurrent
                      ? 'text-yellow-800'
                      : 'text-gray-600'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm mt-1 transition-colors duration-500 ${
                    isCompleted
                      ? 'text-green-600'
                      : isCurrent
                      ? 'text-yellow-700'
                      : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ⏱️ {step.duration}
                  </p>
                </div>

                {/* Progress Indicator */}
                {isCurrent && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">Overall Progress</span>
            <span className="font-bold text-yellow-600">{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-500 rounded-full transition-all duration-1000 ease-out shadow-sm relative"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Fun Messages */}
        <div className="text-center mb-4">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm font-medium text-yellow-800">
              {currentStep === 1 && "🪄 Weaving your dreams into reality..."}
              {currentStep === 2 && "📖 Crafting a story that's uniquely yours..."}
              {currentStep === 3 && "🎨 Painting pictures with words and colors..."}
              {currentStep === 4 && "🎵 Adding the perfect voice to your adventure..."}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              {currentStep === 1 && "Planning the perfect storyline for your personality"}
              {currentStep === 2 && "Writing engaging content that matches your reading level"}
              {currentStep === 3 && "Creating beautiful illustrations with your chosen style"}
              {currentStep === 4 && "Recording professional narration with custom voice settings"}
            </p>
          </div>
        </div>

        {/* Did You Know Section */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Did you know?</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            {currentStep === 1 && "Each story is uniquely crafted based on your personality and dreams, making it truly one-of-a-kind!"}
            {currentStep === 2 && "Our AI considers your reading level to ensure the story is perfectly suited for your age and comprehension."}
            {currentStep === 3 && "Images are generated with character consistency, so your hero looks the same throughout the entire story!"}
            {currentStep === 4 && "Voice narration uses advanced AI to create natural, engaging storytelling with custom emotional tones."}
          </p>
        </div>

        {/* Estimated Time */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg py-2 px-4 inline-block">
            ⏱️ Estimated completion: {steps.slice(currentStep - 1).reduce((acc, step) => {
              const duration = step.duration.split('-')[1]?.replace(' seconds', '') || '30';
              return acc + parseInt(duration);
            }, 0)} seconds remaining
          </p>
        </div>
      </div>
    </div>
  );
}
