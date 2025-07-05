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
const DrawingCanvas = React.forwardRef(({ onDrawingChange, style }, ref) => {
  // paths is a list of all lines you have drawn
  const [paths, setPaths] = useState([]);
  // currentPath is the line you are drawing right now (use ref for reliability)
  const currentPathRef = useRef('');
  const [currentPath, setCurrentPath] = useState('');
  // svgRef is not used but could be used to access the svg element
  const svgRef = useRef(null);

  // Expose a method to get current paths
  React.useImperativeHandle(ref, () => ({
    getCurrentDrawing: () => paths,
  }));

  // this handles all the touch events for drawing
  const panResponder = useRef(
    PanResponder.create({
      // always let the user draw
      onStartShouldSetPanResponder: () => true,
      // when you start touching, begin a new path
      onPanResponderGrant: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        console.log('DrawingCanvas: panResponderGrant', locationX, locationY);
        if (isValidCoord(locationX, locationY)) {
          currentPathRef.current = `M ${locationX} ${locationY}`;
          setCurrentPath(currentPathRef.current);
        } else {
          currentPathRef.current = '';
          setCurrentPath('');
        }
      },
      // as you move your finger, add points to the path
      onPanResponderMove: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        console.log('DrawingCanvas: panResponderMove', locationX, locationY);
        if (isValidCoord(locationX, locationY)) {
          currentPathRef.current = currentPathRef.current
            ? `${currentPathRef.current} L ${locationX} ${locationY}`
            : `M ${locationX} ${locationY}`;
          setCurrentPath(currentPathRef.current);
        }
      },
      // when you lift your finger, save the path
      onPanResponderRelease: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        let newPath = currentPathRef.current;
        console.log('DrawingCanvas: onPanResponderRelease, currentPath:', newPath);
        if (newPath && isValidCoord(locationX, locationY)) {
          newPath = `${newPath} L ${locationX} ${locationY}`;
        }
        if (newPath) {
          setPaths(prevPaths => {
            const updatedPaths = [...prevPaths, newPath];
            if (onDrawingChange) onDrawingChange(updatedPaths);
            console.log('DrawingCanvas paths after stroke:', updatedPaths);
            return updatedPaths;
          });
        }
        currentPathRef.current = '';
        setCurrentPath('');
      },
    })
  ).current;

  // this clears the whole canvas
  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath('');
    currentPathRef.current = '';
    if (onDrawingChange) onDrawingChange([]);
    console.log('DrawingCanvas cleared');
  };

  // Extract width and height from style if provided
  let viewStyle = [{ flex: 1, backgroundColor: '#fff' }, style];
  let flatStyle = Array.isArray(viewStyle) ? Object.assign({}, ...viewStyle) : viewStyle;
  const svgWidth = flatStyle.width || width - 60;
  const svgHeight = flatStyle.height || 200;
  return (
    <View style={viewStyle} {...panResponder.panHandlers}>
      <Svg ref={svgRef} width={svgWidth} height={svgHeight}>
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
});

export default DrawingCanvas; 