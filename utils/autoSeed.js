import fs from 'fs/promises';
import path from 'path';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import StockHistory from '../models/StockHistory.js';

export const autoSeed = async () => {
  try {
    // 1. Seed Default Settings
    const settingCount = await Setting.countDocuments({});
    if (settingCount === 0) {
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
    }

    // 2. Seed/Update Users
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    console.log(`Reading users from ${usersPath}...`);
    const usersData = JSON.parse(await fs.readFile(usersPath, 'utf-8'));
    
    let adminId = null;
    for (const userData of usersData) {
      const existingUser = await User.findOne({ username: userData.username });
      if (existingUser) {
        // If password changed (e.g. from admin123 to 123456), update it
        const isMatch = await existingUser.comparePassword(userData.password);
        if (!isMatch) {
          existingUser.password = userData.password;
          await existingUser.save();
          console.log(`🔑 Updated password for existing user: ${userData.username}`);
        }
        if (userData.username === 'admin') {
          adminId = existingUser._id;
        }
      } else {
        const user = await User.create(userData);
        console.log(`👤 Created user: ${userData.username}`);
        if (userData.username === 'admin') {
          adminId = user._id;
        }
      }
    }

    // 3. Seed Products if empty
    const productCount = await Product.countDocuments({});
    if (productCount === 0) {
      const productsPath = path.join(process.cwd(), 'data', 'products.json');
      console.log(`Reading products from ${productsPath}...`);
      const productsData = JSON.parse(await fs.readFile(productsPath, 'utf-8'));
      
      const createdProducts = await Product.insertMany(productsData);

      // Create Stock History entries for the initial products
      if (adminId && createdProducts.length > 0) {
        console.log('Creating initial stock history...');
        const historyEntries = createdProducts.map(p => ({
          productId: p._id,
          type: 'INITIAL',
          quantity: p.stock,
          workerId: adminId,
          reason: 'Initial Seed Data'
        }));
        await StockHistory.insertMany(historyEntries);
      }
    }

    console.log('✅  Auto-seeding completed successfully.');
  } catch (error) {
    console.error('❌  Auto-seeding failed:', error);
  }
};
