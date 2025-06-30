// this is the drawing canvas component
// it lets you draw with your finger and saves the drawing as a list of paths

import React, { useState, useRef } from 'react';
import { View, PanResponder, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// get the width of the screen
const { width } = Dimensions.get('window');

// this function checks if x and y are real numbers
function isValidCoord(x, y) {
  return (
    typeof x === 'number' &&
    typeof y === 'number' &&
    !isNaN(x) &&
    !isNaN(y) &&
    isFinite(x) &&
    isFinite(y)
  );
}

// main drawing canvas function
const DrawingCanvas = ({ onDrawingChange, style }) => {
  // paths is a list of all lines you have drawn
  const [paths, setPaths] = useState([]);
  // currentPath is the line you are drawing right now
  const [currentPath, setCurrentPath] = useState('');
  // svgRef is not used but could be used to access the svg element
  const svgRef = useRef(null);

  // this handles all the touch events for drawing
  const panResponder = useRef(
    PanResponder.create({
      // always let the user draw
      onStartShouldSetPanResponder: () => true,
      // when you start touching, begin a new path
      onPanResponderGrant: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (isValidCoord(locationX, locationY)) {
          setCurrentPath(`M ${locationX} ${locationY}`);
        } else {
          setCurrentPath('');
        }
      },
      // as you move your finger, add points to the path
      onPanResponderMove: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (isValidCoord(locationX, locationY)) {
          setCurrentPath(prev => prev ? `${prev} L ${locationX} ${locationY}` : `M ${locationX} ${locationY}`);
        }
      },
      // when you lift your finger, save the path
      onPanResponderRelease: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (currentPath && isValidCoord(locationX, locationY)) {
          const newPath = `${currentPath} L ${locationX} ${locationY}`;
          const updatedPaths = [...paths, newPath];
          setPaths(updatedPaths);
          setCurrentPath('');
          // let the parent know the drawing changed
          if (onDrawingChange) onDrawingChange(updatedPaths);
        } else if (currentPath) {
          // if the last point is not valid, just save what we have
          const updatedPaths = [...paths, currentPath];
          setPaths(updatedPaths);
          setCurrentPath('');
          if (onDrawingChange) onDrawingChange(updatedPaths);
        }
      },
    })
  ).current;

  // this clears the whole canvas
  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath('');
    if (onDrawingChange) onDrawingChange([]);
  };

  // this is what shows up on the screen
  return (
    <View style={[{ flex: 1, backgroundColor: '#fff' }, style]} {...panResponder.panHandlers}>
      <Svg ref={svgRef} width={width - 60} height={200}>
        {/* draw all the finished paths */}
        {paths.map((path, idx) => (
          <Path key={idx} d={path} stroke="#000" strokeWidth={2} fill="none" />
        ))}
        {/* draw the path you are currently drawing */}
        {currentPath ? (
          <Path d={currentPath} stroke="#000" strokeWidth={2} fill="none" />
        ) : null}
      </Svg>
    </View>
  );
};

export default DrawingCanvas; 