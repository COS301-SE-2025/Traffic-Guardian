import React, { useEffect, useState } from "react";
import { 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView, 
  Alert, 
  Dimensions, 
  RefreshControl,
  Animated,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from "../services/socketProvider";
import { useSession } from "../services/sessionContext";
import { useTheme } from "../services/themeContext";
import { globalStyles } from "../styles/globalStyles";
import { typography } from "../styles/typography";
import { useTraffic } from "../services/trafficContext";
import { PieChart, BarChart, LineChart } from "react-native-chart-kit";
import { EnhancedNavigation } from "../components/EnhancedNavigation";
import { LoadingSpinner, SkeletonLoader } from "../components/LoadingComponents";

const screenWidth = Dimensions.get("window").width;

// API helper function
const getBaseUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  } else if (Platform.OS === "ios") {
    return "http://localhost:5000";
  } else {
    return "http://localhost:5000";
  }
};

interface AnalyticsData {
  hourlyTrends: { hour: string; incidents: number }[];
  weeklyTrends: { day: string; incidents: number }[];
  responseTime: { average: number; trend: 'up' | 'down' | 'stable' };
  topLocations: { location: string; count: number; change: number }[];
  severityDistribution: { low: number; medium: number; high: number; critical: number };
}

export default function Analytics() {
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useSession();
  const { currentColors, isDark } = useTheme();
  const { 
    traffic, 
    criticalIncidents, 
    incidentCategory, 
    incidentLocations 
  } = useTraffic();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedChart, setSelectedChart] = useState<'categories' | 'locations' | 'trends'>('categories');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAnalyticsData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [selectedTimeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      // Fetch real analytics data from your backend
      const response = await fetch(`${getBaseUrl()}/api/analytics?timeRange=${selectedTimeRange}`, {
        headers: user ? { "X-API-KEY": user.apiKey } : {},
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Analytics error:', error);
      Alert.alert('Error', 'Failed to load analytics data');
      // Set empty state instead of mock data
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const chartConfig = {
    backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
    backgroundGradientFrom: isDark ? currentColors.dark.surface : currentColors.surface.light,
    backgroundGradientTo: isDark ? currentColors.dark.surface : currentColors.surface.light,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(217, 119, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark 
      ? `rgba(255, 255, 255, ${opacity})` 
      : `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForLabels: {
      fontSize: 12,
    },
  };

  // Enhanced pie chart data with better colors
  const enhancedPieData = incidentCategory?.categories?.map((cat: string, i: number) => {
    const colors = [
      '#ef4444', // Red
      '#f59e0b', // Orange  
      '#3b82f6', // Blue
      '#10b981', // Green
      '#8b5cf6', // Purple
      '#f97316', // Orange-red
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#f43f5e', // Rose
      '#6366f1', // Indigo
      '#14b8a6', // Teal
      '#a855f7', // Violet
      '#d946ef', // Fuchsia
    ];
    
    return {
      name: cat.length > 12 ? cat.substring(0, 12) + '...' : cat,
      population: Number((incidentCategory.percentages[i] * 100).toFixed(1)),
      color: colors[i % colors.length],
      legendFontColor: isDark ? currentColors.dark.text : currentColors.text.primary,
      legendFontSize: 12,
    };
  }).filter((item: any) => item.population > 0) || [];

  // Enhanced bar chart data
  const enhancedBarData = {
    labels: incidentLocations?.slice(0, 6).map((loc: any) => 
      loc.location.length > 8 ? loc.location.substring(0, 8) : loc.location
    ) || [],
    datasets: [
      {
        data: incidentLocations?.slice(0, 6).map((loc: any) => loc.amount) || [],
        colors: incidentLocations?.slice(0, 6).map(() => (opacity = 1) => currentColors.primary.main) || [],
      },
    ],
  };

  // Line chart for trends
  const trendData = {
    labels: analyticsData?.hourlyTrends.map(item => item.hour) || [],
    datasets: [
      {
        data: analyticsData?.hourlyTrends.map(item => item.incidents) || [],
        color: (opacity = 1) => currentColors.primary.main,
        strokeWidth: 3,
      },
    ],
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon, 
    color = currentColors.primary.main 
  }: {
    title: string;
    value: string | number;
    change?: { value: number; trend: 'up' | 'down' | 'stable' };
    icon: string;
    color?: string;
  }) => (
    <View
      style={{
        backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
        borderRadius: 16,
        padding: 20,
        margin: 8,
        flex: 1,
        minHeight: 120,
        borderWidth: 1,
        borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              ...typography.statValue,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontSize: 28,
              marginBottom: 8,
            }}
          >
            {value}
          </Text>
          {change && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={change.trend === 'up' ? 'trending-up' : change.trend === 'down' ? 'trending-down' : 'remove'}
                size={16}
                color={change.trend === 'up' ? currentColors.success : change.trend === 'down' ? currentColors.error : currentColors.text.secondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  ...typography.bodySmall,
                  color: change.trend === 'up' ? currentColors.success : change.trend === 'down' ? currentColors.error : currentColors.text.secondary,
                  fontWeight: '600',
                }}
              >
                {change.value > 0 ? '+' : ''}{change.value}%
              </Text>
            </View>
          )}
        </View>
        <View
          style={{
            backgroundColor: color + '20',
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
      </View>
    </View>
  );

  if (loading && !analyticsData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light }}>
        <View style={{ padding: 20 }}>
          <SkeletonLoader width={200} height={24} style={{ marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <SkeletonLoader width={(screenWidth - 60) / 2} height={120} style={{ marginRight: 10 }} />
            <SkeletonLoader width={(screenWidth - 60) / 2} height={120} />
          </View>
          <SkeletonLoader width={screenWidth - 40} height={250} style={{ marginBottom: 20 }} />
          <SkeletonLoader width={screenWidth - 40} height={200} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={currentColors.primary.main}
              colors={[currentColors.primary.main]}
            />
          }
        >
          <View style={{
            backgroundColor: currentColors.primary.main,
            paddingVertical: 20,
            paddingHorizontal: 20,
          }}>
            <Text style={{
              ...typography.h2,
              color: currentColors.text.light,
              fontWeight: '600',
              marginBottom: 8,
            }}>
              Traffic Analytics
            </Text>
            <Text style={{
              ...typography.body,
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Insights and trends from traffic data
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 12,
                padding: 4,
                borderWidth: 1,
                borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
              }}
            >
              {[
                { label: '24 Hours', value: '24h' as const },
                { label: '7 Days', value: '7d' as const },
                { label: '30 Days', value: '30d' as const },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSelectedTimeRange(option.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: selectedTimeRange === option.value
                      ? currentColors.primary.main
                      : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      ...typography.body,
                      color: selectedTimeRange === option.value
                        ? '#fff'
                        : isDark ? currentColors.dark.text : currentColors.text.primary,
                      fontWeight: selectedTimeRange === option.value ? '600' : '400',
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: 12 }}>
            <View style={{ flexDirection: 'row' }}>
              <StatCard
                title="Critical Incidents"
                value={criticalIncidents?.Amount || 0}
                change={{ value: -12, trend: 'down' }}
                icon="warning"
                color={currentColors.error}
              />
              <StatCard
                title="Avg Response Time"
                value={`${analyticsData?.responseTime.average || 0}m`}
                change={{ 
                  value: analyticsData?.responseTime.trend === 'down' ? -8 : analyticsData?.responseTime.trend === 'up' ? 5 : 0, 
                  trend: analyticsData?.responseTime.trend || 'stable' 
                }}
                icon="time"
                color={currentColors.success}
              />
            </View>
            <View style={{ flexDirection: 'row' }}>
              <StatCard
                title="Total Locations"
                value={incidentLocations?.length || 0}
                change={{ value: 3, trend: 'up' }}
                icon="location"
                color={currentColors.secondary.main}
              />
              <StatCard
                title="Active Incidents"
                value={traffic ? Object.values(traffic).reduce((sum: number, area: any) => sum + (area.incidents?.length || 0), 0) : 0}
                change={{ value: -15, trend: 'down' }}
                icon="pulse"
                color={currentColors.warning}
              />
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Text style={{
              ...typography.h3,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              marginBottom: 12,
              fontWeight: '600',
            }}>
              Data Visualization
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { label: 'Categories', value: 'categories' as const, icon: 'pie-chart' },
                { label: 'Locations', value: 'locations' as const, icon: 'bar-chart' },
                { label: 'Trends', value: 'trends' as const, icon: 'trending-up' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSelectedChart(option.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    marginRight: 12,
                    backgroundColor: selectedChart === option.value
                      ? currentColors.primary.main
                      : isDark ? currentColors.dark.surface : currentColors.surface.light,
                    borderWidth: 1,
                    borderColor: selectedChart === option.value
                      ? currentColors.primary.main
                      : isDark ? currentColors.dark.border : currentColors.border.light,
                  }}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={16}
                    color={selectedChart === option.value
                      ? '#fff'
                      : isDark ? currentColors.dark.text : currentColors.text.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: selectedChart === option.value
                        ? '#fff'
                        : isDark ? currentColors.dark.text : currentColors.text.primary,
                      fontWeight: '600',
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            {selectedChart === 'categories' && enhancedPieData.length > 0 && (
              <View style={{
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
              }}>
                <Text style={{
                  ...typography.h4,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  textAlign: "center",
                  fontWeight: "600",
                  marginBottom: 16,
                }}>
                  Incident Categories
                </Text>
                <PieChart
                  data={enhancedPieData}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            )}

            {selectedChart === 'locations' && incidentLocations && (
              <View style={{
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
              }}>
                <Text style={{
                  ...typography.h4,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  textAlign: "center",
                  fontWeight: "600",
                  marginBottom: 16,
                }}>
                  Top Incident Locations
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={enhancedBarData}
                    width={Math.max(screenWidth - 64, enhancedBarData.labels.length * 80)}
                    height={220}
                    chartConfig={chartConfig}
                    verticalLabelRotation={30}
                    fromZero
                    showValuesOnTopOfBars
                    style={{ borderRadius: 16 }}
                  />
                </ScrollView>
              </View>
            )}

            {selectedChart === 'trends' && analyticsData?.hourlyTrends && (
              <View style={{
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
              }}>
                <Text style={{
                  ...typography.h4,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  textAlign: "center",
                  fontWeight: "600",
                  marginBottom: 16,
                }}>
                  Hourly Incident Trends
                </Text>
                <LineChart
                  data={trendData}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={{ borderRadius: 16 }}
                />
              </View>
            )}
          </View>

          {analyticsData?.topLocations && (
            <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
              <Text style={{
                ...typography.h3,
                color: isDark ? currentColors.dark.text : currentColors.text.primary,
                marginBottom: 16,
                fontWeight: '600',
              }}>
                Top Incident Locations
              </Text>
              {analyticsData.topLocations.map((location, index) => (
                <View
                  key={location.location}
                  style={{
                    backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: currentColors.primary.main,
                      borderRadius: 20,
                      width: 40,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16,
                    }}
                  >
                    <Text style={{
                      ...typography.body,
                      color: '#fff',
                      fontWeight: '700',
                    }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      ...typography.body,
                      color: isDark ? currentColors.dark.text : currentColors.text.primary,
                      fontWeight: '600',
                    }}>
                      {location.location}
                    </Text>
                    <Text style={{
                      ...typography.bodySmall,
                      color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
                    }}>
                      {location.count} incidents
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: location.change >= 0 ? currentColors.success + '20' : currentColors.error + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}>
                      <Ionicons
                        name={location.change >= 0 ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={location.change >= 0 ? currentColors.success : currentColors.error}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={{
                        ...typography.caption,
                        color: location.change >= 0 ? currentColors.success : currentColors.error,
                        fontWeight: '600',
                      }}>
                        {location.change > 0 ? '+' : ''}{location.change}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
      
      <EnhancedNavigation />
    </SafeAreaView>
  );
}