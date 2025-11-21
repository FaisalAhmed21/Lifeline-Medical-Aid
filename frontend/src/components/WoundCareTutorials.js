import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBandAid, FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaHandHoldingMedical, FaTint, FaSprayCan, FaShieldAlt, FaFire, FaThermometerHalf, FaIcicles, FaPills } from 'react-icons/fa';

const WoundCareTutorials = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('cuts');
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

  const woundCareCategories = {
    cuts: {
      name: t('cuts') || 'Cuts & Lacerations',
      icon: FaHandHoldingMedical,
      color: 'red',
      tutorials: [
        {
          step: 1,
          title: t('woundCutsStep1') || 'Stop the Bleeding',
          description: 'Apply direct pressure with a clean cloth or sterile gauze. Maintain pressure for 5-10 minutes without peeking.',
          icon: FaTint,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          warning: 'If bleeding doesn\'t stop after 10 minutes, seek medical help immediately.'
        },
        {
          step: 2,
          title: t('woundCutsStep2') || 'Clean the Wound',
          description: 'Rinse the wound under clean running water for 5 minutes. Use mild soap around (not in) the wound. Pat dry gently.',
          icon: FaSprayCan,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-100',
          warning: 'Avoid hydrogen peroxide or iodine as they can damage tissue.'
        },
        {
          step: 3,
          title: t('woundCutsStep3') || 'Apply Antibiotic',
          description: 'Apply a thin layer of antibiotic ointment (like Neosporin) to prevent infection.',
          icon: FaSprayCan,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-100',
          warning: 'Check for allergic reactions to the ointment.'
        },
        {
          step: 4,
          title: t('woundCutsStep4') || 'Cover with Bandage',
          description: 'Cover with a sterile bandage or gauze. Change daily or when wet/dirty.',
          icon: FaBandAid,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          warning: 'Watch for signs of infection: increased redness, swelling, pus, or fever.'
        }
      ]
    },
    burns: {
      name: t('burns') || 'Burns',
      icon: FaFire,
      color: 'orange',
      tutorials: [
        {
          step: 1,
          title: t('woundBurnsStep1') || 'Cool the Burn',
          description: 'Hold the burned area under cool (not cold) running water for 10-20 minutes. Or apply a cool, wet compress.',
          icon: FaIcicles,
          iconColor: 'text-cyan-600',
          bgColor: 'bg-cyan-100',
          warning: 'Never use ice, butter, or ointments on fresh burns!'
        },
        {
          step: 2,
          title: t('woundBurnsStep2') || 'Remove Tight Items',
          description: 'Gently remove rings, watches, or tight clothing before swelling begins. Don\'t remove stuck clothing.',
          icon: FaHandHoldingMedical,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          warning: 'Don\'t break blisters - they protect against infection.'
        },
        {
          step: 3,
          title: t('woundBurnsStep3') || 'Cover Loosely',
          description: 'Cover with sterile, non-stick bandage or clean cloth. Use loose wrapping to avoid pressure.',
          icon: FaBandAid,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          warning: 'For burns larger than 3 inches or on face/hands/joints, seek medical help.'
        },
        {
          step: 4,
          title: t('woundBurnsStep4') || 'Pain Relief',
          description: 'Take over-the-counter pain reliever (ibuprofen or acetaminophen) if needed.',
          icon: FaPills,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          warning: 'Seek immediate medical help for severe burns or burns on children/elderly.'
        }
      ]
    },
    bruises: {
      name: t('bruises') || 'Bruises & Contusions',
      icon: FaShieldAlt,
      color: 'purple',
      tutorials: [
        {
          step: 1,
          title: t('woundBruisesStep1') || 'Apply Ice',
          description: 'Apply ice pack wrapped in a cloth for 15-20 minutes. Repeat every 2-3 hours for first 24-48 hours.',
          icon: FaIcicles,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-100',
          warning: 'Never apply ice directly to skin - always wrap in cloth.'
        },
        {
          step: 2,
          title: t('woundBruisesStep2') || 'Elevate the Area',
          description: 'Elevate the bruised area above heart level to reduce swelling and pain.',
          icon: FaHandHoldingMedical,
          iconColor: 'text-purple-600',
          bgColor: 'bg-purple-100',
          warning: 'If bruising appears without injury, consult a doctor.'
        },
        {
          step: 3,
          title: t('woundBruisesStep3') || 'Rest the Area',
          description: 'Avoid activities that caused the bruise. Rest helps healing.',
          icon: FaShieldAlt,
          iconColor: 'text-indigo-600',
          bgColor: 'bg-indigo-100',
          warning: 'Large or painful bruises may indicate internal bleeding.'
        },
        {
          step: 4,
          title: t('woundBruisesStep4') || 'Apply Heat (After 48hrs)',
          description: 'After 48 hours, apply warm compress for 10 minutes to increase blood flow and healing.',
          icon: FaThermometerHalf,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          warning: 'Severe bruising or pain that doesn\'t improve needs medical evaluation.'
        }
      ]
    },
    bandaging: {
      name: t('bandaging') || 'Proper Bandaging',
      icon: FaBandAid,
      color: 'blue',
      tutorials: [
        {
          step: 1,
          title: t('woundBandagingStep1') || 'Clean Hands First',
          description: 'Wash your hands thoroughly with soap and water before touching bandages or wounds.',
          icon: FaSprayCan,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-100',
          warning: 'Always use clean or sterile materials for bandaging.'
        },
        {
          step: 2,
          title: t('woundBandagingStep2') || 'Choose Right Size',
          description: 'Select a bandage that covers the entire wound with at least 1 inch overlap on all sides.',
          icon: FaBandAid,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-100',
          warning: 'Too tight bandages can cut off circulation.'
        },
        {
          step: 3,
          title: t('woundBandagingStep3') || 'Apply Properly',
          description: 'Start from the wound outward. Wrap in overlapping layers. Secure with tape or clip.',
          icon: FaHandHoldingMedical,
          iconColor: 'text-purple-600',
          bgColor: 'bg-purple-100',
          warning: 'Check circulation - fingers/toes should be warm and pink.'
        },
        {
          step: 4,
          title: t('woundBandagingStep4') || 'Change Regularly',
          description: 'Change bandages daily or when wet, dirty, or loose. Clean wound each time.',
          icon: FaExclamationTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          warning: 'Watch for signs of infection and seek medical help if needed.'
        }
      ]
    }
  };

  const currentCategory = woundCareCategories[selectedCategory];
  const currentTutorial = currentCategory.tutorials[currentTutorialStep];

  const nextStep = () => {
    if (currentTutorialStep < currentCategory.tutorials.length - 1) {
      setCurrentTutorialStep(currentTutorialStep + 1);
    }
  };

  const prevStep = () => {
    if (currentTutorialStep > 0) {
      setCurrentTutorialStep(currentTutorialStep - 1);
    }
  };

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setCurrentTutorialStep(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaBandAid className="text-4xl text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{t('woundCareTutorials') || 'Wound Care Tutorials'}</h1>
              <p className="text-gray-600">{t('woundCareSubtitle') || 'Step-by-step guides for treating common injuries'}</p>
            </div>
          </div>
          
          <div className="bg-blue-100 border-l-4 border-blue-600 p-4 rounded">
            <p className="text-blue-800 font-semibold">
              ℹ️ {t('woundCareInfo') || 'For serious injuries, deep wounds, or signs of infection, seek professional medical help immediately.'}
            </p>
          </div>
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{t('selectCategory') || 'Select Injury Type'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.keys(woundCareCategories).map((key) => {
              const CategoryIcon = woundCareCategories[key].icon;
              return (
                <button
                  key={key}
                  onClick={() => selectCategory(key)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCategory === key
                      ? `border-${woundCareCategories[key].color}-600 bg-${woundCareCategories[key].color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CategoryIcon className="text-3xl mb-2 mx-auto" />
                  <div className="text-sm font-semibold text-gray-800">
                    {woundCareCategories[key].name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {t('step') || 'Step'} {currentTutorialStep + 1} {t('of') || 'of'} {currentCategory.tutorials.length}
            </span>
            <span className="text-sm text-gray-600">
              {currentCategory.name}
            </span>
          </div>
          <div className="flex gap-2">
            {currentCategory.tutorials.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full transition-all ${
                  index === currentTutorialStep
                    ? `bg-${currentCategory.color}-600`
                    : index < currentTutorialStep
                    ? `bg-${currentCategory.color}-400`
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Tutorial Step */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className={`inline-block bg-${currentCategory.color}-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mb-4`}>
              {currentTutorial.step}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {currentTutorial.title}
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed max-w-2xl mx-auto">
              {currentTutorial.description}
            </p>
          </div>

          {/* Icon Display */}
          <div className={`${currentTutorial.bgColor} rounded-lg p-8 mb-6 min-h-[300px] flex items-center justify-center`}>
            <div className="text-center">
              {React.createElement(currentTutorial.icon, {
                className: `${currentTutorial.iconColor} mx-auto`,
                size: 128
              })}
              <p className="mt-4 text-gray-700 font-medium">{currentTutorial.title}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-6">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-yellow-600 text-xl mt-1" />
              <div>
                <h4 className="font-semibold text-yellow-800 mb-1">{t('warning') || 'Warning'}</h4>
                <p className="text-yellow-700">{currentTutorial.warning}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentTutorialStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                currentTutorialStep === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <FaChevronLeft />
              {t('previous') || 'Previous'}
            </button>

            <button
              onClick={nextStep}
              disabled={currentTutorialStep === currentCategory.tutorials.length - 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                currentTutorialStep === currentCategory.tutorials.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : `bg-${currentCategory.color}-600 text-white hover:bg-${currentCategory.color}-700`
              }`}
            >
              {t('next') || 'Next'}
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{t('allSteps') || 'All Steps'}</h3>
          <div className="space-y-3">
            {currentCategory.tutorials.map((tutorial, index) => (
              <div
                key={index}
                onClick={() => setCurrentTutorialStep(index)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  index === currentTutorialStep
                    ? `border-${currentCategory.color}-600 bg-${currentCategory.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === currentTutorialStep
                      ? `bg-${currentCategory.color}-600 text-white`
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tutorial.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{tutorial.title}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WoundCareTutorials;
