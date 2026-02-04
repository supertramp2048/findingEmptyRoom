/**
 * React Native Client Example
 *
 * App để tìm phòng học trống trên mobile
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Picker,
} from 'react-native';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

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

const EmptyRoomFilterApp: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(2); // Default Monday
  const [startSession, setStartSession] = useState('4');
  const [endSession, setEndSession] = useState('6');
  const [building, setBuilding] = useState('A1');
  const [minContinuous, setMinContinuous] = useState('2');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayNames = {
    2: 'Thứ 2 (Monday)',
    3: 'Thứ 3 (Tuesday)',
    4: 'Thứ 4 (Wednesday)',
    5: 'Thứ 5 (Thursday)',
    6: 'Thứ 6 (Friday)',
    7: 'Thứ 7 (Saturday)',
  };

  const handleSearch = async () => {
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
      setError(err.response?.data?.message || 'Failed to search rooms');
    } finally {
      setLoading(false);
    }
  };

  const renderRoomItem = ({ item }: { item: AvailableRoom }) => (
    <View style={styles.roomCard}>
      <Text style={styles.roomName}>Phòng {item.room}</Text>
      <Text style={styles.slotsLabel}>Tiết trống liên tục:</Text>
      <Text style={styles.slots}>{item.continuous_slots.join(', ')}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tìm Phòng Học Trống</Text>

      {/* Day Picker */}
      <View style={styles.section}>
        <Text style={styles.label}>Thứ:</Text>
        <Picker
          selectedValue={selectedDay}
          onValueChange={setSelectedDay}
          style={styles.picker}
        >
          {Object.entries(dayNames).map(([day, name]) => (
            <Picker.Item key={day} label={name} value={parseInt(day)} />
          ))}
        </Picker>
      </View>

      {/* Session Range */}
      <View style={styles.section}>
        <Text style={styles.label}>Khoảng tiết:</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Từ tiết:</Text>
            <Picker
              selectedValue={startSession}
              onValueChange={setStartSession}
              style={styles.smallPicker}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <Picker.Item key={i} label={i.toString()} value={i.toString()} />
              ))}
            </Picker>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Đến tiết:</Text>
            <Picker
              selectedValue={endSession}
              onValueChange={setEndSession}
              style={styles.smallPicker}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <Picker.Item key={i} label={i.toString()} value={i.toString()} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Building */}
      <View style={styles.section}>
        <Text style={styles.label}>Tòa nhà:</Text>
        <Picker
          selectedValue={building}
          onValueChange={setBuilding}
          style={styles.picker}
        >
          <Picker.Item label="Tòa A1" value="A1" />
          <Picker.Item label="Tòa A2" value="A2" />
          <Picker.Item label="Tòa B1" value="B1" />
          <Picker.Item label="Tòa B2" value="B2" />
        </Picker>
      </View>

      {/* Min Continuous */}
      <View style={styles.section}>
        <Text style={styles.label}>Tiết trống liên tục tối thiểu:</Text>
        <Picker
          selectedValue={minContinuous}
          onValueChange={setMinContinuous}
          style={styles.picker}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Picker.Item key={i} label={i.toString()} value={i.toString()} />
          ))}
        </Picker>
      </View>

      {/* Search Button */}
      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleSearch}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.searchButtonText}>Tìm Phòng Trống</Text>
        )}
      </TouchableOpacity>

      {/* Error Message */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Results */}
      {result && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>
            Kết quả: {dayNames[result.thu]}, Tiết {result.tiet}, Tòa {result.building}
          </Text>

          {result.rooms.length === 0 ? (
            <Text style={styles.noResults}>Không có phòng trống</Text>
          ) : (
            <FlatList
              data={result.rooms}
              renderItem={renderRoomItem}
              keyExtractor={(item) => item.room}
              scrollEnabled={false}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  picker: {
    height: 40,
    backgroundColor: '#f9f9f9',
  },
  smallPicker: {
    height: 40,
    backgroundColor: '#f9f9f9',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FFE5E5',
    borderRadius: 4,
  },
  resultsSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  roomCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  slotsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  slots: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  noResults: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default EmptyRoomFilterApp;
