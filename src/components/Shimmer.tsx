import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type ShimmerBlockProps = {
  height: number;
  width?: ViewStyle['width'];
  radius?: number;
  style?: ViewStyle;
};

export const ShimmerBlock: React.FC<ShimmerBlockProps> = ({ height, width = '100%', radius = 16, style }) => {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.block,
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: colors.surfaceAlt,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const ShimmerScreen: React.FC = () => {
  return (
    <View style={styles.screen}>
      <ShimmerBlock height={18} width="55%" radius={10} />
      <ShimmerBlock height={14} width="35%" radius={10} style={{ marginTop: 10 }} />
      <ShimmerBlock height={140} radius={24} style={{ marginTop: 18 }} />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
        <ShimmerBlock height={90} radius={20} style={{ flex: 1 }} />
        <ShimmerBlock height={90} radius={20} style={{ flex: 1 }} />
      </View>
      <ShimmerBlock height={18} width="40%" radius={10} style={{ marginTop: 22 }} />
      <View style={{ gap: 12, marginTop: 12 }}>
        <ShimmerBlock height={68} radius={20} />
        <ShimmerBlock height={68} radius={20} />
        <ShimmerBlock height={68} radius={20} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    width: '100%',
  },
  block: {
    overflow: 'hidden',
  },
});

