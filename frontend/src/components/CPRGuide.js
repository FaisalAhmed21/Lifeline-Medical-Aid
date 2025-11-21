import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaHeart, FaArrowLeft, FaArrowRight, FaPlay, FaPause, FaPhone, FaHandPaper, FaBed, FaCompress, FaWind, FaRedoAlt, FaExclamationTriangle } from 'react-icons/fa';

const CPRGuide = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [compressionCount, setCompressionCount] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const cprSteps = [
    {
      step: 1,
      title: t('cprStep1Title') || "Check for Breathing",
      description: t('cprStep1Desc') || "Make sure it's safe to approach. Check if they respond by gently shaking their shoulders and asking loudly 'Are you OK?'. If no response, open their airway by tilting head back and lifting chin. Look, listen and feel for up to 10 seconds for normal breathing.",
      icon: FaBed,
      color: "bg-blue-500",
      duration: "10 seconds"
    },
    {
      step: 2,
      title: t('cprStep2Title') || "Call for Help",
      description: t('cprStep2Desc') || "If not breathing normally, ask a helper to call 999 or 112 for an ambulance while you start CPR. Ask someone to find and bring a defibrillator if available. Use hands-free speaker so you can talk while doing CPR.",
      icon: FaPhone,
      color: "bg-red-500",
      duration: "Immediate"
    },
    {
      step: 3,
      title: t('cprStep3Title') || "Start Chest Compressions",
      description: t('cprStep3Desc') || "Kneel beside the person. Put heel of hand on middle of chest. Put other hand on top and interlock fingers. Lean forward with straight arms. Press down hard 5-6cm deep at 100-120 compressions per minute. Allow chest to come back up fully between compressions.",
      icon: FaCompress,
      color: "bg-purple-500",
      duration: "30 compressions (~18 seconds)",
      hasTimer: true
    },
    {
      step: 4,
      title: t('cprStep4Title') || "Give Rescue Breaths",
      description: t('cprStep4Desc') || "After 30 compressions, give 2 rescue breaths (if trained). Tilt head back, lift chin, pinch nose. Make seal over mouth and blow steadily for 1 second until chest rises. Watch chest fall. Repeat once more. If unable, continue compressions only.",
      icon: FaWind,
      color: "bg-teal-500",
      duration: "2 breaths (2-3 seconds)"
    },
    {
      step: 5,
      title: t('cprStep5Title') || "Continue CPR Cycle",
      description: t('cprStep5Desc') || "Keep alternating 30 chest compressions with 2 rescue breaths (30:2 ratio). Continue until: emergency help arrives, person shows signs of life and breathes normally, you're too exhausted to continue, or a defibrillator is ready.",
      icon: FaRedoAlt,
      color: "bg-green-500",
      duration: "Until help arrives"
    }
  ];

  // Compression timer effect
  useEffect(() => {
    let interval;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  // Metronome for compressions (100-120 BPM)
  useEffect(() => {
    let beepInterval;
    if (isTimerActive && currentStep === 4) { // Step 5 (index 4)
      const bpm = 110; // 110 beats per minute
      const interval = 60000 / bpm; // milliseconds per beat
      
      beepInterval = setInterval(() => {
        // Play beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        
        setCompressionCount(prev => prev + 1);
      }, interval);
    }
    return () => clearInterval(beepInterval);
  }, [isTimerActive, currentStep]);

  const nextStep = () => {
    if (currentStep < cprSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      resetTimer();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      resetTimer();
    }
  };

  const toggleTimer = () => {
    setIsTimerActive(!isTimerActive);
  };

  const resetTimer = () => {
    setIsTimerActive(false);
    setTimeElapsed(0);
    setCompressionCount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaHeart className="text-4xl text-red-600 animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{t('cprGuide') || 'CPR Guide'}</h1>
              <p className="text-gray-600">{t('cprSubtitle') || 'Cardiopulmonary Resuscitation - Step by Step'}</p>
            </div>
          </div>
          
          <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded">
            <p className="text-red-800 font-semibold">
              ⚠️ {t('cprWarning') || 'This is for educational reference only. Get proper CPR training from certified instructors.'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {t('step') || 'Step'} {currentStep + 1} {t('of') || 'of'} {cprSteps.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(((currentStep + 1) / cprSteps.length) * 100)}% {t('complete') || 'Complete'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / cprSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Step Display */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="mb-6 flex justify-center">
              <div className={`${cprSteps[currentStep].color} rounded-full p-12 shadow-lg`}>
                {React.createElement(cprSteps[currentStep].icon, { 
                  className: "text-white",
                  size: 120
                })}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {cprSteps[currentStep].title}
            </h2>
            <p className="text-gray-600 text-lg mb-3">
              {cprSteps[currentStep].description}
            </p>
            <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
              ⏱️ {t('duration') || 'Duration'}: {cprSteps[currentStep].duration}
            </div>
          </div>

          {/* Compression Timer */}
          {cprSteps[currentStep].hasTimer && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
              <div className="text-center mb-4">
                <p className="text-yellow-800 font-bold mb-2">
                  💡 {t('cprTip') || 'Tip: Compress to the beat of "Stayin\' Alive" by Bee Gees (100-120 BPM)'}
                </p>
                <div className="text-4xl font-bold text-yellow-900 mb-2">
                  {compressionCount} / 30
                </div>
                <div className="text-2xl text-yellow-800">
                  {timeElapsed}s
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={toggleTimer}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    isTimerActive 
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isTimerActive ? <><FaPause /> {t('pause') || 'Pause'}</> : <><FaPlay /> {t('startTimer') || 'Start Timer'}</>}
                </button>
                <button
                  onClick={resetTimer}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
                >
                  {t('reset') || 'Reset'}
                </button>
              </div>
              {compressionCount >= 30 && (
                <div className="mt-4 text-center text-green-600 font-bold text-lg animate-bounce">
                  ✅ {t('compressionComplete') || '30 compressions complete! Give 2 rescue breaths.'}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                currentStep === 0 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <FaArrowLeft />
              {t('previous') || 'Previous'}
            </button>

            <button
              onClick={nextStep}
              disabled={currentStep === cprSteps.length - 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                currentStep === cprSteps.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {t('next') || 'Next'}
              <FaArrowRight />
            </button>
          </div>
        </div>

        {/* Video Tutorial */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📹 {t('videoTutorial') || 'Video Tutorial'}</h3>
          <div className="aspect-w-16 aspect-h-9">
            <iframe
              className="w-full rounded-lg"
              height="400"
              src="https://www.youtube.com/embed/hizBdM1Ob68?si=AooS3js0JBPooq08"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Emergency Call Button */}
        <div className="bg-red-600 text-white rounded-lg shadow-lg p-6 text-center">
          <h3 className="text-xl font-bold mb-2">{t('inRealEmergency') || 'In a Real Emergency?'}</h3>
          <p className="mb-4">{t('callProfessionalHelp') || 'Call for professional help immediately!'}</p>
          <a
            href="tel:999"
            className="inline-flex items-center gap-2 bg-white text-red-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all"
          >
            <FaPhone /> {t('call999') || 'Call 999 Now'}
          </a>
        </div>
      </div>
    </div>
  );
};

export default CPRGuide;
