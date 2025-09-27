import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/colors';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  currentColors: typeof colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>('system');
  
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  
  const currentColors = {
    ...colors,
    background: {
      ...colors.background,
      light: isDark ? colors.dark.background : colors.background.light,
      dark: isDark ? colors.dark.background : colors.background.dark,
    },
    surface: {
      ...colors.surface,
      light: isDark ? colors.dark.surface : colors.surface.light,
      dark: isDark ? colors.dark.surface : colors.surface.dark,
    },
    text: {
      ...colors.text,
      primary: isDark ? colors.dark.text : colors.text.primary,
      secondary: isDark ? colors.dark.textSecondary : colors.text.secondary,
    },
    border: {
      ...colors.border,
      light: isDark ? colors.dark.border : colors.border.light,
    },
  };

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as ThemeType);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const handleSetTheme = async (newTheme: ThemeType) => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    handleSetTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        setTheme: handleSetTheme,
        toggleTheme,
        currentColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};