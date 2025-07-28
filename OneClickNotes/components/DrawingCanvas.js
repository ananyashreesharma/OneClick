// this is the drawing canvas component for the notes app
// it lets you draw freehand lines with your finger and saves them as svg paths

import React, { useRef, useState, useEffect, useImperativeHandle } from 'react';
import { View, PanResponder, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Helper function to validate and format coordinates
const formatCoordinate = (value) => {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return 0;
  }
  // Use integers to avoid floating point precision issues completely
  return Math.round(value);
};

// Helper function to validate SVG path
const validatePath = (path) => {
  if (!path || typeof path !== 'string') {
    return false;
  }
  // Stricter validation - only allow integers and basic SVG path commands
  const pathRegex = /^M\s*\d+\s+\d+(\s+L\s*\d+\s+\d+)*$/;
  return pathRegex.test(path.trim());
};

// main drawing canvas function
const DrawingCanvas = React.forwardRef(({ style, initialPaths = [], onDrawingChange, onCanvasLayout }, ref) => {
  // paths is a list of all lines you have drawn
  const [paths, setPaths] = useState(initialPaths);
  // currentPath is the line you are drawing right now (use ref for reliability)
  const currentPath = useRef('');
  // add state to force re-render for current path
  const [currentPathForRender, setCurrentPathForRender] = useState('');
  // canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // update paths if initialPaths changes (e.g., modal reopened)
  useEffect(() => {
    console.log('DrawingCanvas mounted');
    // Validate initial paths
    const validPaths = initialPaths.filter(path => validatePath(path));
    setPaths(validPaths);
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
        try {
          // start a new path at the touch point
          const { locationX, locationY } = evt.nativeEvent;
          
          // Validate coordinates are within reasonable bounds
          if (locationX < 0 || locationY < 0 || locationX > 10000 || locationY > 10000) {
            console.warn('Invalid touch coordinates:', locationX, locationY);
            return;
          }
          
          const x = formatCoordinate(locationX);
          const y = formatCoordinate(locationY);
          
          // Ensure we have valid coordinates
          if (x === 0 && y === 0 && locationX !== 0 && locationY !== 0) {
            console.warn('Coordinate formatting failed:', locationX, locationY);
            return;
          }
          
          currentPath.current = `M ${x} ${y}`;
          setCurrentPathForRender(currentPath.current);
          console.log('DrawingCanvas: touch start at', x, y, 'currentPath:', currentPath.current);
        } catch (error) {
          console.error('Error in onPanResponderGrant:', error);
          currentPath.current = '';
          setCurrentPathForRender('');
        }
      },
      // when you move your finger
      onPanResponderMove: (evt, gestureState) => {
        try {
          const { locationX, locationY } = evt.nativeEvent;
          
          // Validate coordinates are within reasonable bounds
          if (locationX < 0 || locationY < 0 || locationX > 10000 || locationY > 10000) {
            console.warn('Invalid move coordinates:', locationX, locationY);
            return;
          }
          
          const x = formatCoordinate(locationX);
          const y = formatCoordinate(locationY);
          
          // Ensure we have valid coordinates
          if (x === 0 && y === 0 && locationX !== 0 && locationY !== 0) {
            console.warn('Move coordinate formatting failed:', locationX, locationY);
            return;
          }
          
          // add a line to the current path
          currentPath.current += ` L ${x} ${y}`;
          setCurrentPathForRender(currentPath.current);
          console.log('DrawingCanvas: move to', x, y, 'currentPath:', currentPath.current);
        } catch (error) {
          console.error('Error in onPanResponderMove:', error);
        }
      },
      // when you lift your finger
      onPanResponderRelease: (evt, gestureState) => {
        try {
          console.log('DrawingCanvas: path finished', currentPath.current);
          setPaths(prev => {
            if (currentPath.current.trim() !== '' && validatePath(currentPath.current)) {
              const newPaths = [...prev, currentPath.current];
              console.log('DrawingCanvas: path added', currentPath.current);
              // Reset after adding
              currentPath.current = '';
              setCurrentPathForRender('');
              return newPaths;
            } else {
              console.log('DrawingCanvas: path ignored (empty or invalid)');
              // Reset anyway
              currentPath.current = '';
              setCurrentPathForRender('');
              return prev;
            }
          });
        } catch (error) {
          console.error('Error in onPanResponderRelease:', error);
          currentPath.current = '';
          setCurrentPathForRender('');
        }
      },
    })
  ).current;

  // let the parent clear the canvas by calling ref.clear()
  useImperativeHandle(ref, () => ({
    clear: () => setPaths([]),
    getPaths: () => paths,
    getCanvasDimensions: () => canvasDimensions,
  }), [paths, canvasDimensions]);

  // handle canvas layout to get dimensions
  const handleCanvasLayout = (event) => {
    try {
      const { width, height } = event.nativeEvent.layout;
      setCanvasDimensions({ width, height });
      if (onCanvasLayout) {
        onCanvasLayout({ width, height });
      }
    } catch (error) {
      console.error('Error in handleCanvasLayout:', error);
    }
  };

  return (
    // the main view for the drawing area
    <View style={style} {...panResponder.panHandlers}>
      {/* svg is used to actually draw the lines on the screen */}
      {(() => {
        try {
          // Filter out any invalid paths before rendering
          const validPaths = paths.filter(path => validatePath(path));
          const validCurrentPath = currentPathForRender && validatePath(currentPathForRender) ? currentPathForRender : null;
          
          if (validPaths.length === 0 && !validCurrentPath) {
            // Show empty canvas state
            return (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                <Text style={{ color: '#999', fontSize: 16, fontFamily: 'Georgia' }}>Draw here...</Text>
              </View>
            );
          }
          
          return (
            <Svg style={{ flex: 1 }} onLayout={handleCanvasLayout}>
              {validPaths.map((d, i) => (
                <Path key={i} d={d} stroke="#222" strokeWidth={2} fill="none" />
              ))}
              {validCurrentPath && (
                <Path d={validCurrentPath} stroke="#222" strokeWidth={2} fill="none" />
              )}
            </Svg>
          );
        } catch (error) {
          console.error('SVG rendering error:', error);
          // Fallback: show a simple message and clear invalid paths
          setPaths([]);
          setCurrentPathForRender('');
          return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
              <Text style={{ color: '#666', fontSize: 16, fontFamily: 'Georgia' }}>Drawing canvas ready</Text>
            </View>
          );
        }
      })()}
    </View>
  );
});

export default DrawingCanvas; 