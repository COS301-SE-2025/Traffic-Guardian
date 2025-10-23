import React, { use, useEffect, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet, ScrollView, Alert, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocket } from "../services/socketProvider";
import * as Location from "expo-location";
import { useSession } from "../services/sessionContext";
import { globalStyles }from "../styles/globalStyles";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { useTraffic } from "../services/trafficContext";
import { PieChart, BarChart } from "react-native-chart-kit";
import Navbar from "../components/navbar";
import { useTheme } from '../services/themeContext';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width;

export default function Analytics(){
  const router = useRouter();
  const { socket } = useSocket();
  const { user, setUser } = useSession();

const { 
  traffic, setTraffic, 
  criticalIncidents, setCriticalIncidents,
  incidentCategory, setIncidentCategory,
  incidentLocations, setIncidentLocations
} = useTraffic();

/*
criticalIncidents = {"Amount": 11, "Data": "Amount of critical Incidents"} 
incidentCategory = {"categories": ["Unknown", "Accident", "Fog", "Dangerous Conditions", "Rain", "Ice", "Jam", "Lane closed", "Road closed", "Road works", "Wind", "Flooding", "Broken Down Vehicle"], "percentages": [0, 0, 0, 0, 0, 0, 0.38461538461538464, 0, 0.4230769230769231, 0.19230769230769232, 0, 0, 0]}
incidentLocations = [{"amount": 3, "location": "Rosebank"}, {"amount": 3, "location": "Sandton"}, {"amount": 2, "location": "Midrand"}, {"amount": 3, "location": "Centurion"}, {"amount": 3, "location": "Pretoria"}, {"amount": 2, "location": "Soweto"}, {"amount": 3, "location": "Randburg"}, {"amount": 2, "location": "Boksburg"}, {"amount": 2, "location": "Vereeniging"}, {"amount": 1, "location": "Alberton"}, {"amount": 2, "location": "Hatfield"}]
*/

 const chartConfig = {
    backgroundColor: "#292929",
    backgroundGradientFrom: "#292929",
    backgroundGradientTo: "#292929",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: { borderRadius: 16 },
  };

  // Pie chart for incident categories
const pieData =
  incidentCategory?.categories?.map((cat: string, i: number) => {
    const percentage = (incidentCategory.percentages[i] * 100).toFixed(0);
    const rawCount = Math.round(incidentCategory.percentages[i] * criticalIncidents.Amount);
    return {
      name: `${cat}`, 
      population: Number(percentage),
      color: `hsl(${i * 30}, 70%, 50%)`,
      legendFontColor: "#fff",
      legendFontSize: 12,
    };
  }) || [];


  // Bar chart for locations
  const barData = {
    labels: incidentLocations?.map((loc: any) => loc.location) || [],
    datasets: [
      {
        data: incidentLocations?.map((loc: any) => loc.amount) || [],
      },
    ],
  };

  const filteredPieData = pieData.filter(item => item.population > 0);

    return(
<SafeAreaView style={{ flex: 1, backgroundColor: colors.background.pure }}>
  <Navbar>
  <ScrollView
    contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
    style={{ flex: 1 }}
    showsVerticalScrollIndicator={false}
  >

    <View style={[globalStyles.header, { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.dark, paddingVertical: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.border.light }]}>
      <View style={{
        backgroundColor: colors.primary.main,
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name="analytics" size={22} color={colors.text.dark} />
      </View>
      <Text style={[globalStyles.headerTitle, { color: colors.text.primary, fontSize: 22, fontWeight: '800' }]}>Traffic Analytics</Text>
    </View>

    {/* Critical Incidents Card */}
    {criticalIncidents && (
      <View
        style={{
          marginVertical: 16,
          marginHorizontal: 4,
          padding: 20,
          borderRadius: 10,
          backgroundColor: colors.surface.dark,
          borderLeftWidth: 4,
          borderLeftColor: colors.error,
          borderWidth: 1,
          borderColor: colors.border.light,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            backgroundColor: colors.error + '20',
            width: 48,
            height: 48,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}>
            <Ionicons name="alert-circle" size={28} color={colors.error} />
          </View>
          <Text style={[typography.h3, { color: colors.text.primary, flex: 1, fontSize: 18, fontWeight: '700' }]}>
            Critical Incidents
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingLeft: 62 }}>
          <Text style={[typography.statValue, { color: colors.primary.main, marginRight: 10, fontSize: 42, fontWeight: '800' }]}>
            {criticalIncidents.Amount}
          </Text>
          <Text style={[typography.body, { color: colors.text.secondary, flex: 1, fontSize: 14 }]}>
            {criticalIncidents.Data}
          </Text>
        </View>
      </View>
    )}

    {/* Pie Chart */}
{/* {incidentCategory && (
  <View style={{ marginVertical: 16, backgroundColor: "#3e3e3e", borderRadius: 16, padding: 5, borderColor : 'orange', borderWidth : 1 }}>
    <Text style={{ textAlign: "center", color: "orange", fontWeight: "600", marginBottom: 8 }}>
      Incident Categories
    </Text>
    <PieChart
      data={pieData}
      width={screenWidth - 16}
      height={220}
      chartConfig={chartConfig}
      accessor="population"
      backgroundColor="transparent"
      paddingLeft="0"
      absolute
      center={[0,0]}
    />
  </View>
)}  */}


{incidentCategory && (
  <View
    style={{
      marginVertical: 12,
      marginHorizontal: 4,
      backgroundColor: colors.surface.dark,
      borderRadius: 10,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border.light,
      borderTopWidth: 3,
      borderTopColor: colors.primary.main,
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View style={{
        backgroundColor: colors.primary.main,
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
      }}>
        <Ionicons name="pie-chart" size={20} color={colors.text.dark} />
      </View>
      <Text style={[typography.h4, { color: colors.text.primary, fontSize: 17, fontWeight: '700' }]}>
        Incident Categories
      </Text>
    </View>

    <PieChart
      data={filteredPieData} 
      width={screenWidth - 16}
      height={220}
      chartConfig={chartConfig}
      accessor="population"
      backgroundColor="transparent"
      paddingLeft="0"
      center={[0, 0]}
      hasLegend={true} // still using custom legend
    />
  </View>
)}




    {/* Bar Chart */}
    {incidentLocations && (
      <View style={{
        marginVertical: 12,
        marginHorizontal: 4,
        backgroundColor: colors.surface.dark,
        borderRadius: 10,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border.light,
        borderTopWidth: 3,
        borderTopColor: colors.secondary.main,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            backgroundColor: colors.secondary.main,
            width: 36,
            height: 36,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}>
            <Ionicons name="bar-chart" size={20} color={colors.text.dark} />
          </View>
          <Text style={[typography.h4, { color: colors.text.primary, fontSize: 17, fontWeight: '700' }]}>
            Incident Locations
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={barData}
            width={Math.max(screenWidth - 32, barData.labels.length * 60)}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            fromZero
            showValuesOnTopOfBars
            style={{ borderRadius: 10 }}
          />
        </ScrollView>
      </View>
    )}
  </ScrollView>

  
  </Navbar>
</SafeAreaView>

);
}