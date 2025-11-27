import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaLightbulb, FaHeart, FaAppleAlt, FaBrain, FaDumbbell, FaSun, FaMoon, FaWater } from 'react-icons/fa';

const HealthTipsFeed = () => {
  const { t } = useTranslation();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const healthTips = [
    {
      id: 1,
      category: 'Nutrition',
      icon: <FaAppleAlt className="text-green-500" />,
      tip: 'Drink at least 8 glasses of water daily to stay hydrated and maintain optimal body functions.',
      color: 'green',
      priority: 'high'
    },
    {
      id: 2,
      category: 'Exercise',
      icon: <FaDumbbell className="text-blue-500" />,
      tip: 'Take a 10-minute walk after meals to aid digestion and help regulate blood sugar levels.',
      color: 'blue',
      priority: 'high'
    },
    {
      id: 3,
      category: 'Mental Health',
      icon: <FaBrain className="text-purple-500" />,
      tip: 'Practice deep breathing for 5 minutes daily to reduce stress and anxiety. Inhale for 4 counts, hold for 4, exhale for 4.',
      color: 'purple',
      priority: 'high'
    },
    {
      id: 4,
      category: 'Heart Health',
      icon: <FaHeart className="text-red-500" />,
      tip: 'Check your blood pressure regularly if you\'re over 40 or have risk factors. Know your numbers: aim for under 120/80.',
      color: 'red',
      priority: 'high'
    },
    {
      id: 5,
      category: 'First Aid',
      icon: <FaLightbulb className="text-yellow-500" />,
      tip: 'For minor burns, run cool water over the area for 10-20 minutes. Never use ice, butter, or ointments on fresh burns.',
      color: 'yellow',
      priority: 'high'
    },
    {
      id: 6,
      category: 'Hydration',
      icon: <FaWater className="text-cyan-500" />,
      tip: 'Start your day with a glass of water. It kickstarts your metabolism and helps flush out toxins.',
      color: 'cyan',
      priority: 'medium'
    },
    {
      id: 7,
      category: 'Sleep',
      icon: <FaMoon className="text-indigo-500" />,
      tip: 'Aim for 7-9 hours of sleep per night. Maintain a consistent sleep schedule, even on weekends.',
      color: 'indigo',
      priority: 'high'
    },
    {
      id: 8,
      category: 'Sun Safety',
      icon: <FaSun className="text-orange-500" />,
      tip: 'Apply sunscreen 30 minutes before going outside. Use SPF 30 or higher and reapply every 2 hours.',
      color: 'orange',
      priority: 'medium'
    },
    {
      id: 9,
      category: 'Nutrition',
      icon: <FaAppleAlt className="text-green-500" />,
      tip: 'Eat colorful vegetables and fruits daily. Different colors provide different nutrients your body needs.',
      color: 'green',
      priority: 'high'
    },
    {
      id: 10,
      category: 'Exercise',
      icon: <FaDumbbell className="text-blue-500" />,
      tip: 'Stretch for 5-10 minutes daily to improve flexibility and reduce injury risk. Focus on major muscle groups.',
      color: 'blue',
      priority: 'medium'
    },
    {
      id: 11,
      category: 'Heart Health',
      icon: <FaHeart className="text-red-500" />,
      tip: 'Limit salt intake to less than 2,300mg per day. High sodium can lead to high blood pressure.',
      color: 'red',
      priority: 'high'
    },
    {
      id: 12,
      category: 'Mental Health',
      icon: <FaBrain className="text-purple-500" />,
      tip: 'Take regular breaks from screens. Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.',
      color: 'purple',
      priority: 'medium'
    },
    {
      id: 13,
      category: 'First Aid',
      icon: <FaLightbulb className="text-yellow-500" />,
      tip: 'For nosebleeds, lean forward and pinch the soft part of the nose for 10 minutes. Don\'t tilt your head back.',
      color: 'yellow',
      priority: 'high'
    },
    {
      id: 14,
      category: 'Nutrition',
      icon: <FaAppleAlt className="text-green-500" />,
      tip: 'Reduce processed foods and added sugars. Choose whole grains, lean proteins, and healthy fats.',
      color: 'green',
      priority: 'high'
    },
    {
      id: 15,
      category: 'First Aid',
      icon: <FaLightbulb className="text-yellow-500" />,
      tip: 'Keep a well-stocked first aid kit at home and in your car. Check and replenish supplies regularly.',
      color: 'yellow',
      priority: 'medium'
    }
  ];

  // Auto-rotate tips
  useEffect(() => {
    if (!isAutoPlay) return;
    
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % healthTips.length);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [isAutoPlay, healthTips.length]);

  const currentTip = healthTips[currentTipIndex];

  const goToTip = (index) => {
    setCurrentTipIndex(index);
    setIsAutoPlay(false);
  };

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % healthTips.length);
    setIsAutoPlay(false);
  };

  const prevTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + healthTips.length) % healthTips.length);
    setIsAutoPlay(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{currentTip.icon}</div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Daily Health Tips
            </h3>
            <p className="text-sm text-gray-600">{currentTip.category}</p>
          </div>
        </div>
        <button
          onClick={() => setIsAutoPlay(!isAutoPlay)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            isAutoPlay 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}
          title={isAutoPlay ? 'Pause auto-rotation' : 'Resume auto-rotation'}
        >
          {isAutoPlay ? '⏸️ Auto' : '▶️ Manual'}
        </button>
      </div>

      {/* Tip Display */}
      <div className={`rounded-lg p-6 mb-4 min-h-[120px] flex items-center border-l-4 ${
        currentTip.color === 'green' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-500' :
        currentTip.color === 'blue' ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-500' :
        currentTip.color === 'purple' ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-500' :
        currentTip.color === 'red' ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-500' :
        currentTip.color === 'yellow' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-500' :
        currentTip.color === 'cyan' ? 'bg-gradient-to-r from-cyan-50 to-cyan-100 border-cyan-500' :
        currentTip.color === 'indigo' ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-500' :
        currentTip.color === 'orange' ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-500' :
        'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-500'
      }`}>
        <p className="text-gray-800 text-lg leading-relaxed">
          {currentTip.tip}
        </p>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevTip}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-semibold transition-all"
        >
          ← Previous
        </button>
        <div className="text-sm text-gray-600">
          Tip {currentTipIndex + 1} of {healthTips.length}
        </div>
        <button
          onClick={nextTip}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-semibold transition-all"
        >
          Next →
        </button>
      </div>

      {/* Tip Dots Navigation */}
      <div className="flex justify-center gap-2 flex-wrap">
        {healthTips.map((tip, index) => (
          <button
            key={tip.id}
            onClick={() => goToTip(index)}
            className={`transition-all rounded-full ${
              index === currentTipIndex 
                ? `w-8 h-2 ${
                    currentTip.color === 'green' ? 'bg-green-600' :
                    currentTip.color === 'blue' ? 'bg-blue-600' :
                    currentTip.color === 'purple' ? 'bg-purple-600' :
                    currentTip.color === 'red' ? 'bg-red-600' :
                    currentTip.color === 'yellow' ? 'bg-yellow-600' :
                    currentTip.color === 'cyan' ? 'bg-cyan-600' :
                    currentTip.color === 'indigo' ? 'bg-indigo-600' :
                    currentTip.color === 'orange' ? 'bg-orange-600' :
                    'bg-gray-600'
                  }` 
                : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
            }`}
            title={tip.category}
          />
        ))}
      </div>

      {/* Category Filter */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Filter by Category:
        </h4>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(healthTips.map(tip => tip.category))).map(category => {
            const categoryTip = healthTips.find(tip => tip.category === category);
            const isActive = currentTip.category === category;
            return (
              <button
                key={category}
                onClick={() => {
                  const index = healthTips.findIndex(tip => tip.category === category);
                  goToTip(index);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? categoryTip.color === 'green' ? 'bg-green-100 text-green-700 border-2 border-green-500' :
                      categoryTip.color === 'blue' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' :
                      categoryTip.color === 'purple' ? 'bg-purple-100 text-purple-700 border-2 border-purple-500' :
                      categoryTip.color === 'red' ? 'bg-red-100 text-red-700 border-2 border-red-500' :
                      categoryTip.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-500' :
                      categoryTip.color === 'cyan' ? 'bg-cyan-100 text-cyan-700 border-2 border-cyan-500' :
                      categoryTip.color === 'indigo' ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500' :
                      categoryTip.color === 'orange' ? 'bg-orange-100 text-orange-700 border-2 border-orange-500' :
                      'bg-gray-100 text-gray-700 border-2 border-gray-500'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fun Fact */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <span className="font-semibold">Did you know?</span>{' '}
          Regular health tips can improve your overall wellness by up to 30% when followed consistently!
        </p>
      </div>
    </div>
  );
};

export default HealthTipsFeed;
