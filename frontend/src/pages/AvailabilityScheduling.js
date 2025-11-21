import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import {
  FaCalendarAlt,
  FaClock,
  FaToggleOn,
  FaToggleOff,
  FaCheckCircle,
  FaTimesCircle,
  FaSave,
  FaPlus,
  FaTrash,
  FaSpinner,
  FaBriefcase,
  FaUserClock
} from 'react-icons/fa';
import './AvailabilityScheduling.css';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

const AvailabilityScheduling = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [lastStatusChange, setLastStatusChange] = useState(null);
  const [workingHours, setWorkingHours] = useState({});
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [newUnavailableDate, setNewUnavailableDate] = useState({
    date: '',
    reason: ''
  });
  const [activeTab, setActiveTab] = useState('duty'); // 'duty', 'schedule', 'dates'

  useEffect(() => {
    if (user && ['doctor', 'volunteer', 'driver'].includes(user.role)) {
      fetchSchedule();
    }
  }, [user]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/schedule');
      if (response.data.success) {
        const data = response.data.data;
        setIsOnDuty(data.isOnDuty || false);
        setLastStatusChange(data.lastStatusChange);
        setWorkingHours(data.workingHours || getDefaultWorkingHours());
        setUnavailableDates(data.unavailableDates || []);
      }
    } catch (error) {
      console.error('Fetch schedule error:', error);
      toast.error('Failed to load schedule');
      setWorkingHours(getDefaultWorkingHours());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultWorkingHours = () => {
    const defaultHours = {};
    DAYS_OF_WEEK.forEach(day => {
      defaultHours[day.key] = {
        available: false,
        start: '09:00',
        end: '17:00'
      };
    });
    return defaultHours;
  };

  const toggleDutyStatus = async () => {
    setSaving(true);
    try {
      const response = await api.put('/users/duty-status', {
        isOnDuty: !isOnDuty
      });
      
      if (response.data.success) {
        setIsOnDuty(response.data.data.isOnDuty);
        setLastStatusChange(response.data.data.lastStatusChange);
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('Toggle duty error:', error);
      toast.error(error.response?.data?.message || 'Failed to update duty status');
    } finally {
      setSaving(false);
    }
  };

  const updateWorkingHours = async () => {
    setSaving(true);
    try {
      const response = await api.put('/users/schedule', { workingHours });
      
      if (response.data.success) {
        toast.success('Schedule updated successfully');
        setWorkingHours(response.data.data.workingHours);
      }
    } catch (error) {
      console.error('Update schedule error:', error);
      toast.error(error.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (dayKey) => {
    setWorkingHours({
      ...workingHours,
      [dayKey]: {
        ...workingHours[dayKey],
        available: !workingHours[dayKey].available
      }
    });
  };

  const handleTimeChange = (dayKey, field, value) => {
    setWorkingHours({
      ...workingHours,
      [dayKey]: {
        ...workingHours[dayKey],
        [field]: value
      }
    });
  };

  const setQuickSchedule = (type) => {
    const newSchedule = {};
    DAYS_OF_WEEK.forEach(day => {
      switch (type) {
        case 'weekdays':
          newSchedule[day.key] = {
            available: !['saturday', 'sunday'].includes(day.key),
            start: '09:00',
            end: '17:00'
          };
          break;
        case '24/7':
          newSchedule[day.key] = {
            available: true,
            start: '00:00',
            end: '23:59'
          };
          break;
        case 'morning':
          newSchedule[day.key] = {
            available: !['saturday', 'sunday'].includes(day.key),
            start: '06:00',
            end: '14:00'
          };
          break;
        case 'evening':
          newSchedule[day.key] = {
            available: !['saturday', 'sunday'].includes(day.key),
            start: '14:00',
            end: '22:00'
          };
          break;
        case 'night':
          newSchedule[day.key] = {
            available: true,
            start: '22:00',
            end: '06:00'
          };
          break;
        default:
          newSchedule[day.key] = {
            available: false,
            start: '09:00',
            end: '17:00'
          };
      }
    });
    setWorkingHours(newSchedule);
  };

  const addUnavailableDate = async () => {
    if (!newUnavailableDate.date) {
      toast.error('Please select a date');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/users/unavailable-dates', newUnavailableDate);
      
      if (response.data.success) {
        setUnavailableDates(response.data.data);
        setNewUnavailableDate({ date: '', reason: '' });
        toast.success('Unavailable date added');
      }
    } catch (error) {
      console.error('Add unavailable date error:', error);
      toast.error(error.response?.data?.message || 'Failed to add date');
    } finally {
      setSaving(false);
    }
  };

  const removeUnavailableDate = async (dateString) => {
    setSaving(true);
    try {
      const updatedDates = unavailableDates.filter(
        d => new Date(d.date).toISOString().split('T')[0] !== dateString
      );
      
      // Note: You'll need to add a DELETE endpoint or update the existing schedule endpoint
      // For now, we'll update through the schedule endpoint
      await api.put('/users/schedule', { 
        workingHours,
        unavailableDates: updatedDates 
      });
      
      setUnavailableDates(updatedDates);
      toast.success('Unavailable date removed');
    } catch (error) {
      console.error('Remove unavailable date error:', error);
      toast.error('Failed to remove date');
    } finally {
      setSaving(false);
    }
  };

  if (!user || !['doctor', 'volunteer', 'driver'].includes(user.role)) {
    return (
      <div className="availability-scheduling">
        <div className="access-denied">
          <FaTimesCircle className="denied-icon" />
          <h2>Access Denied</h2>
          <p>This feature is only available for doctors, volunteers, and drivers.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="availability-scheduling">
        <div className="loading-container">
          <FaSpinner className="loading-spinner" />
          <p>Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="availability-scheduling">
      <div className="scheduling-header">
        <div className="header-content">
          <h1>
            <FaUserClock className="header-icon" />
            Availability & Scheduling
          </h1>
          <p>Manage your duty status, working hours, and time off</p>
        </div>

        {/* Duty Status Card */}
        <div className={`duty-status-card ${isOnDuty ? 'on-duty' : 'off-duty'}`}>
          <div className="status-info">
            <div className="status-badge">
              {isOnDuty ? (
                <>
                  <FaCheckCircle className="status-icon on" />
                  <span>On Duty</span>
                </>
              ) : (
                <>
                  <FaTimesCircle className="status-icon off" />
                  <span>Off Duty</span>
                </>
              )}
            </div>
            {lastStatusChange && (
              <p className="status-time">
                Last changed: {new Date(lastStatusChange).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={toggleDutyStatus}
            disabled={saving}
            className="duty-toggle-btn"
          >
            {saving ? (
              <FaSpinner className="animate-spin" />
            ) : isOnDuty ? (
              <FaToggleOn className="toggle-icon" />
            ) : (
              <FaToggleOff className="toggle-icon" />
            )}
            <span>{isOnDuty ? 'Go Off Duty' : 'Go On Duty'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="scheduling-tabs">
        <button
          className={`tab-btn ${activeTab === 'duty' ? 'active' : ''}`}
          onClick={() => setActiveTab('duty')}
        >
          <FaBriefcase />
          Duty Status
        </button>
        <button
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <FaClock />
          Weekly Schedule
        </button>
        <button
          className={`tab-btn ${activeTab === 'dates' ? 'active' : ''}`}
          onClick={() => setActiveTab('dates')}
        >
          <FaCalendarAlt />
          Time Off
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'duty' && (
          <div className="duty-tab">
            <div className="info-card">
              <h3>About Duty Status</h3>
              <div className="info-grid">
                <div className="info-item">
                  <FaCheckCircle className="info-icon on" />
                  <div>
                    <h4>On Duty</h4>
                    <p>You will receive emergency assignments based on your schedule</p>
                  </div>
                </div>
                <div className="info-item">
                  <FaTimesCircle className="info-icon off" />
                  <div>
                    <h4>Off Duty</h4>
                    <p>You will not receive any emergency assignments</p>
                  </div>
                </div>
              </div>
              <div className="tips-section">
                <h4>💡 Tips:</h4>
                <ul>
                  <li>Toggle off duty during breaks or when you're unavailable</li>
                  <li>Your weekly schedule still applies when on duty</li>
                  <li>System respects your unavailable dates automatically</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="schedule-tab">
            <div className="quick-schedules">
              <h3>Quick Schedule Templates</h3>
              <div className="template-buttons">
                <button onClick={() => setQuickSchedule('weekdays')} className="template-btn">
                  Weekdays (9 AM - 5 PM)
                </button>
                <button onClick={() => setQuickSchedule('24/7')} className="template-btn">
                  24/7 Availability
                </button>
                <button onClick={() => setQuickSchedule('morning')} className="template-btn">
                  Morning Shift (6 AM - 2 PM)
                </button>
                <button onClick={() => setQuickSchedule('evening')} className="template-btn">
                  Evening Shift (2 PM - 10 PM)
                </button>
                <button onClick={() => setQuickSchedule('night')} className="template-btn">
                  Night Shift (10 PM - 6 AM)
                </button>
              </div>
            </div>

            <div className="schedule-grid">
              {DAYS_OF_WEEK.map((day) => {
                const daySchedule = workingHours[day.key] || { available: false, start: '09:00', end: '17:00' };
                return (
                  <div key={day.key} className={`day-card ${daySchedule.available ? 'available' : 'unavailable'}`}>
                    <div className="day-header">
                      <div className="day-info">
                        <h4>{day.label}</h4>
                        <span className={`availability-badge ${daySchedule.available ? 'yes' : 'no'}`}>
                          {daySchedule.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDayToggle(day.key)}
                        className={`toggle-btn ${daySchedule.available ? 'on' : 'off'}`}
                      >
                        {daySchedule.available ? <FaToggleOn /> : <FaToggleOff />}
                      </button>
                    </div>

                    {daySchedule.available && (
                      <div className="time-inputs">
                        <div className="time-input-group">
                          <label>Start Time</label>
                          <select
                            value={daySchedule.start}
                            onChange={(e) => handleTimeChange(day.key, 'start', e.target.value)}
                          >
                            {TIME_SLOTS.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                        <div className="time-separator">→</div>
                        <div className="time-input-group">
                          <label>End Time</label>
                          <select
                            value={daySchedule.end}
                            onChange={(e) => handleTimeChange(day.key, 'end', e.target.value)}
                          >
                            {TIME_SLOTS.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={updateWorkingHours}
              disabled={saving}
              className="save-schedule-btn"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Save Weekly Schedule
            </button>
          </div>
        )}

        {activeTab === 'dates' && (
          <div className="dates-tab">
            <div className="add-date-section">
              <h3>Add Unavailable Date</h3>
              <div className="add-date-form">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={newUnavailableDate.date}
                    onChange={(e) => setNewUnavailableDate({
                      ...newUnavailableDate,
                      date: e.target.value
                    })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label>Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Vacation, Medical Leave, Personal Day"
                    value={newUnavailableDate.reason}
                    onChange={(e) => setNewUnavailableDate({
                      ...newUnavailableDate,
                      reason: e.target.value
                    })}
                  />
                </div>
                <button
                  onClick={addUnavailableDate}
                  disabled={saving || !newUnavailableDate.date}
                  className="add-date-btn"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                  Add Date
                </button>
              </div>
            </div>

            <div className="unavailable-dates-list">
              <h3>Upcoming Unavailable Dates</h3>
              {unavailableDates.length === 0 ? (
                <div className="empty-dates">
                  <FaCalendarAlt className="empty-icon" />
                  <p>No unavailable dates scheduled</p>
                </div>
              ) : (
                <div className="dates-grid">
                  {unavailableDates
                    .filter(d => new Date(d.date) >= new Date())
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map((unavailableDate, index) => (
                      <div key={index} className="date-card">
                        <div className="date-info">
                          <FaCalendarAlt className="date-icon" />
                          <div>
                            <div className="date-value">
                              {new Date(unavailableDate.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            {unavailableDate.reason && (
                              <div className="date-reason">{unavailableDate.reason}</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeUnavailableDate(new Date(unavailableDate.date).toISOString().split('T')[0])}
                          className="remove-date-btn"
                          disabled={saving}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityScheduling;
