import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaVideo, FaPlay, FaSearch, FaClock, FaEye } from 'react-icons/fa';

const VideoLibrary = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);

  const videos = [
    {
      id: 1,
      title: 'Hands-Only CPR Training',
      description: 'Learn life-saving CPR techniques step by step',
      category: 'CPR Training',
      duration: '3:45',
      views: '5.2M',
      youtubeId: 'Plse2FOkV4Q',
      thumbnail: 'https://img.youtube.com/vi/Plse2FOkV4Q/maxresdefault.jpg',
      level: 'Essential'
    },
    {
      id: 2,
      title: 'First Aid for Choking',
      description: 'Emergency response techniques for choking victims',
      category: 'First Aid',
      duration: '4:12',
      views: '1.1M',
      youtubeId: '8R3RWC-xx1I',
      thumbnail: 'https://img.youtube.com/vi/8R3RWC-xx1I/maxresdefault.jpg',
      level: 'Essential'
    },
    {
      id: 3,
      title: 'Burn Treatment Guide',
      description: 'How to properly treat burns and prevent infection',
      category: 'First Aid',
      duration: '3:32',
      views: '890K',
      youtubeId: 'TLr2qsEhpC8',
      thumbnail: 'https://img.youtube.com/vi/TLr2qsEhpC8/maxresdefault.jpg',
      level: 'Essential'
    },
    {
      id: 4,
      title: 'Emergency Wound Care',
      description: 'Step-by-step wound cleaning and bandaging techniques',
      category: 'Wound Care',
      duration: '5:20',
      views: '2.3M',
      youtubeId: 'in8j2Q2z3HE',
      thumbnail: 'https://img.youtube.com/vi/in8j2Q2z3HE/maxresdefault.jpg',
      level: 'Intermediate'
    },
    {
      id: 5,
      title: 'Fracture and Sprain First Aid',
      description: 'How to handle broken bones and sprains safely',
      category: 'First Aid',
      duration: '4:18',
      views: '450K',
      youtubeId: 'lgccWqSdWzk',
      thumbnail: 'https://img.youtube.com/vi/lgccWqSdWzk/maxresdefault.jpg',
      level: 'Intermediate'
    },
    {
      id: 6,
      title: 'Heart Attack Response',
      description: 'Recognize signs and provide immediate assistance',
      category: 'Emergency Response',
      duration: '3:30',
      views: '3.8M',
      youtubeId: 'Es-Cr9uRXgQ',
      thumbnail: 'https://img.youtube.com/vi/Es-Cr9uRXgQ/maxresdefault.jpg',
      level: 'Essential'
    },
    {
      id: 7,
      title: 'Stroke Warning Signs',
      description: 'Learn F.A.S.T. to identify stroke symptoms quickly',
      category: 'Emergency Response',
      duration: '4:01',
      views: '1.5M',
      youtubeId: 'mkpbbWZvYmw',
      thumbnail: 'https://img.youtube.com/vi/mkpbbWZvYmw/maxresdefault.jpg',
      level: 'Essential'
    },
    {
      id: 8,
      title: 'Severe Bleeding Control',
      description: 'Emergency techniques to stop severe bleeding',
      category: 'First Aid',
      duration: '3:55',
      views: '620K',
      youtubeId: '2v8vlXgGXwE',
      thumbnail: 'https://img.youtube.com/vi/2v8vlXgGXwE/maxresdefault.jpg',
      level: 'Intermediate'
    },
    {
      id: 9,
      title: 'Poisoning Emergency Response',
      description: 'What to do in case of poisoning or toxic exposure',
      category: 'Emergency Response',
      duration: '5:12',
      views: '780K',
      youtubeId: 'lLkw4BXa7pQ',
      thumbnail: 'https://img.youtube.com/vi/lLkw4BXa7pQ/maxresdefault.jpg',
      level: 'Intermediate'
    },
    {
      id: 10,
      title: 'Heat Stroke Prevention & Treatment',
      description: 'Recognize and treat heat-related emergencies',
      category: 'Emergency Response',
      duration: '4:38',
      views: '340K',
      youtubeId: '0xubzGiAjEU',
      thumbnail: 'https://img.youtube.com/vi/0xubzGiAjEU/maxresdefault.jpg',
      level: 'Intermediate'
    },
    {
      id: 11,
      title: 'Seizure First Aid',
      description: 'How to safely help someone having a seizure',
      category: 'Emergency Response',
      duration: '3:47',
      views: '980K',
      youtubeId: 'L6jjyikFwmA',
      thumbnail: 'https://img.youtube.com/vi/L6jjyikFwmA/maxresdefault.jpg',
      level: 'Essential'
    },
    {
      id: 12,
      title: 'Emergency Heimlich Maneuver',
      description: 'Complete guide to performing the Heimlich maneuver',
      category: 'CPR Training',
      duration: '4:21',
      views: '1.2M',
      youtubeId: '1azFuq_yZpE',
      thumbnail: 'https://img.youtube.com/vi/1azFuq_yZpE/maxresdefault.jpg',
      level: 'Intermediate'
    }
  ];

  const categories = ['all', ...new Set(videos.map(v => v.category))];

  const filteredVideos = videos.filter(video => {
    const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getLevelColor = (level) => {
    switch (level) {
      case 'Essential': return 'bg-red-100 text-red-700';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'Advanced': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaVideo className="text-4xl text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {t('videoLibrary') || 'Video Tutorial Library'}
              </h1>
              <p className="text-gray-600">
                {t('videoLibrarySubtitle') || 'Learn emergency response and first aid through professional video tutorials'}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchVideos') || 'Search videos...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? t('allCategories') || 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Video Modal */}
        {selectedVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {selectedVideo.title}
                    </h2>
                    <p className="text-gray-600">{selectedVideo.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Video Player */}
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  <iframe
                    className="w-full rounded-lg"
                    height="400"
                    src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>

                {/* Video Info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-2">
                    <FaClock /> {selectedVideo.duration}
                  </span>
                  <span className="flex items-center gap-2">
                    <FaEye /> {selectedVideo.views} views
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(selectedVideo.level)}`}>
                    {selectedVideo.level}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all overflow-hidden cursor-pointer"
              onClick={() => setSelectedVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative group">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.src = `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                  <FaPlay className="text-white text-4xl opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-semibold">
                  {video.duration}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-800 text-lg flex-1">
                    {video.title}
                  </h3>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {video.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <FaEye /> {video.views}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getLevelColor(video.level)}`}>
                    {video.level}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-indigo-600 font-semibold">
                    {video.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredVideos.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FaVideo className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              {t('noVideosFound') || 'No videos found'}
            </h3>
            <p className="text-gray-500">
              {t('tryDifferentSearch') || 'Try a different search term or category'}
            </p>
          </div>
        )}

        {/* Categories Legend */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {t('skillLevels') || 'Skill Levels'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                Essential
              </span>
              <span className="text-sm text-gray-600">
                {t('essentialDesc') || 'Must-know for everyone'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700">
                Intermediate
              </span>
              <span className="text-sm text-gray-600">
                {t('intermediateDesc') || 'For active responders'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                Advanced
              </span>
              <span className="text-sm text-gray-600">
                {t('advancedDesc') || 'For trained professionals'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoLibrary;
