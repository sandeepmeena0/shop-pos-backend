import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import User from './models/User.js';
import Product from './models/Product.js';
import Setting from './models/Setting.js';
import Transaction from './models/Transaction.js';
import StockHistory from './models/StockHistory.js';

dotenv.config();

const seed = async () => {
  try {
    console.log('--- Database Seeding Started ---');
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. Clear Existing Data
    console.log('Clearing old data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Setting.deleteMany({});
    await Transaction.deleteMany({});
    await StockHistory.deleteMany({});

    // 2. Default Settings
    console.log('Creating default settings...');
    await Setting.create({
      storeName: 'SmartPOS Terminal',
      storeAddress: '789 Tech Boulevard, Digital Park',
      storePhone: '+91 98765 43210',
      taxRate: 12,
      receiptFooter: 'Visit again for more tech deals!',
      upiId: 'merchant@upi',
      merchantName: 'SmartPOS Enterprise',
      themeColor: '#4f46e5',
      receiptPrefix: 'RCP-',
      returnPrefix: 'RET-',
      defaultLowStockThreshold: 10,
      categories: ['Groceries', 'Bakery', 'Dairy', 'Beverages', 'Snacks', 'Electronics', 'General', 'Accessories', 'Cables', 'Displays', 'Bags']
    });

    // 3. Create Users from JSON
    console.log('Reading users from data/users.json...');
    const usersData = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'users.json'), 'utf-8'));
    console.log(`Creating ${usersData.length} users...`);
    
    const createdUsers = [];
    for (const userData of usersData) {
      // Use .create() so pre-save password hashing hook triggers
      const user = await User.create(userData);
      createdUsers.push(user);
    }
    const adminId = createdUsers[0]._id;

    // 4. Create Products from JSON
    console.log('Reading products from data/products.json...');
    const productsData = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'products.json'), 'utf-8'));
    console.log(`Creating ${productsData.length} products...`);
    
    // insertMany is fine for products as they don't have hooks
    const createdProducts = await Product.insertMany(productsData);

    // 5. Create Stock History (Initial)
    console.log('Creating initial stock history...');
    const historyEntries = createdProducts.map(p => ({
      productId: p._id,
      type: 'INITIAL',
      quantity: p.stock,
      workerId: adminId,
      reason: 'Initial Seed Data'
    }));
    await StockHistory.insertMany(historyEntries);

    console.log('--- Seeding Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
