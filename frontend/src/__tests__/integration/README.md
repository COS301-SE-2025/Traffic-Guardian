# LiveFeed Integration Tests

This directory contains comprehensive integration tests for the LiveFeed component.

## Test Files

### LiveFeed.test.tsx
Main integration test suite that covers:
- Component rendering and initial states
- API integration with CalTrans camera feeds
- Video streaming functionality (HLS player)
- Error handling and recovery
- User interactions (modal opening, refresh functionality)
- Data processing and filtering
- Loading states and progress indicators

### LiveFeedSocket.test.tsx  
Socket integration test suite that covers:
- Socket.io connection establishment
- Real-time incident alerts
- Weather updates and alerts
- Notification system (browser notifications, sounds)
- Connection error handling
- Cleanup and memory management

## Running the Tests

### Run All LiveFeed Integration Tests
```bash
npm test -- --testPathPattern="LiveFeed" --watchAll=false
```

### Run Specific Test Suite
```bash
# Main integration tests
npm test -- --testPathPattern="LiveFeed.test.tsx" --watchAll=false

# Socket integration tests  
npm test -- --testPathPattern="LiveFeedSocket.test.tsx" --watchAll=false
```

### Run with Coverage
```bash
npm test -- --testPathPattern="LiveFeed" --watchAll=false --coverage
```

## Test Structure

Both test suites use:
- **React Testing Library** for component rendering and user interactions
- **Jest** for mocking and assertions
- **Fake timers** to control async behavior
- **Comprehensive mocking** of external dependencies

## Mocked Dependencies

### External Libraries
- `react-hls-player` - Mock HLS video player component
- `react-leaflet` - Mock mapping components (MapContainer, Marker, etc.)
- `leaflet` - Mock map library with proper Icon constructor
- `socket.io-client` - Mock WebSocket client
- `react-toastify` - Mock notification system

### Browser APIs
- `fetch` - Mock HTTP requests to CalTrans API
- `AbortController` - Mock request cancellation
- `Notification` - Mock browser notifications
- `AudioContext` - Mock audio for notification sounds
- `sessionStorage` - Mock local storage

### CSS Imports
- All CSS imports are mocked to prevent import errors

## Key Test Scenarios

### API Integration
✅ Successful data fetching from CalTrans API  
✅ Error handling for network failures  
✅ Data filtering and processing  
✅ URL conversion (HTTP to HTTPS)  

### Video Streaming
✅ HLS player rendering for streaming cameras  
✅ Static image fallback for non-streaming cameras  
✅ Video loading states and error handling  

### Real-time Features
✅ Socket connection establishment  
✅ Incident alert processing  
✅ Weather update handling  
✅ Notification system integration  

### User Interactions
✅ Camera tile clicking and modal opening  
✅ Refresh button functionality  
✅ View mode switching (video/images/map)  
✅ Error state recovery  

## Test Expectations

The tests verify that the component:
1. Renders properly with loading states
2. Fetches and displays camera data correctly  
3. Handles errors gracefully with retry options
4. Integrates with real-time systems (sockets)
5. Provides interactive features (modals, refresh)
6. Manages state correctly throughout the lifecycle

## Notes

- Tests use fake timers to control async operations
- All external API calls are mocked to prevent network dependencies
- Component state changes are wrapped in `act()` for proper testing
- Tests focus on integration behavior rather than implementation details