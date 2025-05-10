export default class WebSocketService {
  static instance = null;
  socket = null;
  eventListeners = {};
  
  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }
  
  connect(userId) {
    // For testing purposes, we'll use echo.websocket.org
    // In production, replace with your actual WebSocket server
    this.socket = new WebSocket('wss://echo.websocket.org');
    
    this.socket.onopen = () => {
      console.log('WebSocketService: Connected');
      
      // Generate a personalized Spotify-style welcome message
      const timeOfDay = this.getTimeOfDay();
      const welcomeMessages = [
        `Good ${timeOfDay}! Welcome back`,
        `${timeOfDay} vibe is ready for you`,
        `Welcome back to your music`,
        `Your ${timeOfDay} soundtrack awaits`,
        `Let's get into the ${timeOfDay} groove`
      ];
      
      // Pick a random welcome message
      const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      
      // Emit the welcome message with a slight delay to feel natural
      setTimeout(() => {
        this.emit('welcome', randomMessage);
      }, 800);
    };
    
    this.socket.onmessage = (event) => {
      console.log('Message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type && this.eventListeners[data.type]) {
          this.emit(data.type, data.payload);
        }
      } catch (e) {
        console.log('Received non-JSON message:', event.data);
      }
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
  
  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    }
  }
  
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }
  
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        cb => cb !== callback
      );
    }
  }
  
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        callback(data);
      });
    }
  }
  
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }
}