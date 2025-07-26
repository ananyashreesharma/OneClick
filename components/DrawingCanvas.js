// this is the drawing canvas component for the notes app
// it lets you draw freehand lines with your finger and saves them as svg paths

import React, { useRef, useState, useEffect, useImperativeHandle } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// main drawing canvas function
const DrawingCanvas = React.forwardRef(({ style, initialPaths = [], onDrawingChange }, ref) => {
  // paths is a list of all lines you have drawn
  const [paths, setPaths] = useState(initialPaths);
  // currentPath is the line you are drawing right now (use ref for reliability)
  const currentPath = useRef('');
  // add state to force re-render for current path
  const [currentPathForRender, setCurrentPathForRender] = useState('');

  // update paths if initialPaths changes (e.g., modal reopened)
  useEffect(() => {
    console.log('DrawingCanvas mounted');
    setPaths(initialPaths);
  }, []); // Only run on mount!

  // notify parent on every change
  useEffect(() => {
    console.log('DrawingCanvas paths updated:', paths);
    if (typeof onDrawingChange === 'function') {
      onDrawingChange(paths);
    }
  }, [paths, onDrawingChange]);

  // panResponder handles touch events for drawing
  const panResponder = useRef(
    PanResponder.create({
      // when you start touching the screen
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        // start a new path at the touch point
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M ${locationX} ${locationY}`;
        setCurrentPathForRender(currentPath.current);
        console.log('DrawingCanvas: touch start at', locationX, locationY, 'currentPath:', currentPath.current);
      },
      // when you move your finger
      onPanResponderMove: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        // add a line to the current path
        currentPath.current += ` L ${locationX} ${locationY}`;
        setCurrentPathForRender(currentPath.current);
        console.log('DrawingCanvas: move to', locationX, locationY, 'currentPath:', currentPath.current);
      },
      // when you lift your finger
      onPanResponderRelease: (evt, gestureState) => {
        console.log('DrawingCanvas: path finished', currentPath.current);
        setPaths(prev => {
          if (currentPath.current.trim() !== '') {
            const newPaths = [...prev, currentPath.current];
            console.log('DrawingCanvas: path added', currentPath.current);
            // Reset after adding
            currentPath.current = '';
            setCurrentPathForRender('');
            return newPaths;
          } else {
            console.log('DrawingCanvas: path ignored (empty)');
            // Reset anyway
            currentPath.current = '';
            setCurrentPathForRender('');
            return prev;
          }
        });
      },
    })
  ).current;

  // let the parent clear the canvas by calling ref.clear()
  useImperativeHandle(ref, () => ({
    clear: () => setPaths([]),
    getPaths: () => paths,
  }), [paths]);

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
        {currentPathForRender ? (
          <Path d={currentPathForRender} stroke="#222" strokeWidth={2} fill="none" />
        ) : null}
      </Svg>
    </View>
  );
});

export default DrawingCanvas; 