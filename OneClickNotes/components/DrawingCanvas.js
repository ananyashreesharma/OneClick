// this is the drawing canvas component for the notes app
// it lets you draw freehand lines with your finger and saves them as svg paths

import React, { useRef, useState, useEffect, useImperativeHandle } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// main drawing canvas function
const DrawingCanvas = React.forwardRef(({ onDrawingChange, style }, ref) => {
  // paths is a list of all lines you have drawn
  const [paths, setPaths] = useState([]);
  // currentPath is the line you are drawing right now (use ref for reliability)
  const currentPath = useRef('');

  // panResponder handles touch events for drawing
  const panResponder = useRef(
    PanResponder.create({
      // when you start touching the screen
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        // start a new path at the touch point
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M ${locationX} ${locationY}`;
      },
      // when you move your finger
      onPanResponderMove: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        // add a line to the current path
        currentPath.current += ` L ${locationX} ${locationY}`;
      },
      // when you lift your finger
      onPanResponderRelease: (evt, gestureState) => {
        // add the finished path to the list of paths
        setPaths(prev => [...prev, currentPath.current]);
        // tell the parent about the new drawing
        if (onDrawingChange) onDrawingChange([...paths, currentPath.current]);
        currentPath.current = '';
      },
    })
  ).current;

  // let the parent clear the canvas by calling ref.clear()
  useImperativeHandle(ref, () => ({
    clear: () => setPaths([]),
    getPaths: () => paths,
  }), [paths]);

  // if the parent wants to reset the drawing
  useEffect(() => {
    if (typeof onDrawingChange === 'function') {
      onDrawingChange(paths);
    }
  }, [paths]);

  return (
    // the main view for the drawing area
    <View style={style} {...panResponder.panHandlers}>
      {/* svg is used to actually draw the lines on the screen */}
      <Svg style={{ flex: 1 }}>
        {paths.map((d, i) => (
          // each path is a line you drew
          <Path key={i} d={d} stroke="#222" strokeWidth={2} fill="none" />
        ))}
        {/* show the current path as you draw */}
        {currentPath.current ? (
          <Path d={currentPath.current} stroke="#222" strokeWidth={2} fill="none" />
        ) : null}
      </Svg>
    </View>
  );
});

export default DrawingCanvas; 