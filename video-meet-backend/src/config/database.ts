import mongoose from 'mongoose';
import config from '../config';

/**
 * Database connection manager
 * Handles MongoDB connection with proper error handling and retry logic
 */
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() { }

  /**
   * Singleton pattern to ensure single database connection
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Connect to MongoDB with retry logic
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('📦 Database already connected');
      return;
    }

    try {
      // Configure mongoose settings for optimal performance
      mongoose.set('strictQuery', true);

      const connectionOptions = {
        // Connection pool settings
        maxPoolSize: 10, // Maximum number of connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity

        // Automatic reconnection
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity

        // Database name (extracted from URI or use default)
        dbName: "videomeet",
      };

      // Connect to MongoDB
      await mongoose.connect(config.database.uri, connectionOptions);

      this.isConnected = true;
      console.log('✅ Connected to MongoDB successfully');
      console.log(`📊 Database: ${connectionOptions.dbName}`);

      // Set up connection event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('📦 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get database connection info
   */
  public getConnectionInfo(): object {
    if (!this.isConnected) {
      return { status: 'disconnected' };
    }

    return {
      status: 'connected',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
      collections: Object.keys(mongoose.connection.collections),
    };
  }

  /**
   * Extract database name from MongoDB URI
   */
  private extractDatabaseName(uri: string): string {
    try {
      const matches = uri.match(/\/([^?]+)/);
      return matches && matches[1] ? matches[1] : 'videomeet';
    } catch {
      return 'videomeet';
    }
  }

  /**
   * Set up MongoDB connection event listeners
   */
  private setupEventListeners(): void {
    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT. Closing MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM. Closing MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Health check for the database connection
   */
  public async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected' };
      }

      // Ping the database
      if (!mongoose.connection.db) {
        return { status: 'disconnected' };
      }
      await mongoose.connection.db.admin().ping();

      return {
        status: 'healthy',
        details: this.getConnectionInfo()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Export singleton instance
export const database = DatabaseConnection.getInstance();

// Export connection function for easy use
export const connectDatabase = () => database.connect();
export const disconnectDatabase = () => database.disconnect();
export const getDatabaseStatus = () => database.getConnectionStatus();
export const getDatabaseInfo = () => database.getConnectionInfo();
export const checkDatabaseHealth = () => database.healthCheck();