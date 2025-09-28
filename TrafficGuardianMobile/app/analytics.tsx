import React, { use, useEffect, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet, ScrollView, Alert, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocket } from "../services/socketProvider";
import * as Location from "expo-location";
import { useSession } from "../services/sessionContext";
import { globalStyles }from "../styles/globalStyles"
import { useTraffic } from "../services/trafficContext";
import { PieChart, BarChart } from "react-native-chart-kit";
import Navbar from "../components/navbar";
import { useTheme } from '../services/themeContext';

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
<SafeAreaView style={{ flex: 1, backgroundColor: "#292929" }}>
  <Navbar>
  <ScrollView
    contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 12 }}
    style={{ flex: 1 }}
  >

    <View style={globalStyles.header}>
      <Text style={globalStyles.headerTitle}>Analytics</Text>
    </View>

    {/* Critical Incidents Card */}
    {criticalIncidents && (
      <View
        style={{
          marginVertical: 12,
          padding: 16,
          borderRadius: 16,
          backgroundColor: "#3e3e3e",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
          borderColor : 'orange', borderWidth : 1 
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "orange", marginBottom: 6}}>
          Critical Incidents
        </Text>
        <Text style={{ fontSize: 16, color: "white" }}>
          {criticalIncidents.Amount} — {criticalIncidents.Data}
        </Text>
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
      marginVertical: 16,
      backgroundColor: "#3e3e3e",
      borderRadius: 16,
      padding: 5,
      borderColor: 'orange',
      borderWidth: 1,
    }}
  >
    <Text
      style={{
        textAlign: "center",
        color: "orange",
        fontWeight: "600",
        marginBottom: 8,
      }}
    >
      Incident Categories
    </Text>

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
      <View style={{ marginVertical: 16, backgroundColor: "#3e3e3e", borderRadius: 16, padding: 12 , borderColor : 'orange', borderWidth : 1}}>
        <Text style={{ textAlign: "center", color: "orange", fontWeight: "600", marginBottom: 12 }}>
          Incident Locations
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={barData}
            width={Math.max(screenWidth, barData.labels.length * 60)}
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
  </ScrollView>

  
  </Navbar>
</SafeAreaView>

);
}