import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFilePdf, FaEye, FaBookMedical, FaExclamationCircle, FaSearch } from 'react-icons/fa';

const OfflineGuides = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const guides = [
    {
      id: 1,
      title: 'CPR Manual',
      description: 'Comprehensive CPR manual from Canadian Red Cross - Digital edition',
      category: 'Emergency Response',
      icon: '❤️',
      color: 'red',
      url: 'https://cdn.redcross.ca/prodmedia/crc/pdf/CPR-Manual_EN_digital.pdf',
      source: 'Canadian Red Cross'
    },
    {
      id: 2,
      title: 'Choking Rescue',
      description: 'Step-by-step choking rescue procedures for adults',
      category: 'Emergency Response',
      icon: '🫁',
      color: 'red',
      url: 'https://healthonline.washington.edu/sites/default/files/record_pdfs/Choking-Rescue-Heimlich-Maneuver-Adults.pdf',
      source: 'University of Washington'
    },
    {
      id: 3,
      title: 'Stop the Bleed Booklet',
      description: 'Emergency bleeding control techniques - Mayo Clinic trauma guide',
      category: 'Wound Care',
      icon: '🩹',
      color: 'orange',
      url: 'https://www.mayoclinichealthsystem.org/-/media/local-files/eau-claire/documents/medical-services/ed-trauma/stop-the-bleed-booklet.pdf?la=en&hash=83DF7E5ECEAFEF39C89ED037FE39CC77',
      source: 'Mayo Clinic'
    },
    {
      id: 4,
      title: 'Best Practice Statement',
      description: 'Professional wound management and care guidelines',
      category: 'Wound Care',
      icon: '🔥',
      color: 'orange',
      url: 'https://wounds-uk.com/wp-content/uploads/2023/02/content_11598.pdf',
      source: 'Wounds UK'
    },
    {
      id: 5,
      title: 'Fractures Sprains and Strains',
      description: 'Complete guide to bone and joint injuries - Treatment and care',
      category: 'Orthopedic Care',
      icon: '🦴',
      color: 'gray',
      url: 'https://footandankleinstitute.com/wp-content/uploads/2022/09/fractures-sprains-and-strains.pdf',
      source: 'Foot & Ankle Institute'
    },
    {
      id: 6,
      title: 'What Are the Warning Signs of Heart Attack',
      description: 'Recognize heart attack symptoms and take immediate action',
      category: 'Cardiac Care',
      icon: '💔',
      color: 'red',
      url: 'https://www.heart.org/en/-/media/Files/Health-Topics/Answers-by-Heart/What-Are-the-Warning-Signs-of-Heart-Attack.pdf',
      source: 'American Heart Association'
    },
    {
      id: 7,
      title: 'Medical Emergencies Diabetes',
      description: 'Managing diabetes emergencies - Hypo and hyperglycemia',
      category: 'Medical Conditions',
      icon: '💉',
      color: 'purple',
      url: 'https://www.cpd4dentalhygienists.co.uk/PDFs/Medical%20Emergencies%20Diabetes2024.pdf',
      source: 'Medical CPD'
    },
    {
      id: 8,
      title: 'Seizure First Aid',
      description: 'How to help someone having a seizure safely',
      category: 'Medical Conditions',
      icon: '🧠',
      color: 'purple',
      url: 'https://epilepsyfoundation.org.au/wp-content/uploads/2023/08/Seizure-First-Aid_2023.pdf',
      source: 'Epilepsy Foundation'
    },
    {
      id: 9,
      title: 'First Aid Management of Poisoning',
      description: 'Emergency response to poisoning incidents - ANZCOR guidelines',
      category: 'Poisoning & Bites',
      icon: '☠️',
      color: 'green',
      url: 'https://www.anzcor.org/assets/anzcor-guidelines/guideline-9-5-1-first-aid-management-of-poisoning-282.pdf',
      source: 'ANZCOR'
    },
    {
      id: 10,
      title: 'Food Allergy Anaphylaxis Emergency Care Plan',
      description: 'Food allergy and anaphylaxis emergency response protocol',
      category: 'Allergies',
      icon: '🤧',
      color: 'yellow',
      url: 'https://www.in.gov/doe/files/sample-food-allergy-anaphylaxis-emergency-care-plan-english.pdf',
      source: 'Indiana DOE'
    },
    {
      id: 11,
      title: 'Hypothermia and Cold Weather Injuries',
      description: 'Frostbite and hypothermia prevention and treatment',
      category: 'Environmental',
      icon: '❄️',
      color: 'blue',
      url: 'https://www.princeton.edu/~oa/files/hypocold.pdf',
      source: 'Princeton University'
    },
    {
      id: 12,
      title: 'Heat Stroke Prevention Bangladesh',
      description: 'Heat-related illness guidelines for Bangladesh - DGHS',
      category: 'Environmental',
      icon: '🌡️',
      color: 'orange',
      url: 'https://dghs.portal.gov.bd/sites/default/files/files/dghs.portal.gov.bd/notices/23e5ad95_395e_4e75_8602_23d266ffd6ca/2024-07-09-04-39-d4da562016555d65823ffb4c2a52a9ef.pdf',
      source: 'Bangladesh DGHS'
    },
    {
      id: 13,
      title: 'Family Guide Booklet Disaster Preparedness',
      description: 'Comprehensive family guide to disaster preparedness - Philippines',
      category: 'Emergency Preparedness',
      icon: '📋',
      color: 'purple',
      url: 'https://plan-international.org/uploads/sites/57/2022/06/IEC-Material-Philippines-Family-Guide-booklet-to-support-disaster-preparednes-enhancement.pdf',
      source: 'Plan International'
    },
    {
      id: 14,
      title: 'First Aid Quick Reference Guide',
      description: 'Complete quick reference guide for all common emergencies',
      category: 'First Aid',
      icon: '🏥',
      color: 'blue',
      url: 'https://unifiedfireut.gov/wp-content/uploads/First-Aid-Quick-Ref-Guide.pdf',
      source: 'Unified Fire Authority'
    }
  ];

  const categories = [...new Set(guides.map(g => g.category))];

  const filteredGuides = guides.filter(guide =>
    guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guide.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (guide) => {
    // Open PDF in new tab for viewing/downloading
    window.open(guide.url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-4">
            <FaBookMedical className="text-5xl text-blue-600 mr-4" />
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                {t('offlineGuides') || 'Offline Medical Guides'}
              </h1>
              <p className="text-gray-600 mt-2">
                Download these official PDF guides from American Red Cross & OSHA to your device for offline access
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-6">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search guides by name, category, or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600">Total Guides</p>
              <p className="text-2xl font-bold text-blue-600">{guides.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-green-600">{categories.length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
              <p className="text-sm text-gray-600">Search Results</p>
              <p className="text-2xl font-bold text-purple-600">{filteredGuides.length}</p>
            </div>
          </div>
        </div>

        {/* Guide Cards */}
        {filteredGuides.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map(guide => (
              <div
                key={guide.id}
                className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border-t-4 flex flex-col ${
                  guide.color === 'red' ? 'border-red-500' :
                  guide.color === 'blue' ? 'border-blue-500' :
                  guide.color === 'orange' ? 'border-orange-500' :
                  guide.color === 'purple' ? 'border-purple-500' :
                  guide.color === 'green' ? 'border-green-500' :
                  guide.color === 'yellow' ? 'border-yellow-500' :
                  guide.color === 'gray' ? 'border-gray-500' :
                  'border-blue-500'
                }`}
              >
                {/* Card Header */}
                <div className={`p-6 flex-grow ${
                  guide.color === 'red' ? 'bg-gradient-to-r from-red-50 to-red-100' :
                  guide.color === 'blue' ? 'bg-gradient-to-r from-blue-50 to-blue-100' :
                  guide.color === 'orange' ? 'bg-gradient-to-r from-orange-50 to-orange-100' :
                  guide.color === 'purple' ? 'bg-gradient-to-r from-purple-50 to-purple-100' :
                  guide.color === 'green' ? 'bg-gradient-to-r from-green-50 to-green-100' :
                  guide.color === 'yellow' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' :
                  guide.color === 'gray' ? 'bg-gradient-to-r from-gray-50 to-gray-100' :
                  'bg-gradient-to-r from-blue-50 to-blue-100'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">{guide.icon}</span>
                    <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm">
                      <FaFilePdf className="text-red-500 mr-1" />
                      <span className="text-xs font-semibold text-gray-700">PDF</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2 min-h-[56px]">{guide.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 min-h-[60px]">{guide.description}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="bg-white px-2 py-1 rounded-full mr-2">{guide.category}</span>
                    <span className="text-xs">• {guide.source}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-gray-50 flex gap-2 mt-auto">
                  <button
                    onClick={() => handleDownload(guide)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-white shadow-md hover:shadow-lg transition-all bg-blue-600 hover:bg-blue-700"
                  >
                    <FaEye />
                    <span>View PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaExclamationCircle className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Guides Found</h3>
            <p className="text-gray-500">
              Try adjusting your search terms or browse all categories
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center">
            <FaBookMedical className="mr-2" />
            How to Use These Guides
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✅ Click "View PDF" to open the official PDF in a new tab</li>
            <li>✅ Right-click and "Save As" to download to your device for offline access</li>
            <li>✅ Print important guides to keep in your first aid kit</li>
            <li>✅ All PDFs are from official sources: Red Cross, Mayo Clinic, DGHS & more</li>
            <li>✅ No registration required - instant access to life-saving information</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OfflineGuides;
