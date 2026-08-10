import React from 'react';
import { Modal, Pressable, TouchableOpacity, Image, Text, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  zoomedImage: { url: string; caption: string };
  onClose: () => void;
}

export default function ImageZoomModal({ zoomedImage, onClose }: Props) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
      >
        <TouchableOpacity
          style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }}
          onPress={onClose}
        >
          <Feather name="x" size={28} color="white" />
        </TouchableOpacity>
        <Image
          source={{ uri: zoomedImage.url }}
          style={{ width: Dimensions.get('window').width * 0.9, height: Dimensions.get('window').height * 0.6 }}
          resizeMode="contain"
        />
        {!!zoomedImage.caption && (
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 }}>
            {zoomedImage.caption}
          </Text>
        )}
      </Pressable>
    </Modal>
  );
}
