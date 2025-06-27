import React, { useState, useRef } from 'react';
import { View, PanResponder, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

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

const DrawingCanvas = ({ onDrawingChange, style }) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const svgRef = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (isValidCoord(locationX, locationY)) {
          setCurrentPath(`M ${locationX} ${locationY}`);
        } else {
          setCurrentPath('');
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (isValidCoord(locationX, locationY)) {
          setCurrentPath(prev => prev ? `${prev} L ${locationX} ${locationY}` : `M ${locationX} ${locationY}`);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (currentPath && isValidCoord(locationX, locationY)) {
          const newPath = `${currentPath} L ${locationX} ${locationY}`;
          const updatedPaths = [...paths, newPath];
          setPaths(updatedPaths);
          setCurrentPath('');
          if (onDrawingChange) onDrawingChange(updatedPaths);
        } else if (currentPath) {
          // If release coords are invalid, just save the currentPath
          const updatedPaths = [...paths, currentPath];
          setPaths(updatedPaths);
          setCurrentPath('');
          if (onDrawingChange) onDrawingChange(updatedPaths);
        }
      },
    })
  ).current;

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath('');
    if (onDrawingChange) onDrawingChange([]);
  };

  return (
    <View style={[{ flex: 1, backgroundColor: '#fff' }, style]} {...panResponder.panHandlers}>
      <Svg ref={svgRef} width={width - 60} height={200}>
        {paths.map((path, idx) => (
          <Path key={idx} d={path} stroke="#000" strokeWidth={2} fill="none" />
        ))}
        {currentPath ? (
          <Path d={currentPath} stroke="#000" strokeWidth={2} fill="none" />
        ) : null}
      </Svg>
    </View>
  );
};

export default DrawingCanvas; 