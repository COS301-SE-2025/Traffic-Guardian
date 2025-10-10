import React, { ReactNode } from 'react';
import { View } from 'react-native';
import EnhancedNavigation from '../app/EnhancedNavigation';
import { SafeAreaView } from "react-native-safe-area-context";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ flex: 1 }}>
        {children} 
      </View>
      <EnhancedNavigation /> 
    </SafeAreaView>
  );
};

export default Layout;
