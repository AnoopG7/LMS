import mongoose from 'mongoose';

class MongoConnection {
  private connectUrl: string;

  constructor() {
    this.connectUrl = process.env.MONGODB_URI ?? '';
  }

  public connect = async () => {
    try {
      if (!this.connectUrl) {
        throw new Error('MONGODB_URI is not defined in environment variables');
      }
      await mongoose.connect(this.connectUrl);
      console.log('Connected to MongoDB');
    } catch (error: any) {
      console.error('MongoDB connection error:', error.message);
      throw new Error('Error connecting to MongoDB: ' + (error.message || 'Unknown error'));
    }
  };
}

export default MongoConnection;
