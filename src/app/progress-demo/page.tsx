import { useState } from 'react';
import GenerationProgress from '@/components/GenerationProgress';

export default function ProgressDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const startDemo = () => {
    setIsLoading(true);
    setCurrentStep(1);

    // Simulate the progress steps
    setTimeout(() => setCurrentStep(2), 2000);
    setTimeout(() => setCurrentStep(3), 8000);
    setTimeout(() => setCurrentStep(4), 18000);
    setTimeout(() => {
      setIsLoading(false);
      setCurrentStep(0);
    }, 30000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-8 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Progress Component Demo</h1>
          <p className="text-gray-600 mb-6">Click the button to see the beautiful progress animation!</p>

          <button
            onClick={startDemo}
            disabled={isLoading}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Story...' : 'Start Demo'}
          </button>
        </div>
      </div>

      <GenerationProgress currentStep={currentStep} isLoading={isLoading} />
    </div>
  );
}
