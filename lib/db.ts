import { CONFIG } from "./CONFIG"
import mongoose from "mongoose"
import { EventEmitter } from 'events'


interface ConnectionState {
    isConnected: boolean;
    isConnecting: boolean;
    lastConnected?: Date;
    retryCount: number;
  }

  interface ConnectionOptions {
    maxRetries: number;
    retryDelay: number;
    connectionTimeout: number;
    serverSelectionTimeout: number;
  }

  interface ConnectionEvents {
    connected: () => void;
    disconnected: () => void;
    error: (error: Error) => void;
    reconnecting: (retryCount: number) => void;
  }
  
  interface ConnectionMetrics {
    totalConnections: number;
    failedConnections: number;
    lastConnectionTime?: Date;
    averageConnectionTime?: number;
  }


class DatabaseConnectionError extends Error {
    constructor(message: string, public code?: string) {
      super(message);
      this.name = 'DatabaseConnectionError';
    }
  }

  let connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    retryCount: 0
  };

  let connectionMetrics: ConnectionMetrics = {
    totalConnections: 0,
    failedConnections: 0
  };
  


  const DEFAULT_OPTIONS: ConnectionOptions = {
    maxRetries: 5,
    retryDelay: 1000,
    connectionTimeout: 30000,
    serverSelectionTimeout: 5000
  };
  
  const PRODUCTION_OPTIONS = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    retryWrites: true,
    retryReads: true
  };


  const connectionEmitter = new EventEmitter();



  function updateConnectionState(updates: Partial<ConnectionState>): void {
    connectionState = { ...connectionState, ...updates };
    connectionEmitter.emit('stateChanged', connectionState);
  }
  
  function getConnectionState(): ConnectionState {
    return { ...connectionState };
  }
  
  function isConnected(): boolean {
    return connectionState.isConnected;
  }
  
  function isConnecting(): boolean {
    return connectionState.isConnecting;
  }
  
  function getConnectionMetrics(): ConnectionMetrics {
    return { ...connectionMetrics };
  }
  
  function calculateRetryDelay(retryCount: number, baseDelay: number): number {
    return Math.min(baseDelay * Math.pow(2, retryCount), 30000);
  }
  
  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  async function reconnectWithBackoff(
    mongoUri: string, 
    options: ConnectionOptions
  ): Promise<void> {
    const startTime = Date.now();
    
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        updateConnectionState({ 
          isConnecting: true, 
          retryCount: attempt 
        });
        
        connectionEmitter.emit('reconnecting', attempt);
        
        await mongoose.connect(mongoUri, PRODUCTION_OPTIONS);
        
        const connectionTime = Date.now() - startTime;
        connectionMetrics.totalConnections++;
        connectionMetrics.lastConnectionTime = new Date();
        connectionMetrics.averageConnectionTime = 
          (connectionMetrics.averageConnectionTime || 0 + connectionTime) / 2;
        
        updateConnectionState({ 
          isConnected: true, 
          isConnecting: false, 
          lastConnected: new Date(),
          retryCount: 0 
        });
        
        connectionEmitter.emit('connected');
        return;
        
      } catch (error) {
        connectionMetrics.failedConnections++;
        
        if (attempt === options.maxRetries) {
          updateConnectionState({ isConnecting: false });
          throw new DatabaseConnectionError(
            `Failed to connect after ${options.maxRetries} attempts: ${error}`,
            'MAX_RETRIES_EXCEEDED'
          );
        }
        
        const delay = calculateRetryDelay(attempt, options.retryDelay);
        console.warn(`Connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  async function gracefulShutdown(): Promise<void> {
    console.log('🔄 Gracefully shutting down database connection...');
    
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('✅ Database connection closed gracefully');
      }
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
    }
    
    process.exit(0);
  }

  async function healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      connecting: boolean;
      retryCount: number;
      lastConnected?: Date;
      metrics: ConnectionMetrics;
    };
  }> {
    const state = getConnectionState();
    const metrics = getConnectionMetrics();
    
    return {
      status: state.isConnected ? 'healthy' : 'unhealthy',
      details: {
        connected: state.isConnected,
        connecting: state.isConnecting,
        retryCount: state.retryCount,
        lastConnected: state.lastConnected,
        metrics
      }
    };
  }

  function setupConnectionListeners(): void {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      updateConnectionState({ isConnected: true, lastConnected: new Date() });
      connectionEmitter.emit('connected');
    });
  
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      updateConnectionState({ isConnected: false });
      connectionEmitter.emit('disconnected');
    });
  
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      connectionMetrics.failedConnections++;
      connectionEmitter.emit('error', error);
    });
  
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      updateConnectionState({ isConnected: true, lastConnected: new Date() });
      connectionEmitter.emit('connected');
    });
  
    // Handle process termination
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  }


  export default async function connectDB(options: Partial<ConnectionOptions> = {}): Promise<void> {
    const mongoUri = CONFIG.MONGO_URI;
    
    if (!mongoUri) {
      throw new DatabaseConnectionError('MONGO_URI not set in environment variables', 'MISSING_URI');
    }
  
    // Check if already connected
    if (connectionState.isConnected) {
      console.log('✅ Database already connected');
      return;
    }
  
    // Check if already connecting
    if (connectionState.isConnecting) {
      console.log('⏳ Database connection already in progress');
      return;
    }
  
    try {
      console.log('🔄 Connecting to MongoDB...');
      
      // Setup event listeners
      setupConnectionListeners();
      
      // Merge options with defaults
      const connectionOptions = { ...DEFAULT_OPTIONS, ...options };
      
      // Attempt connection with retry logic
      await reconnectWithBackoff(mongoUri, connectionOptions);
      
    } catch (error) {
      updateConnectionState({ isConnecting: false });
      
      if (error instanceof DatabaseConnectionError) {
        throw error;
      }
      
      throw new DatabaseConnectionError(
        `Failed to connect to database: ${error}`,
        'CONNECTION_FAILED'
      );
    }
  }


  export {
    getConnectionState,
    isConnected,
    isConnecting,
    getConnectionMetrics,
    healthCheck,
    gracefulShutdown,
    connectionEmitter,
    DatabaseConnectionError
  };
  
  export type { ConnectionState, ConnectionOptions, ConnectionEvents, ConnectionMetrics };