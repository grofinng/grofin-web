require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Vendor = require('../models/Vendor');

const VENDORS_RAW = [
  { partnerCode: 'GR0001', businessName: 'Anchorlink Pharmacy', address: '37/35 Alhaji Kosoko Street, Ojodu Berger, Lagos', contactPhone: '8100644908', area: 'Ojodu Berger', category: 'Pharmacy' },
  { partnerCode: 'GR0002', businessName: '360 Degree Pharmacy', address: 'Ojodu, Lagos', contactPhone: '', area: 'Ojodu Berger', category: 'Pharmacy' },
  { partnerCode: 'GR0003', businessName: 'Fasid Pharmaceuticals', address: '1, Ogunnusi Road, Omole Phase 1 (Near Ojodu Berger)', contactPhone: '8094433011', area: 'Ojodu Berger', category: 'Pharmacy' },
  { partnerCode: 'GR0004', businessName: 'Crestmed Pharmacy', address: '15 Ogunnusi Road, Alagbole/Ojodu Area', contactPhone: '8132572112', area: 'Ojodu Berger/Alagbole', category: 'Pharmacy' },
  { partnerCode: 'GR0005', businessName: 'Aloysco Pharmacy Nigeria Ltd', address: 'Akute, Ogun State', contactPhone: '8023744897', area: 'Akute', category: 'Pharmacy' },
  { partnerCode: 'GR0006', businessName: 'Anchorlink Pharmacy (Akute Branch)', address: 'Akute, Ogun State', contactPhone: '8053852528', area: 'Akute', category: 'Pharmacy' },
  { partnerCode: 'GR0007', businessName: 'Bethoy Pharmacy', address: 'Akute, Ogun State', contactPhone: '8067804946', area: 'Akute', category: 'Pharmacy' },
  { partnerCode: 'GR0008', businessName: 'Braxos Pharmacy', address: 'Akute, Ogun State', contactPhone: '', area: 'Akute', category: 'Pharmacy' },
  { partnerCode: 'GR0009', businessName: 'Good Year Drug Nig. Ltd', address: 'Akute, Ogun State', contactPhone: '7033680549', area: 'Akute', category: 'Pharmacy' },
  { partnerCode: 'GR0010', businessName: 'Sanzito Pharmacy', address: '46 Alagbole Road, Mubarak Bus stop, Akute', contactPhone: '8037142531', area: 'Akute', category: 'Pharmacy' },
  { partnerCode: 'GR0011', businessName: 'Jodeph Pharmacy', address: '1 Faleye Street, Off Ishasi Road, Akute', contactPhone: '8023218450', area: 'Akute', category: 'Pharmacy' },
  { partnerCode: 'GR0012', businessName: 'Vantage Pharmacy', address: 'Shop 6, 7 & 8 Adegoke Shopping Complex, Akute', contactPhone: '8066326630', area: 'Akute', category: 'Pharmacy' },
  { partnerCode: 'GR0013', businessName: '3 Dee Pharmacy', address: 'Alagbole, Ogun State', contactPhone: '8034319471', area: 'Alagbole', category: 'Pharmacy' },
  { partnerCode: 'GR0014', businessName: 'Pharmamart Pharmacy', address: '41 Alagbole Rd, Alagbole', contactPhone: '8162776644', area: 'Alagbole', category: 'Pharmacy' },
  { partnerCode: 'GR0015', businessName: 'Tolma Pharmacy', address: '57 Ayawoele Street, Ajuwon-Alagbole Road, Ajuwon', contactPhone: '8034955934', area: 'Alagbole/Ajuwon', category: 'Pharmacy' },
  { partnerCode: 'GR0016', businessName: 'Caremax Pharmacy', address: 'Isheri Road (Area connecting Ojodu/Denro)', contactPhone: '8023210294', area: 'Denro/Isheri', category: 'Pharmacy' },
  { partnerCode: 'GR0017', businessName: 'FoodCo Ojodu', address: '100 Ogunnusi Road, Ojodu Berger, Lagos', contactPhone: '9015091763', area: 'Ojodu Berger', category: 'Grocery' },
  { partnerCode: 'GR0018', businessName: 'Prince Ebeano Supermarket', address: 'Along Isheri-Olowora Road, near Ojodu Berger', contactPhone: '8143222222', area: 'Ojodu Berger', category: 'Grocery' },
  { partnerCode: 'GR0019', businessName: 'Home and You Supermarket', address: 'Tunde Gafar Close, Off Ogunnusi Road, Ojodu', contactPhone: '8033240034', area: 'Ojodu Berger', category: 'Grocery' },
  { partnerCode: 'GR0020', businessName: 'A-Z Grocery', address: 'Berger Bus Stop, Lagos-Ibadan Expressway', contactPhone: '', area: 'Ojodu Berger', category: 'Grocery' },
  { partnerCode: 'GR0021', businessName: 'Justrite Superstore (Akute)', address: 'Along Akute-Ajuwon Road, Akute', contactPhone: '8141375685', area: 'Akute', category: 'Grocery' },
  { partnerCode: 'GR0022', businessName: 'T-Gold Supermarket', address: 'Akute Junction, Akute', contactPhone: '8023456789', area: 'Akute', category: 'Grocery' },
  { partnerCode: 'GR0023', businessName: 'Top-Most Stores', address: 'Ishasi Road, Akute', contactPhone: '', area: 'Akute', category: 'Grocery' },
  { partnerCode: 'GR0024', businessName: 'Oasis Supermarket', address: 'Akute-Alagbole Road', contactPhone: '8030001122', area: 'Akute', category: 'Grocery' },
  { partnerCode: 'GR0025', businessName: 'De-Prince Supermarket', address: 'Alagbole Bus Stop, Ogun State', contactPhone: '8099990022', area: 'Alagbole', category: 'Grocery' },
  { partnerCode: 'GR0026', businessName: 'Choice Supermarket', address: 'Ayawoele Road, Alagbole', contactPhone: '', area: 'Alagbole', category: 'Grocery' },
  { partnerCode: 'GR0027', businessName: 'Day-to-Day Stores', address: 'Alagbole-Ajuwon Road', contactPhone: '8123456781', area: 'Alagbole', category: 'Grocery' },
  { partnerCode: 'GR0028', businessName: 'Denro Grocery Hub', address: 'Denro Road, Off Ishasi', contactPhone: '', area: 'Denro', category: 'Grocery' },
  { partnerCode: 'GR0029', businessName: 'Mercy-Land Stores', address: 'Denro-Ishasi Link Road', contactPhone: '7088887766', area: 'Denro', category: 'Grocery' },
];

const VENDORS = VENDORS_RAW.map((v) => ({
  ...v,
  ownerName: 'TBD — please update via admin',
  ownerPhone: v.contactPhone || '0000000000',
}));

(async () => {
  let created = 0;
  let skipped = 0;
  try {
    await connectDB();
    for (const v of VENDORS) {
      const exists = await Vendor.findOne({ partnerCode: v.partnerCode });
      if (exists) {
        skipped++;
        continue;
      }
      await Vendor.create(v);
      created++;
    }
    console.log(`Vendors seeded: ${created} created, ${skipped} already existed.`);
    if (created > 0) {
      console.log('Owner name/phone are placeholders — update them from Admin · Vendors.');
    }
  } catch (err) {
    console.error('Failed to seed vendors:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
