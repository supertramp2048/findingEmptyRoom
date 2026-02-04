/**
 * Web Client Example (React + TypeScript)
 *
 * Desktop application để tìm phòng học trống
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmptyRoomFilter.css';

interface AvailableRoom {
  room: string;
  continuous_slots: number[];
}

interface SearchResult {
  thu: number;
  tiet: string;
  building: string;
  rooms: AvailableRoom[];
}

interface Stats {
  total_schedules: number;
  total_buildings: number;
  total_rooms: number;
}

const API_BASE_URL = 'http://localhost:3000/api';

const EmptyRoomFilterWeb: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(2);
  const [startSession, setStartSession] = useState('4');
  const [endSession, setEndSession] = useState('6');
  const [building, setBuilding] = useState('A1');
  const [minContinuous, setMinContinuous] = useState('2');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const dayNames: Record<number, string> = {
    2: 'Thứ 2 (Monday)',
    3: 'Thứ 3 (Tuesday)',
    4: 'Thứ 4 (Wednesday)',
    5: 'Thứ 5 (Thursday)',
    6: 'Thứ 6 (Friday)',
    7: 'Thứ 7 (Saturday)',
  };

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/schedule/stats`);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/rooms/available`, {
        params: {
          thu: selectedDay,
          tiet_bd: parseInt(startSession),
          tiet_kt: parseInt(endSession),
          building,
          min_continuous: parseInt(minContinuous),
        },
      });

      setResult(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to search rooms',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/schedule/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert(`Success! Imported ${response.data.rows_imported} schedules`);
      loadStats(); // Reload stats
      e.target.value = ''; // Reset file input
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🏫 Empty Room Finder</h1>
        <p>Find available classrooms based on schedule</p>
      </header>

      {/* Stats */}
      {stats && (
        <div className="stats-card">
          <div className="stat-item">
            <span className="stat-label">Total Schedules</span>
            <span className="stat-value">{stats.total_schedules}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Buildings</span>
            <span className="stat-value">{stats.total_buildings}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Rooms</span>
            <span className="stat-value">{stats.total_rooms}</span>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="upload-section">
        <h2>📤 Upload Schedule</h2>
        <div className="upload-area">
          <label className="file-input-label">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploadLoading}
            />
            <span>{uploadLoading ? 'Uploading...' : 'Click to select Excel file'}</span>
          </label>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <h2>🔍 Find Available Rooms</h2>

        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label htmlFor="day">Day of Week:</label>
            <select
              id="day"
              value={selectedDay}
              onChange={(e) => setSelectedDay(parseInt(e.target.value))}
            >
              {Object.entries(dayNames).map(([day, name]) => (
                <option key={day} value={day}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start">Start Session:</label>
              <select value={startSession} onChange={(e) => setStartSession(e.target.value)}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="end">End Session:</label>
              <select value={endSession} onChange={(e) => setEndSession(e.target.value)}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="building">Building:</label>
              <select value={building} onChange={(e) => setBuilding(e.target.value)}>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="continuous">Min Continuous Sessions:</label>
              <select
                value={minContinuous}
                onChange={(e) => setMinContinuous(e.target.value)}
              >
                {Array.from({ length: 5 }, (_, i) => i + 1).map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Error */}
        {error && <div className="error-message">{error}</div>}

        {/* Results */}
        {result && (
          <div className="results-section">
            <h3>
              Results: {dayNames[result.thu]}, Sessions {result.tiet}, Building {result.building}
            </h3>

            {result.rooms.length === 0 ? (
              <p className="no-results">No available rooms</p>
            ) : (
              <div className="rooms-grid">
                {result.rooms.map((room) => (
                  <div key={room.room} className="room-card">
                    <h4>Room {room.room}</h4>
                    <div className="slots-info">
                      <span className="label">Available Sessions:</span>
                      <span className="slots">{room.continuous_slots.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyRoomFilterWeb;
