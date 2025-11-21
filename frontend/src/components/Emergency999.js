import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPhoneAlt, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';

const Emergency999 = () => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('');

  // Panic alarm function
  const playPanicAlarm = () => {
    try {
      // Create audio context for siren
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Siren effect - alternating frequencies
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      let frequency = 800;
      const sirenInterval = setInterval(() => {
        frequency = frequency === 800 ? 1200 : 800;
        oscillator.frequency.value = frequency;
      }, 300);
      
      oscillator.start();
      
      // Stop after 3 seconds
      setTimeout(() => {
        clearInterval(sirenInterval);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
      }, 3000);
      
      // Vibration pattern (mobile only)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
      }
      
      // Flash screen red
      document.body.classList.add('emergency-flash');
      setTimeout(() => {
        document.body.classList.remove('emergency-flash');
      }, 3000);
    } catch (error) {
      console.error('Error playing alarm:', error);
    }
  };

  const handle999Call = async () => {
    setIsCalling(true);
    setCallStatus(t('connecting999'));
    
    // Trigger panic alarm
    playPanicAlarm();

    try {
      // Get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Log the 999 call in our system
            try {
              await axios.post(`${process.env.REACT_APP_API_URL}/emergency/999-call`, {
                location: {
                  type: 'Point',
                  coordinates: [longitude, latitude]
                },
                timestamp: new Date().toISOString()
              });
            } catch (err) {
              console.error('Error logging call:', err);
            }

            // Initiate actual phone call - preferred on mobile devices
            setCallStatus(t('callInitiated'));
            setTimeout(() => {
              try {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                // On mobile devices, trigger tel: to open native dialer
                if (isMobile) {
                  try {
                    window.location.href = 'tel:999';
                    return;
                  } catch (e) {
                    // ignore and fallthrough to copy UI
                  }
                }

                // On desktop (or if tel: handler redirects to another app like WhatsApp), we avoid forcing the protocol handler.
                // Instead show the number and let the user tap/copy it manually to call using their device.
                setCallStatus('999');
              } catch (err) {
                console.error('Error initiating call:', err);
                setCallStatus('999');
              }
            }, 500);
            
            setTimeout(() => {
              // Keep modal open briefly to allow user to see call status/number on desktop
              if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                // Do not auto-close on desktop so user can copy the number
                setIsCalling(false);
              } else {
                setShowModal(false);
                setIsCalling(false);
                setCallStatus('');
              }
            }, 2000);
          },
          (error) => {
            console.error('Geolocation error:', error);
            // Still allow call even without location
            // If geolocation fails, still show number and let user call manually
            setCallStatus('999');
            setTimeout(() => {
              setIsCalling(false);
            }, 1000);
          }
        );
      } else {
        // No geolocation support - still make the call
          // No geolocation support - show number and let user call manually
          setCallStatus('999');
          setTimeout(() => setIsCalling(false), 1000);
      }
    } catch (error) {
      console.error('Error in 999 call:', error);
      // Still make the call even if logging fails
      setCallStatus(t('callInitiated'));
        setTimeout(() => {
          try {
            const a = document.createElement('a');
            a.href = 'tel:999';
            a.style.display = 'none';
            a.rel = 'nofollow noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); }, 2000);
          } catch (err) {
            window.location.href = 'tel:999';
          }
        }, 500);
      
      setTimeout(() => {
        setShowModal(false);
        setIsCalling(false);
        setCallStatus('');
      }, 2000);
    }
  };

  return (
    <>
      {/* 999 Emergency Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed top-20 right-4 z-40 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg shadow-lg transition-all flex items-center gap-2 animate-pulse"
        title={t('call999')}
      >
        <FaPhoneAlt />
        <span className="font-bold">999</span>
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md mx-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <FaExclamationTriangle className="text-red-600 text-3xl" />
                <h2 className="text-xl font-bold text-gray-800">
                  {t('emergencyCall')}
                </h2>
              </div>
              {!isCalling && (
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-800 font-semibold">
                  {t('calling999Warning')}
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p className="mb-2">{t('999Instructions')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('stayCalm')}</li>
                  <li>{t('speakClearly')}</li>
                  <li>{t('provideLocation')}</li>
                  <li>{t('describeEmergency')}</li>
                  <li>{t('followInstructions')}</li>
                </ul>
              </div>

              {callStatus && (
                <div className="text-center text-green-600 font-semibold">
                  {callStatus === '999' ? (
                    <div className="space-y-2">
                      <div className="text-lg font-bold">Call: 999</div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText('999');
                              setCallStatus('Number copied');
                              setTimeout(() => setCallStatus('999'), 1500);
                            } catch (e) {
                              console.error('Copy failed', e);
                            }
                          }}
                          className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg"
                        >
                          Copy Number
                        </button>
                        <a
                          href="tel:999"
                          className="px-3 py-2 bg-red-600 text-white rounded-lg"
                          onClick={(e) => {
                            // allow anchor to open dialer on platforms that support it
                          }}
                        >
                          Open Dialer
                        </a>
                      </div>
                    </div>
                  ) : (
                    callStatus
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handle999Call}
                  disabled={isCalling}
                  className={`flex-1 ${
                    isCalling 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2`}
                >
                  <FaPhoneAlt />
                  {isCalling ? t('calling') : t('call999Now')}
                </button>
                {!isCalling && (
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold transition-all"
                  >
                    {t('cancel')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Emergency999;
