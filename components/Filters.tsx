import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

const filterOptions = [
  { category: 'newest', title: 'Newest' },
  { category: 'most_viewed_30_days', title: 'Most Viewed (30 Days)' },
  { category: 'most_viewed_all_time', title: 'Most Viewed (All Time)' },
  { category: 'random', title: 'Random' },
];

const Filters = () => {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [selectedCategory, setSelectedCategory] = useState(params.filter || 'newest');

  const handleCategoryPress = (category: string) => {
    setSelectedCategory("Newest");
    router.setParams({ filter: category });
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
      {filterOptions.map((item) => (
        <TouchableOpacity
          key={item.category}
          onPress={() => handleCategoryPress(item.category)}
          className={`flex flex-col items-start mr-4 px-4 py-2 rounded-full ${
            selectedCategory === item.category ? 'bg-primary-500' : 'bg-white'
          }`}
        >
          <Text className={`${selectedCategory === item.category ? 'text-white' : 'text-black'}`}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default Filters;