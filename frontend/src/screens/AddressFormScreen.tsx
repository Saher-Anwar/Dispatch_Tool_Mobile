import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import mapboxClient from '@mapbox/mapbox-sdk';
import mapboxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic2FoZXJhbndhciIsImEiOiJjbWdmMHoyZWkwMHRkMm9vcG1mMzN1eXkyIn0.-F9FQrAPgai3rRlOUrkeXg';

interface AddressSuggestion {
  id: string;
  place_name: string;
  text: string;
}

export const AddressFormScreen = () => {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const geocodingClient = mapboxGeocoding(mapboxClient({ accessToken: MAPBOX_ACCESS_TOKEN }));

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await geocodingClient
        .forwardGeocode({
          query,
          limit: 5,
          types: ['address', 'poi'],
        })
        .send();

      const results = response.body.features.map((feature: any) => ({
        id: feature.id,
        place_name: feature.place_name,
        text: feature.text,
      }));

      setSuggestions(results);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (address) {
        searchAddresses(address);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [address]);

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion.place_name);
    setAddress(suggestion.place_name);
    setSuggestions([]);
  };

  const handleSubmit = () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select an address');
      return;
    }
    Alert.alert('Success', `Selected address: ${selectedAddress}`);
  };

  const renderSuggestion = ({ item }: { item: AddressSuggestion }) => (
    <TouchableOpacity
      className={styles.suggestionItem}
      onPress={() => handleAddressSelect(item)}
    >
      <Text className={styles.suggestionText}>{item.place_name}</Text>
    </TouchableOpacity>
  );

  return (
    <View className={styles.container}>
      <View className={styles.formContainer}>
        <Text className={styles.title}>Enter Your Address</Text>
        
        <View className={styles.inputContainer}>
          <Text className={styles.label}>Address</Text>
          <TextInput
            className={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Start typing your address..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {suggestions.length > 0 && (
          <View className={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.id}
              className={styles.suggestionsList}
            />
          </View>
        )}

        {selectedAddress ? (
          <View className={styles.selectedContainer}>
            <Text className={styles.selectedLabel}>Selected Address:</Text>
            <Text className={styles.selectedAddress}>{selectedAddress}</Text>
          </View>
        ) : null}

        <TouchableOpacity 
          className={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text className={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = {
  container: `flex-1 bg-gray-50 p-4`,
  formContainer: `bg-white rounded-lg p-6 shadow-sm`,
  title: `text-2xl font-bold text-gray-800 mb-6 text-center`,
  inputContainer: `mb-4`,
  label: `text-sm font-medium text-gray-700 mb-2`,
  input: `border border-gray-300 rounded-lg px-4 py-3 text-base bg-white`,
  suggestionsContainer: `mt-2 bg-white border border-gray-200 rounded-lg max-h-48`,
  suggestionsList: ``,
  suggestionItem: `px-4 py-3 border-b border-gray-100`,
  suggestionText: `text-gray-800`,
  selectedContainer: `bg-blue-50 p-4 rounded-lg mb-4`,
  selectedLabel: `text-sm font-medium text-blue-800 mb-1`,
  selectedAddress: `text-blue-900`,
  submitButton: `bg-blue-600 py-3 px-6 rounded-lg mt-4`,
  submitButtonText: `text-white text-center font-semibold text-base`,
};