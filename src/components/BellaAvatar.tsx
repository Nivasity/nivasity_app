import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Text from './AppText';

// Bella's look: a brand-plum gradient that slowly flows, and a white speech bubble with a "B"
// that looks around (the "B" counter-rotates so it stays upright). Drawn with react-native-svg
// and the Animated API, so it ships over the air. Still when reduce motion is on, or animated={false}.

const FLOW = ['#3a1540', '#6b2d74', '#a855c7', '#6b2d74', '#3a1540'];
const FLOW_AT = [0, 0.3, 0.55, 0.8, 1];
const STILL = ['#4a1d52', '#6b2d74', '#a855c7'];

let gradientIds = 0;

const useReduceMotion = () => {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
};

// Plum fill for any rounded box (avatar, buttons). Flowing: a gradient three times as wide slides
// left and right behind the content.
export const BellaGradient: React.FC<{
  width: number;
  height: number;
  radius: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}> = ({ width, height, radius, animated = true, style, children }) => {
  const reduce = useReduceMotion();
  const flowing = animated && !reduce;
  const id = useRef(`bella-grad-${++gradientIds}`).current;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flowing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flowing, x]);

  const wide = width * 3;
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {flowing ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: wide,
            height,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, -(wide - width)] }) }],
          }}
        >
          <Svg width={wide} height={height}>
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0.3">
                {FLOW.map((c, i) => (
                  <Stop key={i} offset={FLOW_AT[i]} stopColor={c} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={wide} height={height} fill={`url(#${id})`} />
          </Svg>
        </Animated.View>
      ) : (
        <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              {STILL.map((c, i) => (
                <Stop key={i} offset={i / (STILL.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill={`url(#${id})`} />
        </Svg>
      )}
      {children}
    </View>
  );
};

// Glances: hold, turn, hold... the bubble's pointed corner shows where it is "looking"
const GLANCES = [80, -70, 170, -25, 0];

const BellaAvatar: React.FC<{ size?: number; animated?: boolean; style?: StyleProp<ViewStyle> }> = ({ size = 40, animated = true, style }) => {
  const reduce = useReduceMotion();
  const moving = animated && !reduce;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moving) {
      rot.setValue(0);
      return;
    }
    const steps: Animated.CompositeAnimation[] = [];
    for (const deg of GLANCES) {
      steps.push(Animated.delay(1080));
      steps.push(Animated.timing(rot, { toValue: deg, duration: 720, easing: Easing.bezier(0.5, 0, 0.3, 1), useNativeDriver: true }));
    }
    const loop = Animated.loop(Animated.sequence(steps));
    loop.start();
    return () => loop.stop();
  }, [moving, rot]);

  const bubble = Math.round(size * 0.58);
  const tail = Math.max(3, Math.round(bubble * 0.24));
  const turn = rot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const upright = rot.interpolate({ inputRange: [-360, 360], outputRange: ['360deg', '-360deg'] });

  return (
    <BellaGradient width={size} height={size} radius={size / 2} animated={animated} style={style}>
      <Animated.View
        style={{
          width: bubble,
          height: bubble,
          backgroundColor: '#fff',
          borderTopLeftRadius: bubble / 2,
          borderTopRightRadius: bubble / 2,
          borderBottomRightRadius: bubble / 2,
          borderBottomLeftRadius: tail,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: turn }],
        }}
      >
        <Animated.View style={{ transform: [{ rotate: upright }] }}>
          <Text style={{ color: '#6b2d74', fontWeight: '900', fontSize: Math.round(bubble * 0.55), lineHeight: Math.round(bubble * 0.7) }}>B</Text>
        </Animated.View>
      </Animated.View>
    </BellaGradient>
  );
};

export default BellaAvatar;
