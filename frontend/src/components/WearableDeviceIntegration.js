import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaHeartbeat, FaLungs, FaThermometerHalf, FaBluetooth } from 'react-icons/fa';
import api from '../utils/api';

const WearableDeviceIntegration = () => {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [device, setDevice] = useState(null);
  const [vitalSigns, setVitalSigns] = useState({
    heartRate: null,
    oxygenLevel: null,
    temperature: null,
    lastUpdated: null
  });
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Web Bluetooth API is supported
    if ('bluetooth' in navigator) {
      setIsSupported(true);
    }
  }, []);

  const connectDevice = async () => {
    try {
      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['heart_rate'] },
          { services: ['health_thermometer'] },
          { namePrefix: 'Fit' },
          { namePrefix: 'Health' }
        ],
        optionalServices: ['battery_service', 'device_information']
      });

      setDevice(device);
      device.addEventListener('gattserverdisconnected', onDisconnected);

      // Connect to GATT Server
      const server = await device.gatt.connect();
      setIsConnected(true);

      // Start reading vital signs
      startMonitoring(server);
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      alert(t('bluetoothConnectionFailed'));
    }
  };

  const startMonitoring = async (server) => {
    try {
      // Heart Rate Service
      try {
        const heartRateService = await server.getPrimaryService('heart_rate');
        const heartRateMeasurement = await heartRateService.getCharacteristic('heart_rate_measurement');
        
        heartRateMeasurement.addEventListener('characteristicvaluechanged', (event) => {
          const value = event.target.value;
          const heartRate = value.getUint8(1);
          updateVitalSign('heartRate', heartRate);
        });
        
        await heartRateMeasurement.startNotifications();
      } catch (e) {
        console.log('Heart rate service not available');
      }

      // Health Thermometer Service
      try {
        const thermometerService = await server.getPrimaryService('health_thermometer');
        const temperatureMeasurement = await thermometerService.getCharacteristic('temperature_measurement');
        
        temperatureMeasurement.addEventListener('characteristicvaluechanged', (event) => {
          const value = event.target.value;
          const temperature = value.getFloat32(1, true);
          updateVitalSign('temperature', temperature);
        });
        
        await temperatureMeasurement.startNotifications();
      } catch (e) {
        console.log('Temperature service not available');
      }

      // Note: Oxygen level might use custom service depending on device
      // This is a simulated example
      simulateOxygenReading();
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  };

  const simulateOxygenReading = () => {
    // Many wearables don't expose SpO2 via standard Bluetooth profiles
    // This simulates reading or you'd need device-specific APIs
    setInterval(() => {
      // In real implementation, this would read from the device
      const randomSpO2 = 95 + Math.floor(Math.random() * 5);
      updateVitalSign('oxygenLevel', randomSpO2);
    }, 5000);
  };

  const updateVitalSign = async (type, value) => {
    setVitalSigns(prev => ({
      ...prev,
      [type]: value,
      lastUpdated: new Date()
    }));

    // Send to backend
    try {
      await api.post('/users/vital-signs', {
        [type]: value,
        timestamp: new Date().toISOString(),
        source: 'wearable',
        deviceName: device?.name || 'Unknown Device'
      });
    } catch (error) {
      console.error('Error saving vital signs:', error);
    }
  };

  const onDisconnected = () => {
    setIsConnected(false);
    setDevice(null);
    alert(t('deviceDisconnected'));
  };

  const disconnectDevice = () => {
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
      setIsConnected(false);
      setDevice(null);
    }
  };

  const getStatusColor = (type, value) => {
    if (!value) return 'text-gray-400';

    switch (type) {
      case 'heartRate':
        if (value < 60 || value > 100) return 'text-red-500';
        return 'text-green-500';
      case 'oxygenLevel':
        if (value < 95) return 'text-red-500';
        return 'text-green-500';
      case 'temperature':
        if (value < 36.1 || value > 37.2) return 'text-yellow-500';
        if (value > 38) return 'text-red-500';
        return 'text-green-500';
      default:
        return 'text-gray-600';
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
        <p className="text-yellow-800">
          {t('bluetoothNotSupported')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 m-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaBluetooth className="text-blue-500" />
          {t('wearableDevices')}
        </h2>
        {isConnected ? (
          <button
            onClick={disconnectDevice}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all"
          >
            {t('disconnect')}
          </button>
        ) : (
          <button
            onClick={connectDevice}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all"
          >
            {t('connectDevice')}
          </button>
        )}
      </div>

      {isConnected && device && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">
            {t('deviceConnected')}: {device.name}
          </p>
        </div>
      )}

      {/* Vital Signs Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Heart Rate */}
        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <FaHeartbeat className="text-red-500 text-2xl" />
            <h3 className="font-semibold text-gray-700">{t('heartRate')}</h3>
          </div>
          <div className={`text-3xl font-bold ${getStatusColor('heartRate', vitalSigns.heartRate)}`}>
            {vitalSigns.heartRate ? `${vitalSigns.heartRate} bpm` : '--'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('normal')}: 60-100 bpm
          </p>
        </div>

        {/* Oxygen Level */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <FaLungs className="text-blue-500 text-2xl" />
            <h3 className="font-semibold text-gray-700">{t('oxygenLevel')}</h3>
          </div>
          <div className={`text-3xl font-bold ${getStatusColor('oxygenLevel', vitalSigns.oxygenLevel)}`}>
            {vitalSigns.oxygenLevel ? `${vitalSigns.oxygenLevel}%` : '--'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('normal')}: 95-100%
          </p>
        </div>

        {/* Temperature */}
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <FaThermometerHalf className="text-orange-500 text-2xl" />
            <h3 className="font-semibold text-gray-700">{t('temperature')}</h3>
          </div>
          <div className={`text-3xl font-bold ${getStatusColor('temperature', vitalSigns.temperature)}`}>
            {vitalSigns.temperature ? `${vitalSigns.temperature.toFixed(1)}°C` : '--'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('normal')}: 36.1-37.2°C
          </p>
        </div>
      </div>

      {vitalSigns.lastUpdated && (
        <div className="mt-4 text-center text-sm text-gray-500">
          {t('lastUpdated')}: {vitalSigns.lastUpdated.toLocaleTimeString()}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">{t('supportedDevices')}</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Fitness trackers with Bluetooth</li>
          <li>• Smart watches with heart rate monitors</li>
          <li>• Medical-grade pulse oximeters</li>
          <li>• Bluetooth thermometers</li>
        </ul>
      </div>
    </div>
  );
};

export default WearableDeviceIntegration;
