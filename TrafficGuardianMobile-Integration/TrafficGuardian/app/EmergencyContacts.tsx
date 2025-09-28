import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../services/themeContext';
import { typography } from '../styles/typography';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'police' | 'medical' | 'fire' | 'family' | 'friend' | 'other';
  isPrimary?: boolean;
}

interface EmergencyContactsProps {
  visible: boolean;
  onClose: () => void;
}

const contactTypeIcons = {
  police: 'shield-checkmark',
  medical: 'medical',
  fire: 'flame',
  family: 'people',
  friend: 'person',
  other: 'call',
};

const contactTypeColors = {
  police: '#3b82f6',
  medical: '#ef4444',
  fire: '#dc2626',
  family: '#10b981',
  friend: '#f59e0b',
  other: '#6b7280',
};

const defaultContacts: EmergencyContact[] = [
  { id: '1', name: 'Police Emergency', phone: '10111', type: 'police', isPrimary: true },
  { id: '2', name: 'Ambulance/Medical', phone: '10177', type: 'medical', isPrimary: true },
  { id: '3', name: 'Fire Department', phone: '10177', type: 'fire', isPrimary: true },
  { id: '4', name: 'Traffic Police', phone: '0861 400 800', type: 'police', isPrimary: true },
];

export default function EmergencyContacts ({ visible, onClose }: EmergencyContactsProps)  {
  const { currentColors, isDark } = useTheme();
  const [contacts, setContacts] = useState<EmergencyContact[]>(defaultContacts);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    type: 'other' as EmergencyContact['type'],
  });
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      loadContacts();
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadContacts = async () => {
    try {
      const stored = "";//await AsyncStorage.getItem('emergencyContacts');
      if (stored) {
        const parsedContacts = JSON.parse(stored);
        setContacts([...defaultContacts, ...parsedContacts]);
      }
    } catch (error) {
      console.log('Error loading contacts:', error);
    }
  };

  const saveContacts = async (updatedContacts: EmergencyContact[]) => {
    try {
      const customContacts = updatedContacts.filter(c => !c.isPrimary);
      //await AsyncStorage.setItem('emergencyContacts', JSON.stringify(customContacts));
      setContacts(updatedContacts);
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const handleCall = (phone: string, name: string) => {
    Alert.alert(
      'Emergency Call',
      `Are you sure you want to call ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${phone}`),
        },
      ]
    );
  };

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const contact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContact.name.trim(),
      phone: newContact.phone.trim(),
      type: newContact.type,
    };

    const updatedContacts = [...contacts, contact];
    saveContacts(updatedContacts);
    setNewContact({ name: '', phone: '', type: 'other' });
    setShowAddModal(false);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    if (contact.isPrimary) return;
    setEditingContact(contact);
    setNewContact({
      name: contact.name,
      phone: contact.phone,
      type: contact.type,
    });
    setShowAddModal(true);
  };

  const handleUpdateContact = () => {
    if (!editingContact) return;
    
    const updatedContacts = contacts.map(c =>
      c.id === editingContact.id
        ? { ...c, name: newContact.name.trim(), phone: newContact.phone.trim(), type: newContact.type }
        : c
    );
    
    saveContacts(updatedContacts);
    setEditingContact(null);
    setNewContact({ name: '', phone: '', type: 'other' });
    setShowAddModal(false);
  };

  const handleDeleteContact = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact?.isPrimary) return;

    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedContacts = contacts.filter(c => c.id !== contactId);
            saveContacts(updatedContacts);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light,
            marginTop: 100,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [500, 0],
              }),
            }],
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? currentColors.dark.border : currentColors.border.light,
            }}
          >
            <Text
              style={{
                ...typography.h2,
                color: isDark ? currentColors.dark.text : currentColors.text.primary,
              }}
            >
              Emergency Contacts!
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                style={{
                  backgroundColor: currentColors.primary.main,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? currentColors.dark.text : currentColors.text.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contacts List */}
          <ScrollView style={{ flex: 1, padding: 20 }}>
            {contacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                onPress={() => handleCall(contact.phone, contact.name)}
                onLongPress={() => handleEditContact(contact)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: contact.isPrimary ? 2 : 1,
                  borderColor: contact.isPrimary
                    ? contactTypeColors[contact.type]
                    : isDark ? currentColors.dark.border : currentColors.border.light,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: contactTypeColors[contact.type],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Ionicons
                    name={contactTypeIcons[contact.type] as any}
                    size={24}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      style={{
                        ...typography.body,
                        color: isDark ? currentColors.dark.text : currentColors.text.primary,
                        fontWeight: '600',
                      }}
                    >
                      {contact.name}
                    </Text>
                    {contact.isPrimary && (
                      <View
                        style={{
                          backgroundColor: contactTypeColors[contact.type],
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginLeft: 8,
                        }}
                      >
                        <Text
                          style={{
                            ...typography.caption,
                            color: '#fff',
                            fontWeight: '600',
                          }}
                        >
                          PRIMARY
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
                      marginTop: 2,
                    }}
                  >
                    {contact.phone}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => handleCall(contact.phone, contact.name)}
                    style={{
                      backgroundColor: currentColors.success,
                      borderRadius: 20,
                      width: 40,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    <Ionicons name="call" size={20} color="#fff" />
                  </TouchableOpacity>
                  {!contact.isPrimary && (
                    <TouchableOpacity
                      onPress={() => handleDeleteContact(contact.id)}
                      style={{
                        backgroundColor: currentColors.error,
                        borderRadius: 20,
                        width: 40,
                        height: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="trash" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Add/Edit Contact Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowAddModal(false);
            setEditingContact(null);
            setNewContact({ name: '', phone: '', type: 'other' });
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 16,
                padding: 20,
              }}
            >
              <Text
                style={{
                  ...typography.h3,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  marginBottom: 20,
                  textAlign: 'center',
                }}
              >
                {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
              </Text>

              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: currentColors.border.light,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light,
                }}
                placeholder="Contact Name"
                placeholderTextColor={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
                value={newContact.name}
                onChangeText={(text) => setNewContact(prev => ({ ...prev, name: text }))}
              />

              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: currentColors.border.light,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light,
                }}
                placeholder="Phone Number"
                placeholderTextColor={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
                value={newContact.phone}
                onChangeText={(text) => setNewContact(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />

              <Text
                style={{
                  ...typography.body,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  marginBottom: 8,
                }}
              >
                Contact Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {Object.entries(contactTypeIcons).map(([type, icon]) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setNewContact(prev => ({ ...prev, type: type as EmergencyContact['type'] }))}
                    style={{
                      alignItems: 'center',
                      marginRight: 12,
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: newContact.type === type
                        ? contactTypeColors[type as keyof typeof contactTypeColors]
                        : 'transparent',
                      borderWidth: 1,
                      borderColor: contactTypeColors[type as keyof typeof contactTypeColors],
                    }}
                  >
                    <Ionicons
                      name={icon as any}
                      size={24}
                      color={newContact.type === type ? '#fff' : contactTypeColors[type as keyof typeof contactTypeColors]}
                    />
                    <Text
                      style={{
                        ...typography.caption,
                        color: newContact.type === type ? '#fff' : contactTypeColors[type as keyof typeof contactTypeColors],
                        textTransform: 'capitalize',
                        marginTop: 4,
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    setEditingContact(null);
                    setNewContact({ name: '', phone: '', type: 'other' });
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    marginRight: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: currentColors.border.light,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      ...typography.button,
                      color: isDark ? currentColors.dark.text : currentColors.text.primary,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={editingContact ? handleUpdateContact : handleAddContact}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    marginLeft: 8,
                    borderRadius: 8,
                    backgroundColor: currentColors.primary.main,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      ...typography.button,
                      color: '#fff',
                    }}
                  >
                    {editingContact ? 'Update' : 'Add Contact'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};