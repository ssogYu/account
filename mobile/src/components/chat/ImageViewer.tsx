import { useCallback, useEffect, useMemo } from "react";
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Image } from "expo-image";
import { useTheme } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface ImageViewerProps {
  visible: boolean;
  uri: string;
  onClose: () => void;
}

export function ImageViewer({ visible, uri, onClose }: ImageViewerProps) {
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  const resetTransform = useCallback(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const closeAnimated = useCallback(() => {
    opacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [opacity, onClose]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      resetTransform();
    }
  }, [visible, opacity, resetTransform]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      } else if (scale.value > 5) {
        scale.value = withTiming(5);
        savedScale.value = 5;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1.01) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        translateY.value = e.translationY;
        translateX.value = e.translationX * 0.3;
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1.01 && Math.abs(e.translationY) > 120) {
        runOnJS(closeAnimated)();
        return;
      }
      if (scale.value > 1.01) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.01) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (scale.value <= 1.01) {
        runOnJS(closeAnimated)();
      }
    });

  const composedGesture = Gesture.Race(
    doubleTapGesture,
    singleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(0,0,0,0.95)",
        },
        container: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        image: {
          width: screenWidth,
          height: screenHeight * 0.7,
        },
        closeButton: {
          position: "absolute",
          top: 56,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.15)",
          justifyContent: "center",
          alignItems: "center",
        },
      }),
    [screenWidth, screenHeight],
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <GestureHandlerRootView style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={animatedStyle}>
            <Image
              source={{ uri }}
              style={styles.image}
              contentFit="contain"
            />
          </Animated.View>
        </GestureDetector>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={closeAnimated}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="close"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </GestureHandlerRootView>
    </Modal>
  );
}
