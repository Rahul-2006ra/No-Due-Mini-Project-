import {MongoClient} from 'mongodb';
import {initializeModels} from './models/index.js';
export async function connectDatabase(uri){if(!uri)throw new Error('MONGODB_URI is required.');const client=new MongoClient(uri,{maxPoolSize:50,minPoolSize:5,maxIdleTimeMS:30000,connectTimeoutMS:10000,serverSelectionTimeoutMS:10000});await client.connect();const database=client.db();await initializeModels(database);return {client,database};}
