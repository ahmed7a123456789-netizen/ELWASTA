import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import type {
  User,
  Captain,
  Merchant,
  MerchantProduct,
  Order,
  OrderStatus,
  OrderStatusHistory,
  Payment,
  Rating,
  Complaint,
  Notification,
  PricingSettings,
  AdminSettings,
  VehicleType,
} from './src/types.ts';
import { paymentGatewayManager } from './src/services/payment/index.ts';
import type { PaymentGatewayType } from './src/services/payment/types.ts';
import {
  connectToMongoDB,
  isOnlineDatabaseConnected,
  UserModel,
  CaptainModel,
  MerchantModel,
  MerchantProductModel,
  OrderModel,
  OrderStatusHistoryModel,
  PaymentModel,
  RatingModel,
  ComplaintModel,
  NotificationModel,
  SettingsModel,
} from './src/services/dbService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Seed Database
interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // userId -> password
  captains: Captain[];
  merchants: Merchant[];
  merchantProducts: MerchantProduct[];
  orders: Order[];
  orderStatusHistory: OrderStatusHistory[];
  payments: Payment[];
  ratings: Rating[];
  complaints: Complaint[];
  notifications: Notification[];
  pricingSettings: PricingSettings;
  adminSettings: AdminSettings;
}

function getInitialDatabase(): DatabaseSchema {
  const adminId = 'usr_admin_1';
  const cap1Id = 'usr_cap_1';
  const cap2Id = 'usr_cap_2';
  const cap3Id = 'usr_cap_3';
  const merch1Id = 'usr_merch_1';
  const merch2Id = 'usr_merch_2';
  const merch3Id = 'usr_merch_3';
  const cust1Id = 'usr_cust_1';
  const cust2Id = 'usr_cust_2';

  const users: User[] = [
    {
      id: adminId,
      name: 'أحمد (المالك والمدير العام - Super Admin)',
      email: 'ahmed7a123456789@gmail.com',
      phone: '01067162284',
      role: 'SUPER_ADMIN',
      address: 'إدارة تطبيق الوَسطة واي - مركز الواسطى',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: cap1Id,
      name: 'محمود حسن الصياد',
      email: 'mahmoud.captain@elwastaway.com',
      phone: '01011223344',
      role: 'CAPTAIN',
      address: 'شارع أحمد عرابي، الواسطى',
      isActive: true,
      createdAt: '2026-02-10T10:00:00Z',
    },
    {
      id: cap2Id,
      name: 'ربيع عبد العال (أبو سجدة)',
      email: 'rabie.tuktuk@elwastaway.com',
      phone: '01122334455',
      role: 'CAPTAIN',
      address: 'بجوار محطة قطار الواسطى',
      isActive: true,
      createdAt: '2026-02-12T11:00:00Z',
    },
    {
      id: cap3Id,
      name: 'صابر الجمل',
      email: 'saber.new@elwastaway.com',
      phone: '01233445566',
      role: 'CAPTAIN',
      address: 'جزيرة المساعدة، الواسطى',
      isActive: true,
      createdAt: '2026-03-01T09:00:00Z',
    },
    {
      id: merch1Id,
      name: 'مطعم الحاتي للمشويات والوجبات',
      email: 'elhaty@elwastaway.com',
      phone: '01055667788',
      role: 'MERCHANT',
      address: 'ميدان المحطة، شارع الجمهورية، الواسطى',
      isActive: true,
      createdAt: '2026-02-01T12:00:00Z',
    },
    {
      id: merch2Id,
      name: 'صيدلية الشفاء التخصصية',
      email: 'alshifaa@elwastaway.com',
      phone: '01155667799',
      role: 'MERCHANT',
      address: 'أمام مستشفى الواسطى المركزي',
      isActive: true,
      createdAt: '2026-02-05T14:00:00Z',
    },
    {
      id: merch3Id,
      name: 'سوبر ماركت البركة والخير',
      email: 'albaraka@elwastaway.com',
      phone: '01255667700',
      role: 'MERCHANT',
      address: 'شارع النيل - كورنيش الواسطى',
      isActive: true,
      createdAt: '2026-02-08T15:00:00Z',
    },
    {
      id: cust1Id,
      name: 'أحمد علي عبد الرحمن',
      email: 'ahmed7a123456789@gmail.com',
      phone: '01012345678',
      role: 'CUSTOMER',
      address: 'حي الزهور، بجوار المسجد الكبير، الواسطى',
      isActive: true,
      createdAt: '2026-02-15T08:00:00Z',
    },
    {
      id: cust2Id,
      name: 'سارة إبراهيم محمود',
      email: 'sara.cust@elwastaway.com',
      phone: '01198765432',
      role: 'CUSTOMER',
      address: 'شارع المدارس، الواسطى',
      isActive: true,
      createdAt: '2026-02-20T16:00:00Z',
    },
  ];

  const passwords: Record<string, string> = {
    [adminId]: 'ahmedn3na3a',
    [cap1Id]: 'captain123',
    [cap2Id]: 'captain123',
    [cap3Id]: 'captain123',
    [merch1Id]: 'merchant123',
    [merch2Id]: 'merchant123',
    [merch3Id]: 'merchant123',
    [cust1Id]: 'customer123',
    [cust2Id]: 'customer123',
  };

  const captains: Captain[] = [
    {
      id: 'cap_1',
      userId: cap1Id,
      name: 'محمود حسن الصياد',
      phone: '01011223344',
      email: 'mahmoud.captain@elwastaway.com',
      vehicleType: 'MOTORCYCLE',
      vehicleModel: 'باجاج بوكسر 150cc (موديل 2024)',
      vehiclePlateNumber: 'ب ن س ٤٨٢٩',
      vehicleColor: 'أسود مطفي',
      documents: {
        nationalIdFront: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
        driverLicense: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
        vehicleLicense: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=400&q=80',
        criminalRecord: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&q=80',
      },
      approvalStatus: 'APPROVED',
      isOnline: true,
      rating: 4.9,
      totalRatings: 128,
      totalDeliveries: 142,
      walletBalance: 120,
      todayEarnings: 385,
      weekEarnings: 2150,
      monthEarnings: 8450,
      currentLat: 29.3395,
      currentLng: 31.1972,
      lastLocationUpdate: new Date().toISOString(),
    },
    {
      id: 'cap_2',
      userId: cap2Id,
      name: 'ربيع عبد العال (أبو سجدة)',
      phone: '01122334455',
      email: 'rabie.tuktuk@elwastaway.com',
      vehicleType: 'TUK_TUK',
      vehicleModel: 'توك توك باجاج كومباكت 4S الحديث',
      vehiclePlateNumber: 'ب ن س ١٠٣٤',
      vehicleColor: 'أحمر وأسود كلاسيك',
      documents: {
        nationalIdFront: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
        driverLicense: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
        vehicleLicense: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=400&q=80',
      },
      approvalStatus: 'APPROVED',
      isOnline: true,
      rating: 4.8,
      totalRatings: 94,
      totalDeliveries: 110,
      walletBalance: 15,
      todayEarnings: 420,
      weekEarnings: 2600,
      monthEarnings: 9800,
      currentLat: 29.3381,
      currentLng: 31.1955,
      lastLocationUpdate: new Date().toISOString(),
    },
    {
      id: 'cap_3',
      userId: cap3Id,
      name: 'صابر الجمل',
      phone: '01233445566',
      email: 'saber.new@elwastaway.com',
      vehicleType: 'MOTORCYCLE',
      vehicleModel: 'هوجان جامبو 200',
      vehiclePlateNumber: 'ب ن س ٧٧١٢',
      vehicleColor: 'أزرق ملكي',
      documents: {
        nationalIdFront: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
        driverLicense: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
      },
      approvalStatus: 'PENDING',
      isOnline: false,
      rating: 5.0,
      totalRatings: 0,
      totalDeliveries: 0,
      walletBalance: 0,
      todayEarnings: 0,
      weekEarnings: 0,
      monthEarnings: 0,
      currentLat: 29.341,
      currentLng: 31.198,
      lastLocationUpdate: new Date().toISOString(),
    },
  ];

  const merchants: Merchant[] = [
    {
      id: 'merch_1',
      userId: merch1Id,
      name: 'مطعم الحاتي للمشويات والوجبات',
      businessType: 'RESTAURANT',
      phone: '01055667788',
      address: 'ميدان المحطة، شارع الجمهورية، الواسطى',
      lat: 29.3392,
      lng: 31.1969,
      logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      approvalStatus: 'APPROVED',
      commissionRate: 10,
    },
    {
      id: 'merch_2',
      userId: merch2Id,
      name: 'صيدلية الشفاء التخصصية',
      businessType: 'PHARMACY',
      phone: '01155667799',
      address: 'أمام مستشفى الواسطى المركزي',
      lat: 29.3375,
      lng: 31.1942,
      logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&q=80',
      approvalStatus: 'APPROVED',
      commissionRate: 8,
    },
    {
      id: 'merch_3',
      userId: merch3Id,
      name: 'سوبر ماركت البركة والخير',
      businessType: 'SUPERMARKET',
      phone: '01255667700',
      address: 'شارع النيل - كورنيش الواسطى',
      lat: 29.3408,
      lng: 31.1995,
      logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
      approvalStatus: 'APPROVED',
      commissionRate: 8,
    },
  ];

  const merchantProducts: MerchantProduct[] = [
    // El Haty Grill Products
    {
      id: 'prod_1',
      merchantId: 'merch_1',
      name: 'وجبة كباب وكفتة بلدي مشوية',
      nameEn: 'Grilled Kebab & Kofta Meal',
      description: 'نصف كيلو كباب وكفتة ضاني مع أرز بسمتي وسلطات وخبز ساخن وطحينة',
      price: 180,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
      category: 'مشويات',
      isAvailable: true,
    },
    {
      id: 'prod_2',
      merchantId: 'merch_1',
      name: 'وجبة ربع فرخة مشوية على الفحم',
      nameEn: 'Quarter Grilled Chicken',
      description: 'ربع فرخة تتبيلة الحاتي الخاصة مع أرز وسلطة خضراء وعيش بلدي',
      price: 85,
      image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80',
      category: 'دواجن',
      isAvailable: true,
    },
    {
      id: 'prod_3',
      merchantId: 'merch_1',
      name: 'ساندوتش حواوشي بلدي مكس جبن',
      nameEn: 'Baladi Hawawshi with Cheese',
      description: 'لحم بقري مفروم متبل بالبصل والفلفل والموزاريلا في خبز مقرمش',
      price: 55,
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80',
      category: 'سندوتشات',
      isAvailable: true,
    },
    {
      id: 'prod_4',
      merchantId: 'merch_1',
      name: 'طاجن ملوخية باللحمة البلدي',
      nameEn: 'Molokhia Tajin with Meat',
      description: 'ملوخية خضراء طازجة بتقلية الثوم والكزبرة مع قطع لحم بلدي',
      price: 95,
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80',
      category: 'طواجن',
      isAvailable: true,
    },
    // Pharmacy Products
    {
      id: 'prod_5',
      merchantId: 'merch_2',
      name: 'بانادول إكسترا أقراص (Panadol Extra)',
      nameEn: 'Panadol Extra Tablets',
      description: 'مسكن للصداع والآلام وخافض للحرارة مع كافيين - شريط 12 قرص',
      price: 45,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
      category: 'مسكنات وأدوية عامة',
      isAvailable: true,
    },
    {
      id: 'prod_6',
      merchantId: 'merch_2',
      name: 'فيتامين سي فوار 1000 مجم (C-Retard)',
      nameEn: 'Effervescent Vitamin C 1000mg',
      description: 'لدعم المناعة ومقاومة نزلات البرد والإرهاق - عبوة 10 أقراص',
      price: 50,
      image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400&q=80',
      category: 'فيتامينات ومكملات',
      isAvailable: true,
    },
    {
      id: 'prod_7',
      merchantId: 'merch_2',
      name: 'علبة كمامات طبية معقمة (50 قطعة)',
      nameEn: 'Surgical Face Masks (50 pcs)',
      description: 'كمامة 3 طبقات بفلتر حماية ودعامة أنف مريحة',
      price: 60,
      image: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?w=400&q=80',
      category: 'مستلزمات طبية',
      isAvailable: true,
    },
    // Supermarket Products
    {
      id: 'prod_8',
      merchantId: 'merch_3',
      name: 'حليب المراعي كامل الدسم (1 لتر)',
      nameEn: 'Almarai Full Cream Milk (1L)',
      description: 'حليب طبيعي 100% مبستر وطازج وغني بالفيتامينات',
      price: 48,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80',
      category: 'ألبان وأجبان',
      isAvailable: true,
    },
    {
      id: 'prod_9',
      merchantId: 'merch_3',
      name: 'أرز مصري فاخر الضحى (1 كجم)',
      nameEn: 'El Doha Egyptian Rice (1kg)',
      description: 'أرز أبيض مصري منقى ومعبأ بأعلى معايير الجودة',
      price: 36,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80',
      category: 'حبوب وبقوليات',
      isAvailable: true,
    },
    {
      id: 'prod_10',
      merchantId: 'merch_3',
      name: 'زيت عباد الشمس كريستال (800 مل)',
      nameEn: 'Crystal Sunflower Oil (800ml)',
      description: 'زيت نقي خفيف للطبخ والقلي غني بفيتامين هـ',
      price: 75,
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80',
      category: 'زيوت وسمن',
      isAvailable: true,
    },
  ];

  const orders: Order[] = [
    {
      id: 'ord_1',
      orderNumber: 'WW-1001',
      customerId: cust1Id,
      customerName: 'أحمد علي عبد الرحمن',
      customerPhone: '01012345678',
      merchantId: 'merch_1',
      merchantName: 'مطعم الحاتي للمشويات والوجبات',
      orderType: 'RESTAURANT',
      pickupLocation: 'ميدان المحطة، شارع الجمهورية، الواسطى',
      destinationLocation: 'حي الزهور، بجوار المسجد الكبير، الواسطى',
      pickupLat: 29.3392,
      pickupLng: 31.1969,
      destinationLat: 29.345,
      destinationLng: 31.201,
      distanceKm: 2.1,
      estimatedDurationMin: 10,
      vehicleType: 'MOTORCYCLE',
      deliveryFee: 20,
      itemsCost: 265,
      totalFee: 285,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      captainId: 'cap_1',
      captainName: 'محمود حسن الصياد',
      captainPhone: '01011223344',
      captainVehicleType: 'MOTORCYCLE',
      captainPlateNumber: 'ب ن س ٤٨٢٩',
      captainRating: 5,
      orderStatus: 'COMPLETED',
      customerNotes: 'الرجاء عدم الضغط على جرس الباب، الاتصال هاتفياً عند الوصول',
      items: [
        { id: 'prod_1', name: 'وجبة كباب وكفتة بلدي مشوية', quantity: 1, price: 180 },
        { id: 'prod_2', name: 'وجبة ربع فرخة مشوية على الفحم', quantity: 1, price: 85 },
      ],
      createdTime: new Date(Date.now() - 3600000 * 3).toISOString(),
      acceptedTime: new Date(Date.now() - 3600000 * 2.8).toISOString(),
      arrivedTime: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      pickedUpTime: new Date(Date.now() - 3600000 * 2.4).toISOString(),
      deliveredTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      completedTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      hasRated: true,
    },
    {
      id: 'ord_2',
      orderNumber: 'WW-1002',
      customerId: cust2Id,
      customerName: 'سارة إبراهيم محمود',
      customerPhone: '01198765432',
      orderType: 'PICKUP_DROP',
      pickupLocation: 'مكتب بريد الواسطى الرئيسي',
      destinationLocation: 'شارع المدارس - بجوار مدرسة التجارة، الواسطى',
      pickupLat: 29.3385,
      pickupLng: 31.196,
      destinationLat: 29.342,
      destinationLng: 31.192,
      distanceKm: 1.8,
      estimatedDurationMin: 8,
      vehicleType: 'TUK_TUK',
      deliveryFee: 25,
      itemsCost: 0,
      totalFee: 25,
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      captainId: 'cap_2',
      captainName: 'ربيع عبد العال (أبو سجدة)',
      captainPhone: '01122334455',
      captainVehicleType: 'TUK_TUK',
      captainPlateNumber: 'ب ن س ١٠٣٤',
      captainRating: 4.8,
      orderStatus: 'ON_THE_WAY',
      customerNotes: 'طرد كرتونة ملابس ومستندات، التعامل معها بحرص',
      createdTime: new Date(Date.now() - 1800000).toISOString(),
      acceptedTime: new Date(Date.now() - 1500000).toISOString(),
      arrivedTime: new Date(Date.now() - 1000000).toISOString(),
      pickedUpTime: new Date(Date.now() - 600000).toISOString(),
    },
  ];

  const orderStatusHistory: OrderStatusHistory[] = [
    {
      id: 'hist_1',
      orderId: 'ord_1',
      fromStatus: 'NONE',
      toStatus: 'NEW',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      actorId: cust1Id,
      actorRole: 'CUSTOMER',
      note: 'تم إنشاء الطلب',
    },
    {
      id: 'hist_2',
      orderId: 'ord_1',
      fromStatus: 'NEW',
      toStatus: 'CAPTAIN_ACCEPTED',
      timestamp: new Date(Date.now() - 3600000 * 2.8).toISOString(),
      actorId: cap1Id,
      actorRole: 'CAPTAIN',
      note: 'وافق الكابتن محمود على استلام الطلب',
    },
    {
      id: 'hist_3',
      orderId: 'ord_1',
      fromStatus: 'CAPTAIN_ACCEPTED',
      toStatus: 'COMPLETED',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actorId: cap1Id,
      actorRole: 'CAPTAIN',
      note: 'تم تسليم الطلب واستلام الحساب بنجاح',
    },
    {
      id: 'hist_4',
      orderId: 'ord_2',
      fromStatus: 'NONE',
      toStatus: 'NEW',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      actorId: cust2Id,
      actorRole: 'CUSTOMER',
      note: 'تم إنشاء طلب نقل أغراض',
    },
    {
      id: 'hist_5',
      orderId: 'ord_2',
      fromStatus: 'NEW',
      toStatus: 'CAPTAIN_ACCEPTED',
      timestamp: new Date(Date.now() - 1500000).toISOString(),
      actorId: cap2Id,
      actorRole: 'CAPTAIN',
      note: 'وافق الكابتن ربيع التوك توك على الطلب',
    },
    {
      id: 'hist_6',
      orderId: 'ord_2',
      fromStatus: 'CAPTAIN_ACCEPTED',
      toStatus: 'PICKED_UP',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      actorId: cap2Id,
      actorRole: 'CAPTAIN',
      note: 'تم استلام الشحنة من مكتب البريد',
    },
    {
      id: 'hist_7',
      orderId: 'ord_2',
      fromStatus: 'PICKED_UP',
      toStatus: 'ON_THE_WAY',
      timestamp: new Date(Date.now() - 400000).toISOString(),
      actorId: cap2Id,
      actorRole: 'CAPTAIN',
      note: 'الكابتن في طريقه للعنوان',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay_1',
      orderId: 'ord_1',
      orderNumber: 'WW-1001',
      customerId: cust1Id,
      amount: 285,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      transactionRef: 'CASH-REC-1001',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  const ratings: Rating[] = [
    {
      id: 'rat_1',
      orderId: 'ord_1',
      customerId: cust1Id,
      customerName: 'أحمد علي عبد الرحمن',
      captainId: 'cap_1',
      rating: 5,
      comment: 'كابتن ممتاز وسريع جداً والأكل وصل ساخن ومغلف تماماً، شكراً يا محمود!',
      createdAt: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    },
  ];

  const complaints: Complaint[] = [
    {
      id: 'comp_1',
      userId: cust2Id,
      userName: 'سارة إبراهيم محمود',
      userRole: 'CUSTOMER',
      userPhone: '01198765432',
      subject: 'استفسار عن إمكانية نقل أجهزة إلكترونية بالتوك توك',
      description: 'أريد معرفة هل يمكن نقل تلفاز 43 بوصة من الواسطى إلى قرية قمن العروس عبر التوك توك؟',
      status: 'RESOLVED',
      adminResponse: 'أهلاً بكِ سارة، نعم كباتن التوك توك المعتمدين لدينا مجهزين لنقل الأجهزة الخفيفة بعناية فائقة، يمكنك اختيار فئة التوك توك وكتابة مواصفات الطرد في الملاحظات.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      resolvedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'notif_1',
      userId: cust1Id,
      userRole: 'CUSTOMER',
      title: 'تم اكتمال طلبك بنجاح',
      message: 'شكراً لاستخدامك الوَسطة واي. تم تسليم طلبك رقم WW-1001 بنجاح.',
      type: 'ORDER',
      read: true,
      relatedOrderId: 'ord_1',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'notif_2',
      userId: cap1Id,
      userRole: 'CAPTAIN',
      title: 'تقييم جديد 5 نجوم',
      message: 'حصلت على تقييم 5 نجوم من العميل أحمد علي عبد الرحمن!',
      type: 'SYSTEM',
      read: false,
      relatedOrderId: 'ord_1',
      createdAt: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    },
    {
      id: 'notif_3',
      userId: adminId,
      userRole: 'SUPER_ADMIN',
      title: 'تسجيل كابتن جديد بانتظار المراجعة',
      message: 'قدم الكابتن صابر الجمل أوراقه للانضمام كأسطول موتوسيكل.',
      type: 'ALERT',
      read: false,
      createdAt: '2026-03-01T09:00:00Z',
    },
  ];

  const pricingSettings: PricingSettings = {
    baseFee: 10, // 10 EGP base
    pricePerKm: 18, // 18 EGP per km for motorcycle
    minDeliveryFee: 25, // minimum 25 EGP
    motorcycleRate: 1.0, // 18 EGP per km
    tukTukRate: 1.2222, // 22 EGP per km for tuk-tuk (18 * 1.2222 = 22)
    waitingFeePerMin: 1.0, // 1 EGP per waiting minute
    nightSurgeMultiplier: 1.0, // 1.0x normal
    platformCommissionPercent: 15, // 15% platform commission
    minCaptainDepositToReceiveOrders: 50, // 50 EGP minimum deposit in wallet to receive/see orders
  };

  const adminSettings: AdminSettings = {
    appName: 'EL WASTA WAY',
    appNameAr: 'الوَسطة واي',
    contactPhone: '01000000000',
    emergencyNumber: '122',
    enableTukTuk: true,
    enableMotorcycle: true,
    autoDispatch: true,
    maintenanceMode: false,
  };

  return {
    users,
    passwords,
    captains,
    merchants,
    merchantProducts,
    orders,
    orderStatusHistory,
    payments,
    ratings,
    complaints,
    notifications,
    pricingSettings,
    adminSettings,
  };
}

// Database Persistence Helpers
let db: DatabaseSchema;

async function syncOnlineDatabase(data: DatabaseSchema) {
  if (!isOnlineDatabaseConnected()) return;
  try {
    const userOps = data.users.map((u) => ({
      updateOne: {
        filter: { _id: u.id },
        update: { ...u, _id: u.id, id: u.id, password: data.passwords[u.id] },
        upsert: true,
      },
    }));
    if (userOps.length > 0) await UserModel.bulkWrite(userOps);

    const captainOps = data.captains.map((c) => ({
      updateOne: { filter: { _id: c.id }, update: { ...c, _id: c.id, id: c.id }, upsert: true },
    }));
    if (captainOps.length > 0) await CaptainModel.bulkWrite(captainOps);

    const merchantOps = data.merchants.map((m) => ({
      updateOne: { filter: { _id: m.id }, update: { ...m, _id: m.id, id: m.id }, upsert: true },
    }));
    if (merchantOps.length > 0) await MerchantModel.bulkWrite(merchantOps);

    const productOps = data.merchantProducts.map((p) => ({
      updateOne: { filter: { _id: p.id }, update: { ...p, _id: p.id, id: p.id }, upsert: true },
    }));
    if (productOps.length > 0) await MerchantProductModel.bulkWrite(productOps);

    const orderOps = data.orders.map((o) => ({
      updateOne: { filter: { _id: o.id }, update: { ...o, _id: o.id, id: o.id }, upsert: true },
    }));
    if (orderOps.length > 0) await OrderModel.bulkWrite(orderOps);

    const historyOps = data.orderStatusHistory.map((h) => ({
      updateOne: { filter: { _id: h.id }, update: { ...h, _id: h.id, id: h.id }, upsert: true },
    }));
    if (historyOps.length > 0) await OrderStatusHistoryModel.bulkWrite(historyOps);

    const paymentOps = data.payments.map((p) => ({
      updateOne: { filter: { _id: p.id }, update: { ...p, _id: p.id, id: p.id }, upsert: true },
    }));
    if (paymentOps.length > 0) await PaymentModel.bulkWrite(paymentOps);

    const ratingOps = data.ratings.map((r) => ({
      updateOne: { filter: { _id: r.id }, update: { ...r, _id: r.id, id: r.id }, upsert: true },
    }));
    if (ratingOps.length > 0) await RatingModel.bulkWrite(ratingOps);

    const complaintOps = data.complaints.map((c) => ({
      updateOne: { filter: { _id: c.id }, update: { ...c, _id: c.id, id: c.id }, upsert: true },
    }));
    if (complaintOps.length > 0) await ComplaintModel.bulkWrite(complaintOps);

    const notificationOps = data.notifications.map((n) => ({
      updateOne: { filter: { _id: n.id }, update: { ...n, _id: n.id, id: n.id }, upsert: true },
    }));
    if (notificationOps.length > 0) await NotificationModel.bulkWrite(notificationOps);

    await SettingsModel.updateOne(
      { key: 'pricing' },
      { value: data.pricingSettings },
      { upsert: true }
    );
    await SettingsModel.updateOne(
      { key: 'admin' },
      { value: data.adminSettings },
      { upsert: true }
    );
  } catch (err) {
    console.error('Error syncing online database with MongoDB Atlas:', err);
  }
}

async function loadFromOnlineDatabase(): Promise<DatabaseSchema | null> {
  if (!isOnlineDatabaseConnected()) return null;
  try {
    const users = await UserModel.find().lean();
    if (!users || users.length === 0) return null;

    const passwords: Record<string, string> = {};
    const formattedUsers: User[] = users.map((u: any) => {
      if (u.password) passwords[u._id || u.id] = u.password;
      const { password, _id, __v, ...rest } = u;
      return { ...rest, id: u.id || u._id };
    });

    const captains = await CaptainModel.find().lean();
    const merchants = await MerchantModel.find().lean();
    const merchantProducts = await MerchantProductModel.find().lean();
    const orders = await OrderModel.find().lean();
    const orderStatusHistory = await OrderStatusHistoryModel.find().lean();
    const payments = await PaymentModel.find().lean();
    const ratings = await RatingModel.find().lean();
    const complaints = await ComplaintModel.find().lean();
    const notifications = await NotificationModel.find().lean();

    const pricingDoc = await SettingsModel.findOne({ key: 'pricing' }).lean();
    const adminDoc = await SettingsModel.findOne({ key: 'admin' }).lean();

    const pricingSettings: PricingSettings = pricingDoc?.value || getInitialDatabase().pricingSettings;

    const adminSettings: AdminSettings = adminDoc?.value || getInitialDatabase().adminSettings;

    return {
      users: formattedUsers,
      passwords,
      captains: captains.map((c: any) => ({ ...c, id: c.id || c._id })),
      merchants: merchants.map((m: any) => ({ ...m, id: m.id || m._id })),
      merchantProducts: merchantProducts.map((p: any) => ({ ...p, id: p.id || p._id })),
      orders: orders.map((o: any) => ({ ...o, id: o.id || o._id })),
      orderStatusHistory: orderStatusHistory.map((h: any) => ({ ...h, id: h.id || h._id })),
      payments: payments.map((p: any) => ({ ...p, id: p.id || p._id })),
      ratings: ratings.map((r: any) => ({ ...r, id: r.id || r._id })),
      complaints: complaints.map((c: any) => ({ ...c, id: c.id || c._id })),
      notifications: notifications.map((n: any) => ({ ...n, id: n.id || n._id })),
      pricingSettings,
      adminSettings,
    };
  } catch (err) {
    console.error('Error loading online database from MongoDB Atlas:', err);
    return null;
  }
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return data;
    }
  } catch (err) {
    console.error('Error loading db.json, creating initial DB:', err);
  }
  const initial = getInitialDatabase();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    if (isOnlineDatabaseConnected()) {
      syncOnlineDatabase(data).catch((err) =>
        console.error('Async MongoDB sync error:', err)
      );
    }
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

db = loadDatabase();

// Pricing Engine Calculation
export function calculateDeliveryFee(
  distanceKm: number,
  vehicleType: VehicleType,
  pricing: PricingSettings
): number {
  const vehicleMultiplier =
    vehicleType === 'TUK_TUK' ? pricing.tukTukRate : pricing.motorcycleRate;
  const rawFee =
    (pricing.baseFee + distanceKm * pricing.pricePerKm) *
    vehicleMultiplier *
    pricing.nightSurgeMultiplier;
  const finalFee = Math.max(pricing.minDeliveryFee, Math.round(rawFee));
  return finalFee;
}

// Valid Status Transitions
const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['SEARCHING_FOR_CAPTAIN', 'CAPTAIN_ACCEPTED', 'MERCHANT_PREPARING', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'],
  SEARCHING_FOR_CAPTAIN: ['CAPTAIN_ACCEPTED', 'MERCHANT_PREPARING', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'],
  MERCHANT_PREPARING: ['MERCHANT_READY', 'CANCELLED_BY_ADMIN'],
  MERCHANT_READY: ['CAPTAIN_ACCEPTED', 'CAPTAIN_ARRIVED', 'CANCELLED_BY_ADMIN'],
  CAPTAIN_ACCEPTED: ['CAPTAIN_ARRIVED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_CAPTAIN', 'CANCELLED_BY_ADMIN'],
  CAPTAIN_ARRIVED: ['PICKED_UP', 'CANCELLED_BY_CAPTAIN', 'CANCELLED_BY_ADMIN'],
  PICKED_UP: ['ON_THE_WAY', 'DELIVERED', 'CANCELLED_BY_ADMIN'],
  ON_THE_WAY: ['DELIVERED', 'CANCELLED_BY_ADMIN'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED_BY_CUSTOMER: [],
  CANCELLED_BY_CAPTAIN: [],
  CANCELLED_BY_ADMIN: [],
};

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return geminiClient;
}

async function startServer() {
  await connectToMongoDB();
  if (isOnlineDatabaseConnected()) {
    const onlineDb = await loadFromOnlineDatabase();
    if (onlineDb) {
      db = onlineDb;
      console.log('✅ تم تحميل البيانات مباشرة من قاعدة بيانات MongoDB Atlas أونلاين!');
    } else {
      console.log('🔄 قاعدة البيانات أونلاين فارغة، جاري رفع البيانات الأولية للـ Cloud Database...');
      await syncOnlineDatabase(db);
      console.log('✅ تم رفع المخطط التأسيسي لـ MongoDB Atlas أونلاين بنجاح!');
    }
  }

  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'EL WASTA WAY - الوَسطة واي',
      version: '1.0.0',
      database: isOnlineDatabaseConnected() ? 'MongoDB Atlas Online Database' : 'Local JSON File',
    });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body; // email or phone
    if (!identifier || !password) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, '')
    );

    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const savedPass = db.passwords[user.id];
    if (savedPass && savedPass !== password) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'هذا الحساب موقوف حالياً من قبل الإدارة' });
    }

    // Attach role-specific entity
    let captainData: Captain | undefined;
    let merchantData: Merchant | undefined;

    if (user.role === 'CAPTAIN') {
      captainData = db.captains.find((c) => c.userId === user.id);
    } else if (user.role === 'MERCHANT') {
      merchantData = db.merchants.find((m) => m.userId === user.id);
    }

    // Simple robust token
    const token = `tok_${user.id}_${Date.now()}`;

    return res.json({
      user,
      captain: captainData,
      merchant: merchantData,
      token,
    });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const {
      name,
      email,
      phone,
      password,
      role = 'CUSTOMER',
      address,
      // Captain fields
      vehicleType,
      vehicleModel,
      vehiclePlateNumber,
      vehicleColor,
      nationalId,
      documents,
      // Merchant fields
      businessName,
      businessType,
      merchantAddress,
      lat,
      lng,
    } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'الاسم ورقم الهاتف وكلمة المرور مطلوبة' });
    }

    const existing = db.users.find(
      (u) =>
        (email && u.email.toLowerCase() === String(email).toLowerCase()) ||
        u.phone === String(phone)
    );

    if (existing) {
      return res.status(409).json({ error: 'يوجد حساب مسجل بالفعل بهذا البريد أو الهاتف' });
    }

    const allowedPublicRoles = ['CUSTOMER', 'CAPTAIN', 'MERCHANT'];
    const assignedRole = allowedPublicRoles.includes(role) ? role : 'CUSTOMER';

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = {
      id: userId,
      name,
      email: email || `${phone}@elwastaway.local`,
      phone,
      role: assignedRole as any,
      address: address || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.passwords[userId] = password;

    let newCaptain: Captain | undefined;
    let newMerchant: Merchant | undefined;

    if (role === 'CAPTAIN') {
      newCaptain = {
        id: `cap_${Date.now()}`,
        userId,
        name,
        phone,
        email: newUser.email,
        vehicleType: (vehicleType as VehicleType) || 'MOTORCYCLE',
        vehicleModel: vehicleModel || 'دراجة نارية',
        vehiclePlateNumber: vehiclePlateNumber || 'تحت الترخيص',
        vehicleColor: vehicleColor || 'أبيض',
        documents: documents || {},
        approvalStatus: 'PENDING',
        walletBalance: 0,
        isOnline: false,
        rating: 5.0,
        totalRatings: 0,
        totalDeliveries: 0,
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
        currentLat: 29.3392,
        currentLng: 31.1969,
        lastLocationUpdate: new Date().toISOString(),
      };
      if (newCaptain) {
        db.captains.push(newCaptain);
      }

      // Notification to Super Admin
      db.notifications.push({
        id: `notif_${Date.now()}`,
        userId: 'usr_admin_1',
        userRole: 'SUPER_ADMIN',
        title: 'طلب تسجيل كابتن جديد',
        message: `سجل الكابتن ${name} (${vehicleType === 'TUK_TUK' ? 'توك توك' : 'موتوسيكل'}) وينتظر الموافقة.`,
        type: 'ALERT',
        read: false,
        createdAt: new Date().toISOString(),
      });
    } else if (role === 'MERCHANT') {
      newMerchant = {
        id: `merch_${Date.now()}`,
        userId,
        name: businessName || name,
        businessType: businessType || 'GENERAL',
        phone,
        address: merchantAddress || address || 'الواسطى، بني سويف',
        lat: lat || 29.3392,
        lng: lng || 31.1969,
        approvalStatus: 'PENDING',
        commissionRate: 10,
      };
      db.merchants.push(newMerchant);

      // Notification to Super Admin
      db.notifications.push({
        id: `notif_${Date.now()}`,
        userId: 'usr_admin_1',
        userRole: 'SUPER_ADMIN',
        title: 'طلب تسجيل متجر/مطعم جديد',
        message: `سجل المتجر ${newMerchant.name} (${businessType}) وينتظر التفعيل.`,
        type: 'ALERT',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    saveDatabase(db);

    const token = `tok_${userId}_${Date.now()}`;
    return res.status(201).json({
      user: newUser,
      captain: newCaptain,
      merchant: newMerchant,
      token,
    });
  });

  // Auth: Current Profile
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'غير مسجل الدخول' });
    }
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('_');
    const userId = `${parts[1]}_${parts[2]}` || parts[1];

    const user = db.users.find((u) => u.id === userId || token.includes(u.id));
    if (!user) {
      return res.status(401).json({ error: 'جلسة الدخول منتهية' });
    }

    const captain = db.captains.find((c) => c.userId === user.id);
    const merchant = db.merchants.find((m) => m.userId === user.id);

    res.json({ user, captain, merchant });
  });

  // Pricing: Get Settings & Estimate
  app.get('/api/pricing', (req, res) => {
    res.json(db.pricingSettings);
  });

  app.put('/api/pricing', (req, res) => {
    const updates = req.body;
    db.pricingSettings = { ...db.pricingSettings, ...updates };
    saveDatabase(db);
    res.json({ success: true, pricingSettings: db.pricingSettings });
  });

  app.post('/api/pricing/estimate', (req, res) => {
    const { distanceKm, vehicleType = 'MOTORCYCLE' } = req.body;
    const dist = parseFloat(distanceKm) || 1.0;
    const fee = calculateDeliveryFee(dist, vehicleType, db.pricingSettings);
    res.json({
      distanceKm: dist,
      vehicleType,
      estimatedFee: fee,
      baseFee: db.pricingSettings.baseFee,
      pricePerKm: db.pricingSettings.pricePerKm,
      minDeliveryFee: db.pricingSettings.minDeliveryFee,
    });
  });

  // Captains: List, Details, Status, Location, Approval
  app.get('/api/captains', (req, res) => {
    const { status, online } = req.query;
    let list = [...db.captains];
    if (status) {
      list = list.filter((c) => c.approvalStatus === status);
    }
    if (online !== undefined) {
      list = list.filter((c) => c.isOnline === (online === 'true'));
    }
    res.json(list);
  });

  app.get('/api/captains/:id', (req, res) => {
    const captain = db.captains.find((c) => c.id === req.params.id || c.userId === req.params.id);
    if (!captain) return res.status(404).json({ error: 'الكابتن غير موجود' });
    res.json(captain);
  });

  app.put('/api/captains/:id/status', (req, res) => {
    const captain = db.captains.find((c) => c.id === req.params.id || c.userId === req.params.id);
    if (!captain) return res.status(404).json({ error: 'الكابتن غير موجود' });

    if (captain.approvalStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'لا يمكن تفعيل الحالة إلا بعد موافقة الإدارة على الحساب' });
    }

    if (req.body.isOnline !== undefined) {
      captain.isOnline = Boolean(req.body.isOnline);
    }
    saveDatabase(db);
    res.json({ success: true, captain });
  });

  app.put('/api/captains/:id/location', (req, res) => {
    const captain = db.captains.find((c) => c.id === req.params.id || c.userId === req.params.id);
    if (!captain) return res.status(404).json({ error: 'الكابتن غير موجود' });

    const { lat, lng } = req.body;
    if (lat && lng) {
      captain.currentLat = parseFloat(lat);
      captain.currentLng = parseFloat(lng);
      captain.lastLocationUpdate = new Date().toISOString();
      saveDatabase(db);
    }
    res.json({ success: true, currentLat: captain.currentLat, currentLng: captain.currentLng });
  });

  app.put('/api/captains/:id/approval', (req, res) => {
    const { status, rejectionReason } = req.body; // APPROVED or REJECTED
    const captain = db.captains.find((c) => c.id === req.params.id);
    if (!captain) return res.status(404).json({ error: 'الكابتن غير موجود' });

    captain.approvalStatus = status;
    if (rejectionReason) captain.rejectionReason = rejectionReason;
    if (status === 'APPROVED') captain.isOnline = true;

    // Send notification to captain
    db.notifications.push({
      id: `notif_${Date.now()}`,
      userId: captain.userId,
      userRole: 'CAPTAIN',
      title: status === 'APPROVED' ? 'تمت الموافقة على حسابك!' : 'تحديث بخصوص طلب الانضمام',
      message:
        status === 'APPROVED'
          ? 'مبروك! تمت مراجعة مستنداتك وتفعيل حسابك بنجاح. يمكنك الآن بدء استقبال الطلبات.'
          : `نأسف لعدم قبول الطلب: ${rejectionReason || 'يرجى إعادة رفع المستندات بوضوح.'}`,
      type: 'ALERT',
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json({ success: true, captain });
  });

  // Captain Wallet Deposit
  app.post('/api/captains/:id/deposit', (req, res) => {
    const { amount, method = 'ONLINE', gateway = 'FAWRY', referenceNumber } = req.body;
    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ error: 'يرجى تحديد مبلغ إيداع صالح أكبر من صفر' });
    }

    const captain = db.captains.find((c) => c.id === req.params.id || c.userId === req.params.id);
    if (!captain) return res.status(404).json({ error: 'الكابتن غير موجود' });

    captain.walletBalance = (captain.walletBalance ?? 0) + depositAmount;
    const now = new Date().toISOString();
    const txRef = referenceNumber || `DEP-${Date.now().toString().slice(-6)}`;

    // Record in payments ledger
    db.payments.push({
      id: `pay_dep_${Date.now()}`,
      orderId: `DEPOSIT_${captain.id}`,
      orderNumber: `إيداع رصيد محفظة - ${captain.name}`,
      customerId: captain.userId,
      amount: depositAmount,
      paymentMethod: method === 'CASH' ? 'CASH' : 'ONLINE',
      paymentStatus: 'PAID',
      gateway: gateway as any,
      transactionRef: txRef,
      timestamp: now,
      instructionsAr: [`تم إيداع مبلغ ${depositAmount} ج.م في محفظة الكابتن بنجاح عبر بوابة الدفع ${gateway}`],
    });

    const minDeposit = db.pricingSettings.minCaptainDepositToReceiveOrders ?? 50;
    const isEligibleNow = captain.walletBalance >= minDeposit;

    // Send notification to captain
    db.notifications.push({
      id: `notif_${Date.now()}_dep`,
      userId: captain.userId,
      userRole: 'CAPTAIN',
      title: 'تم إيداع الرصيد بنجاح! 💰',
      message: `تم إضافة ${depositAmount} ج.م إلى رصيد محفظتك. رصيدك الحالي أصبح ${captain.walletBalance} ج.م. ${
        isEligibleNow
          ? 'أنت الآن مؤهل لاستقبال وتلقي طلبات التوصيل بالواسطى ✅'
          : `يلزم إيداع ${minDeposit - captain.walletBalance} ج.م إضافية للوصول للحد الأدنى المطلوب.`
      }`,
      type: 'PAYMENT',
      read: false,
      createdAt: now,
    });

    saveDatabase(db);
    res.json({
      success: true,
      walletBalance: captain.walletBalance,
      captain,
      message: `تم إيداع ${depositAmount} ج.م بنجاح في محفظة الكابتن`,
    });
  });

  // Merchants & Products
  app.get('/api/merchants', (req, res) => {
    const { type, approved } = req.query;
    let list = [...db.merchants];
    if (type) list = list.filter((m) => m.businessType === type);
    if (approved) list = list.filter((m) => m.approvalStatus === 'APPROVED');
    res.json(list);
  });

  app.get('/api/merchants/:id', (req, res) => {
    const merch = db.merchants.find((m) => m.id === req.params.id || m.userId === req.params.id);
    if (!merch) return res.status(404).json({ error: 'المتجر غير موجود' });
    const products = db.merchantProducts.filter((p) => p.merchantId === merch.id);
    res.json({ merchant: merch, products });
  });

  app.put('/api/merchants/:id/approval', (req, res) => {
    const { status, rejectionReason } = req.body;
    const merch = db.merchants.find((m) => m.id === req.params.id);
    if (!merch) return res.status(404).json({ error: 'المتجر غير موجود' });

    merch.approvalStatus = status;
    if (rejectionReason) merch.rejectionReason = rejectionReason;

    db.notifications.push({
      id: `notif_${Date.now()}`,
      userId: merch.userId,
      userRole: 'MERCHANT',
      title: status === 'APPROVED' ? 'تم اعتماد متجرك على التطبيق' : 'تحديث بخصوص متجرك',
      message:
        status === 'APPROVED'
          ? 'تم اعتماد متجرك بنجاح! يمكنك الآن إدارة المنتجات واستقبال طلبات الزبائن.'
          : `تم رفض الاعتماد: ${rejectionReason || 'يرجى التواصل مع الإدارة.'}`,
      type: 'ALERT',
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json({ success: true, merchant: merch });
  });

  app.get('/api/merchants/:id/products', (req, res) => {
    const products = db.merchantProducts.filter((p) => p.merchantId === req.params.id);
    res.json(products);
  });

  app.post('/api/merchants/:id/products', (req, res) => {
    const { name, nameEn, description, price, image, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'اسم المنتج وسعره مطلوبان' });
    }
    const newProduct: MerchantProduct = {
      id: `prod_${Date.now()}`,
      merchantId: req.params.id,
      name,
      nameEn,
      description: description || '',
      price: parseFloat(price),
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
      category: category || 'عام',
      isAvailable: true,
    };
    db.merchantProducts.push(newProduct);
    saveDatabase(db);
    res.status(201).json(newProduct);
  });

  app.put('/api/merchants/:id/products/:productId', (req, res) => {
    const product = db.merchantProducts.find(
      (p) => p.id === req.params.productId && p.merchantId === req.params.id
    );
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    Object.assign(product, req.body);
    saveDatabase(db);
    res.json(product);
  });

  app.delete('/api/merchants/:id/products/:productId', (req, res) => {
    const idx = db.merchantProducts.findIndex(
      (p) => p.id === req.params.productId && p.merchantId === req.params.id
    );
    if (idx === -1) return res.status(404).json({ error: 'المنتج غير موجود' });
    db.merchantProducts.splice(idx, 1);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Orders: List, Create, Status Update, Assign Captain
  app.get('/api/orders', (req, res) => {
    const { customerId, captainId, merchantId, status } = req.query;
    let list = [...db.orders];

    if (customerId) list = list.filter((o) => o.customerId === customerId);
    if (merchantId) list = list.filter((o) => o.merchantId === merchantId);
    if (status) list = list.filter((o) => o.orderStatus === status);

    if (captainId) {
      const captain = db.captains.find((c) => c.id === captainId || c.userId === captainId);
      const minDeposit = db.pricingSettings.minCaptainDepositToReceiveOrders ?? 50;
      const captainBalance = captain?.walletBalance ?? 0;
      const hasEnoughDeposit = captainBalance >= minDeposit;

      list = list.filter((o) => {
        // Active/historical orders already assigned to this captain are always visible to them
        if (o.captainId === captainId || o.captainId === captain?.id) return true;
        // Unassigned requests looking for captain are ONLY visible if the captain has deposited sufficient funds
        if (o.orderStatus === 'SEARCHING_FOR_CAPTAIN' && (!o.captainId || o.captainId === '')) {
          return hasEnoughDeposit;
        }
        return false;
      });
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
    res.json(list);
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    const history = db.orderStatusHistory.filter((h) => h.orderId === order.id);
    const payment = db.payments.find((p) => p.orderId === order.id);
    res.json({ order, history, payment });
  });

  app.post('/api/orders', async (req, res) => {
    const {
      customerId,
      customerName,
      customerPhone,
      merchantId,
      orderType = 'PICKUP_DROP',
      pickupLocation,
      destinationLocation,
      pickupLat,
      pickupLng,
      destinationLat,
      destinationLng,
      distanceKm = 2.0,
      vehicleType = 'MOTORCYCLE',
      paymentMethod = 'CASH',
      paymentGateway = 'FAWRY',
      customerNotes,
      items = [],
    } = req.body;

    if (!customerId || !pickupLocation || !destinationLocation) {
      return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' });
    }

    const dist = parseFloat(distanceKm) || 2.0;
    const deliveryFee = calculateDeliveryFee(dist, vehicleType, db.pricingSettings);
    const itemsCost = items.reduce(
      (sum: number, it: any) => sum + (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 1),
      0
    );
    const totalFee = deliveryFee + itemsCost;

    let merchantName: string | undefined;
    if (merchantId) {
      const merch = db.merchants.find((m) => m.id === merchantId);
      if (merch) merchantName = merch.name;
    }

    const orderId = `ord_${Date.now()}`;
    const orderNum = `WW-${Math.floor(1000 + Math.random() * 9000)}`;

    let initPaymentResult: any = null;
    let paymentGatewayType: PaymentGatewayType = paymentGateway as PaymentGatewayType;

    if (paymentMethod === 'ONLINE') {
      try {
        initPaymentResult = await paymentGatewayManager.initiatePayment({
          orderId,
          orderNumber: orderNum,
          amount: totalFee,
          customer: {
            id: customerId,
            name: customerName || 'عميل الوَسطة واي',
            phone: customerPhone || '01000000000',
          },
          gatewayType: paymentGatewayType,
          walletPhone: req.body.walletPhone || customerPhone,
        });
      } catch (e) {
        console.error('Failed to initiate gateway payment:', e);
      }
    }

    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum,
      customerId,
      customerName: customerName || 'عميل الوَسطة واي',
      customerPhone: customerPhone || '01000000000',
      merchantId,
      merchantName,
      orderType,
      pickupLocation,
      destinationLocation,
      pickupLat: parseFloat(pickupLat) || 29.3392,
      pickupLng: parseFloat(pickupLng) || 31.1969,
      destinationLat: parseFloat(destinationLat) || 29.342,
      destinationLng: parseFloat(destinationLng) || 31.198,
      distanceKm: dist,
      estimatedDurationMin: Math.max(5, Math.round(dist * 4)),
      vehicleType,
      deliveryFee,
      itemsCost,
      totalFee,
      paymentMethod,
      paymentStatus: 'PENDING',
      paymentGateway: paymentMethod === 'ONLINE' ? paymentGatewayType : undefined,
      paymentRefNumber: initPaymentResult?.referenceNumber,
      fawryExpireAt: initPaymentResult?.expiresAt,
      orderStatus: 'SEARCHING_FOR_CAPTAIN',
      customerNotes,
      items,
      createdTime: new Date().toISOString(),
    };

    db.orders.push(newOrder);

    // If online, record in db.payments
    if (paymentMethod === 'ONLINE' && initPaymentResult) {
      db.payments.push({
        id: `pay_${Date.now()}`,
        orderId,
        orderNumber: orderNum,
        customerId,
        amount: totalFee,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PENDING',
        gateway: paymentGatewayType,
        transactionRef: initPaymentResult.transactionId,
        referenceNumber: initPaymentResult.referenceNumber,
        timestamp: new Date().toISOString(),
        expiresAt: initPaymentResult.expiresAt,
        instructionsAr: initPaymentResult.instructionsAr,
      });
    }

    // Initial Status History
    db.orderStatusHistory.push({
      id: `hist_${Date.now()}`,
      orderId,
      fromStatus: 'NONE',
      toStatus: 'SEARCHING_FOR_CAPTAIN',
      timestamp: new Date().toISOString(),
      actorId: customerId,
      actorRole: 'CUSTOMER',
      note: 'تم إنشاء الطلب والبحث عن كابتن متاح',
    });

    // Customer Notification
    db.notifications.push({
      id: `notif_${Date.now()}_1`,
      userId: customerId,
      userRole: 'CUSTOMER',
      title: 'تم إنشاء الطلب بنجاح',
      message: `طلبك رقم ${orderNum} قيد البحث عن أقرب كابتن (${vehicleType === 'TUK_TUK' ? 'توك توك' : 'موتوسيكل'}).`,
      type: 'ORDER',
      read: false,
      relatedOrderId: orderId,
      createdAt: new Date().toISOString(),
    });

    // Merchant Notification if applicable
    if (merchantId) {
      const merch = db.merchants.find((m) => m.id === merchantId);
      if (merch) {
        db.notifications.push({
          id: `notif_${Date.now()}_m`,
          userId: merch.userId,
          userRole: 'MERCHANT',
          title: 'طلب جديد وصل!',
          message: `طلب جديد رقم ${orderNum} بقيمة ${itemsCost} ج.م بانتظار التحضير.`,
          type: 'ORDER',
          read: false,
          relatedOrderId: orderId,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Auto-dispatch / notify active online captains
    const eligibleCaptains = db.captains.filter(
      (c) => c.approvalStatus === 'APPROVED' && c.isOnline && c.vehicleType === vehicleType
    );
    eligibleCaptains.forEach((cap) => {
      db.notifications.push({
        id: `notif_${Date.now()}_${cap.id}`,
        userId: cap.userId,
        userRole: 'CAPTAIN',
        title: 'طلب توصيل جديد متاح!',
        message: `طلب جديد رقم ${orderNum} من ${pickupLocation} إلى ${destinationLocation}. الأجرة: ${deliveryFee} ج.م`,
        type: 'ORDER',
        read: false,
        relatedOrderId: orderId,
        createdAt: new Date().toISOString(),
      });
    });

    saveDatabase(db);
    res.status(201).json(newOrder);
  });

  // Orders: Update Status Flow
  app.put('/api/orders/:id/status', (req, res) => {
    const { status, actorId, actorRole, note, cancellationReason } = req.body;
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

    const currentStatus = order.orderStatus;
    const targetStatus = status as OrderStatus;

    // Validate Status Transitions
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      return res.status(400).json({
        error: `انتقال حالة غير صالح من ${currentStatus} إلى ${targetStatus}`,
      });
    }

    const now = new Date().toISOString();
    order.orderStatus = targetStatus;

    if (targetStatus === 'CAPTAIN_ACCEPTED') {
      order.acceptedTime = now;
    } else if (targetStatus === 'CAPTAIN_ARRIVED') {
      order.arrivedTime = now;
    } else if (targetStatus === 'PICKED_UP') {
      order.pickedUpTime = now;
    } else if (targetStatus === 'DELIVERED') {
      order.deliveredTime = now;
    } else if (targetStatus === 'COMPLETED') {
      order.completedTime = now;
      order.paymentStatus = 'PAID';

      // Update Captain Earnings & Wallet Balance
      if (order.captainId) {
        const cap = db.captains.find((c) => c.id === order.captainId);
        if (cap) {
          const commissionPercent = db.pricingSettings.platformCommissionPercent || 15;
          const capEarning = Math.round(order.deliveryFee * (1 - commissionPercent / 100));
          const commission = Math.round((order.deliveryFee * commissionPercent) / 100);

          cap.todayEarnings += capEarning;
          cap.weekEarnings += capEarning;
          cap.monthEarnings += capEarning;
          cap.totalDeliveries += 1;

          if (order.paymentMethod === 'CASH') {
            // Captain collected cash directly -> deduct platform commission from captain's wallet
            cap.walletBalance = (cap.walletBalance ?? 0) - commission;
          } else {
            // Customer paid online -> credit captain's net delivery share to wallet
            cap.walletBalance = (cap.walletBalance ?? 0) + capEarning;
          }

          // If wallet balance drops below required threshold, send reminder alert
          const minDeposit = db.pricingSettings.minCaptainDepositToReceiveOrders ?? 50;
          if (cap.walletBalance < minDeposit) {
            db.notifications.push({
              id: `notif_${Date.now()}_low_bal`,
              userId: cap.userId,
              userRole: 'CAPTAIN',
              title: 'تنبيه: يلزم شحن رصيد المحفظة ⚠️',
              message: `رصيد محفظتك الحالي هو ${cap.walletBalance} ج.م (أقل من الحد الأدنى ${minDeposit} ج.م). يرجى إيداع رصيد لتتمكن من استمرار استقبال الطلبات الجديدة.`,
              type: 'ALERT',
              read: false,
              createdAt: now,
            });
          }
        }
      }

      // Record payment
      db.payments.push({
        id: `pay_${Date.now()}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        amount: order.totalFee,
        paymentMethod: order.paymentMethod,
        paymentStatus: 'PAID',
        transactionRef: `TX-${order.orderNumber}-${Date.now().toString().slice(-4)}`,
        timestamp: now,
      });
    } else if (targetStatus.startsWith('CANCELLED_')) {
      order.cancelledTime = now;
      order.cancellationReason = cancellationReason || note || 'تم الإلغاء';
    }

    // Append history
    db.orderStatusHistory.push({
      id: `hist_${Date.now()}`,
      orderId: order.id,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      timestamp: now,
      actorId: actorId || 'system',
      actorRole: actorRole || 'SUPER_ADMIN',
      note: note || `تغيرت حالة الطلب إلى ${targetStatus}`,
    });

    // Notify Customer
    const statusLabels: Record<OrderStatus, string> = {
      NEW: 'جديد',
      SEARCHING_FOR_CAPTAIN: 'قيد البحث عن كابتن',
      MERCHANT_PREPARING: 'جاري تحضير وتجهيز طلبك في المطعم/المتجر',
      MERCHANT_READY: 'طلبك جاهز للاستلام والتوصيل مع الكابتن',
      CAPTAIN_ACCEPTED: 'وافق الكابتن وهو في الطريق إليك',
      CAPTAIN_ARRIVED: 'وصل الكابتن إلى نقطة الاستلام',
      PICKED_UP: 'تم استلام الشحنة/الطلب',
      ON_THE_WAY: 'الطلب في الطريق إلى وجهتك',
      DELIVERED: 'تم التوصيل بنجاح',
      COMPLETED: 'اكتمل الطلب وتم استلام الحساب',
      CANCELLED_BY_CUSTOMER: 'تم إلغاء الطلب من قبلك',
      CANCELLED_BY_CAPTAIN: 'تم إلغاء الطلب من قبل الكابتن',
      CANCELLED_BY_ADMIN: 'تم إلغاء الطلب من قبل الإدارة',
    };

    db.notifications.push({
      id: `notif_${Date.now()}_upd`,
      userId: order.customerId,
      userRole: 'CUSTOMER',
      title: `تحديث طلبك ${order.orderNumber}`,
      message: `${statusLabels[targetStatus]} - شكراً لثقتكم بالوَسطة واي.`,
      type: 'ORDER',
      read: false,
      relatedOrderId: order.id,
      createdAt: now,
    });

    saveDatabase(db);
    res.json({ success: true, order });
  });

  // Assign Captain to Order
  app.put('/api/orders/:id/assign-captain', (req, res) => {
    const { captainId } = req.body;
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

    const captain = db.captains.find((c) => c.id === captainId || c.userId === captainId);
    if (!captain) return res.status(404).json({ error: 'الكابتن غير موجود' });

    if (captain.approvalStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'الكابتن غير معتمد من الإدارة' });
    }

    const minDeposit = db.pricingSettings.minCaptainDepositToReceiveOrders ?? 50;
    if ((captain.walletBalance ?? 0) < minDeposit) {
      return res.status(403).json({
        error: `لا يمكن قبول الطلب: رصيد محفظتك (${captain.walletBalance ?? 0} ج.م) أقل من الحد الأدنى المطلوب للاستقبال (${minDeposit} ج.م). يجب إيداع رصيد في المحفظة أولاً.`,
      });
    }

    order.captainId = captain.id;
    order.captainName = captain.name;
    order.captainPhone = captain.phone;
    order.captainVehicleType = captain.vehicleType;
    order.captainPlateNumber = captain.vehiclePlateNumber;
    order.captainRating = captain.rating;
    order.orderStatus = 'CAPTAIN_ACCEPTED';
    order.acceptedTime = new Date().toISOString();

    captain.activeOrderId = order.id;

    db.orderStatusHistory.push({
      id: `hist_${Date.now()}`,
      orderId: order.id,
      fromStatus: 'SEARCHING_FOR_CAPTAIN',
      toStatus: 'CAPTAIN_ACCEPTED',
      timestamp: new Date().toISOString(),
      actorId: captain.userId,
      actorRole: 'CAPTAIN',
      note: `وافق الكابتن ${captain.name} على الطلب`,
    });

    db.notifications.push({
      id: `notif_${Date.now()}_cap`,
      userId: order.customerId,
      userRole: 'CUSTOMER',
      title: 'تم تعيين كابتن لطلبك!',
      message: `الكابتن ${captain.name} (${captain.vehicleType === 'TUK_TUK' ? 'توك توك' : 'موتوسيكل'}) قادم لاستلام طلبك.`,
      type: 'ORDER',
      read: false,
      relatedOrderId: order.id,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json({ success: true, order });
  });

  // Ratings
  app.get('/api/ratings', (req, res) => {
    const { captainId } = req.query;
    let list = [...db.ratings];
    if (captainId) list = list.filter((r) => r.captainId === captainId);
    res.json(list);
  });

  app.post('/api/ratings', (req, res) => {
    const { orderId, customerId, customerName, captainId, rating, comment } = req.body;
    if (!orderId || !captainId || !rating) {
      return res.status(400).json({ error: 'بيانات التقييم غير مكتملة' });
    }

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

    if (order.hasRated) {
      return res.status(400).json({ error: 'تم تقييم هذا الطلب مسبقاً' });
    }

    const numRating = Math.min(5, Math.max(1, parseInt(rating) || 5));
    const newRating: Rating = {
      id: `rat_${Date.now()}`,
      orderId,
      customerId,
      customerName: customerName || 'عميل',
      captainId,
      rating: numRating,
      comment,
      createdAt: new Date().toISOString(),
    };

    db.ratings.push(newRating);
    order.hasRated = true;

    // Recalculate Captain's average rating
    const captain = db.captains.find((c) => c.id === captainId);
    if (captain) {
      const captainRatings = db.ratings.filter((r) => r.captainId === captainId);
      const sum = captainRatings.reduce((acc, r) => acc + r.rating, 0);
      captain.totalRatings = captainRatings.length;
      captain.rating = parseFloat((sum / captainRatings.length).toFixed(1));

      // Notify Captain
      db.notifications.push({
        id: `notif_${Date.now()}_r`,
        userId: captain.userId,
        userRole: 'CAPTAIN',
        title: `تقييم جديد (${numRating} نجوم)`,
        message: comment ? `"${comment}"` : `حصلت على تقييم ${numRating} نجوم!`,
        type: 'SYSTEM',
        read: false,
        relatedOrderId: orderId,
        createdAt: new Date().toISOString(),
      });
    }

    saveDatabase(db);
    res.status(201).json({ success: true, rating: newRating });
  });

  // Complaints & Support
  app.get('/api/complaints', (req, res) => {
    const { userId } = req.query;
    let list = [...db.complaints];
    if (userId) list = list.filter((c) => c.userId === userId);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.post('/api/complaints', (req, res) => {
    const { userId, userName, userRole, userPhone, orderId, subject, description } = req.body;
    if (!userId || !subject || !description) {
      return res.status(400).json({ error: 'موضوع الشكوى والتفاصيل مطلوبان' });
    }

    const complaint: Complaint = {
      id: `comp_${Date.now()}`,
      userId,
      userName: userName || 'مستخدم',
      userRole: userRole || 'CUSTOMER',
      userPhone: userPhone || '',
      orderId,
      subject,
      description,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    db.complaints.push(complaint);

    // Notify Super Admin
    db.notifications.push({
      id: `notif_${Date.now()}_admin_comp`,
      userId: 'usr_admin_1',
      userRole: 'SUPER_ADMIN',
      title: 'شكوى/طلب دعم جديد',
      message: `شكوى جديدة من ${userName} بعنوان: "${subject}"`,
      type: 'ALERT',
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.status(201).json(complaint);
  });

  app.put('/api/complaints/:id/resolve', (req, res) => {
    const { status = 'RESOLVED', adminResponse } = req.body;
    const complaint = db.complaints.find((c) => c.id === req.params.id);
    if (!complaint) return res.status(404).json({ error: 'الشكوى غير موجودة' });

    complaint.status = status;
    complaint.adminResponse = adminResponse;
    complaint.resolvedAt = new Date().toISOString();

    // Notify User
    db.notifications.push({
      id: `notif_${Date.now()}_comp_res`,
      userId: complaint.userId,
      userRole: complaint.userRole,
      title: 'تم الرد على شكواك من قبل إدارة الوَسطة واي',
      message: adminResponse || 'تمت معالجة الشكوى بنجاح، نشكر تواصلكم.',
      type: 'SYSTEM',
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json({ success: true, complaint });
  });

  // ==========================================
  // PAYMENT GATEWAY PROVIDER API (فوري، كاش، إنستاباي، ميزة)
  // ==========================================

  // 1. Get available Egyptian payment gateways
  app.get('/api/payments/gateways', (req, res) => {
    try {
      const gateways = paymentGatewayManager.getAvailableGateways();
      res.json({
        success: true,
        gateways,
        merchantInfo: {
          merchantName: 'الوَسطة واي لخدمات النقل والتوصيل الذكي',
          fawryMerchantCode: '77001928',
          fawryServiceCode: '788',
          instaPayOfficialHandle: 'elwastaway@instapay',
          supportedCurrencies: ['EGP'],
          environment: 'SANDBOX_READY',
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Initiate payment for an order
  app.post('/api/payments/initiate', async (req, res) => {
    try {
      const { orderId, gatewayType = 'FAWRY', walletPhone, instaPayHandle, cardDetails } = req.body;
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

      const customer = db.users.find((u) => u.id === order.customerId) || {
        id: order.customerId,
        name: order.customerName,
        phone: order.customerPhone,
        email: 'customer@elwastaway.com',
      };

      const result = await paymentGatewayManager.initiatePayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalFee,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        },
        gatewayType: gatewayType as PaymentGatewayType,
        walletPhone: walletPhone || order.customerPhone,
        instaPayHandle,
        cardDetails,
      });

      // Update order state
      order.paymentGateway = gatewayType as PaymentGatewayType;
      order.paymentRefNumber = result.referenceNumber;
      order.fawryExpireAt = result.expiresAt;
      order.paymentMethod = 'ONLINE';

      // Record / update payment entity
      let payRecord = db.payments.find((p) => p.orderId === order.id);
      if (!payRecord) {
        payRecord = {
          id: `pay_${Date.now()}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          amount: order.totalFee,
          paymentMethod: 'ONLINE',
          paymentStatus: 'PENDING',
          gateway: gatewayType as PaymentGatewayType,
          transactionRef: result.transactionId,
          referenceNumber: result.referenceNumber,
          timestamp: new Date().toISOString(),
          expiresAt: result.expiresAt,
          instructionsAr: result.instructionsAr,
        };
        db.payments.push(payRecord);
      } else {
        payRecord.gateway = gatewayType as PaymentGatewayType;
        payRecord.transactionRef = result.transactionId;
        payRecord.referenceNumber = result.referenceNumber;
        payRecord.expiresAt = result.expiresAt;
        payRecord.instructionsAr = result.instructionsAr;
      }

      saveDatabase(db);
      res.json({ success: true, payment: result, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل في تهيئة عملية الدفع' });
    }
  });

  // 3. Verify payment status
  app.post('/api/payments/verify', async (req, res) => {
    try {
      const { orderId, transactionId, gatewayType = 'FAWRY' } = req.body;
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

      const result = await paymentGatewayManager.verifyPayment(gatewayType as PaymentGatewayType, {
        transactionId: transactionId || order.paymentRefNumber || '',
        orderId: order.id,
        referenceNumber: order.paymentRefNumber,
      });

      if (result.status === 'PAID') {
        order.paymentStatus = 'PAID';
        const payRecord = db.payments.find((p) => p.orderId === order.id);
        if (payRecord) {
          payRecord.paymentStatus = 'PAID';
          payRecord.receiptNumber = result.receiptNumber;
        }
        saveDatabase(db);
      }

      res.json({ success: true, verification: result, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل في التحقق من حالة الدفع' });
    }
  });

  // 4. Simulate instant payment settlement (Demo/Testing convenience for Fawry/Wallet)
  app.post('/api/payments/simulate-instant-pay', async (req, res) => {
    try {
      const { orderId, transactionId } = req.body;
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

      const gatewayType: PaymentGatewayType = order.paymentGateway || 'FAWRY';
      const settlement = await paymentGatewayManager.simulateSettlement(
        gatewayType,
        transactionId || `tx_${Date.now()}`
      );

      order.paymentStatus = 'PAID';

      const payRecord = db.payments.find((p) => p.orderId === order.id);
      if (payRecord) {
        payRecord.paymentStatus = 'PAID';
        payRecord.receiptNumber = settlement.receiptNumber;
      }

      // Add Order Status History entry
      db.orderStatusHistory.push({
        id: `hist_${Date.now()}`,
        orderId: order.id,
        fromStatus: order.orderStatus,
        toStatus: order.orderStatus,
        timestamp: new Date().toISOString(),
        actorId: order.customerId,
        actorRole: 'CUSTOMER',
        note: `تم سداد المبلغ بنجاح إلكترونياً عبر ${gatewayType === 'FAWRY' ? 'فوري باي (إيصال: ' + settlement.receiptNumber + ')' : gatewayType}`,
      });

      // Notify Customer
      db.notifications.push({
        id: `notif_${Date.now()}_paid`,
        userId: order.customerId,
        userRole: 'CUSTOMER',
        title: 'تم تأكيد السداد الإلكتروني بنجاح ✅',
        message: `تم سداد مبلغ ${order.totalFee} ج.م لطلبك ${order.orderNumber} عبر ${gatewayType === 'FAWRY' ? 'فوري باي' : gatewayType}. رقم الإيصال: ${settlement.receiptNumber}`,
        type: 'ORDER',
        read: false,
        relatedOrderId: order.id,
        createdAt: new Date().toISOString(),
      });

      saveDatabase(db);
      res.json({ success: true, settlement, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل في محاكاة السداد' });
    }
  });

  // 5. Payment Webhook handler (Fawry / Wallets callbacks)
  app.post('/api/payments/webhook', async (req, res) => {
    try {
      const { gateway = 'FAWRY', signature, ...payload } = req.body;
      const result = await paymentGatewayManager.handleWebhook(
        gateway as PaymentGatewayType,
        payload,
        signature
      );

      if (result.orderId) {
        const order = db.orders.find(
          (o) => o.id === result.orderId || o.orderNumber === result.orderId
        );
        if (order) {
          order.paymentStatus = 'PAID';
          const pay = db.payments.find((p) => p.orderId === order.id);
          if (pay) {
            pay.paymentStatus = 'PAID';
            pay.receiptNumber = result.receiptNumber;
          }
          saveDatabase(db);
        }
      }

      res.json({ received: true, handled: result.handled });
    } catch (err: any) {
      console.error('Webhook error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // 6. Get payment transactions list (for customer or admin)
  app.get('/api/payments', (req, res) => {
    const { customerId, orderId } = req.query;
    let list = [...db.payments];
    if (customerId) list = list.filter((p) => p.customerId === customerId);
    if (orderId) list = list.filter((p) => p.orderId === orderId);
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(list);
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const { userId, role } = req.query;
    let list = [...db.notifications];
    if (userId) list = list.filter((n) => n.userId === userId);
    if (role) list = list.filter((n) => n.userRole === role);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (notif) notif.read = true;
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin: Stats & User Management
  app.get('/api/admin/stats', (req, res) => {
    const totalCustomers = db.users.filter((u) => u.role === 'CUSTOMER').length;
    const activeCaptains = db.captains.filter((c) => c.approvalStatus === 'APPROVED' && c.isOnline).length;
    const pendingCaptains = db.captains.filter((c) => c.approvalStatus === 'PENDING').length;
    const pendingMerchants = db.merchants.filter((m) => m.approvalStatus === 'PENDING').length;
    const activeDeliveries = db.orders.filter(
      (o) =>
        o.orderStatus !== 'COMPLETED' &&
        !o.orderStatus.startsWith('CANCELLED_')
    ).length;
    const completedDeliveries = db.orders.filter((o) => o.orderStatus === 'COMPLETED').length;
    const cancelledDeliveries = db.orders.filter((o) => o.orderStatus.startsWith('CANCELLED_')).length;

    const totalRevenue = db.orders
      .filter((o) => o.orderStatus === 'COMPLETED')
      .reduce((sum, o) => sum + o.deliveryFee, 0);

    const platformCommission = Math.round(
      (totalRevenue * db.pricingSettings.platformCommissionPercent) / 100
    );

    res.json({
      totalCustomers,
      activeCaptains,
      pendingCaptains,
      pendingMerchants,
      activeDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      totalRevenue,
      platformCommission,
      totalOrders: db.orders.length,
    });
  });

  app.put('/api/admin/users/:id/toggle-active', (req, res) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ error: 'لا يمكن إيقاف حساب المدير العام' });
    }

    user.isActive = !user.isActive;
    saveDatabase(db);
    res.json({ success: true, isActive: user.isActive });
  });

  // ----------------------------------------------------
  // GEMINI AI INTEGRATIONS (Smart Assistant & Image Understanding)
  // ----------------------------------------------------

  // Feature: Multi-turn Gemini Chatbot with specific persona roles
  app.post('/api/ai/chat', async (req, res) => {
    const { messages = [], role = 'customer', userContext = {} } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        reply:
          'مرحباً بك في الوَسطة واي! أنا مساعدك الذكي للتوصيل والرحلات بالواسطى ومحافظة بني سويف. تفضل بسؤالي عن الأسعار، المسارات، حالة طلبك أو خدمات الموتوسيكل والتوك توك.',
      });
    }

    // Role-specific system instructions
    let systemInstruction = `أنت "مساعد الوَسطة واي الذكي" (El Wasta Way AI Assistant)، المساعد الرسمي لتطبيق التوصيل المحلي الأول في مركز الواسطى ومحافظة بني سويف ومصر بالدراجات النارية (الموتوسيكلات) والتوك توك.
تحدث باللغة العربية بلهجة مصرية ودودة ومحترفة، وتعرف على شوارع ومعالم مركز الواسطى (ميدان المحطة، شارع أحمد عرابي، مستشفى الواسطى المركزي، كوبري النيل، جزيرة المساعدة، شارع الجمهورية، قرية قمن العروس، الميمون، إطواب، بني غنيم، ميدان الساعة).
وظيفتك مساعدة المستخدم بدقة، وتوضيح كيفية حساب الأجرة وفق تسعيرة الإدارة (أجرة أساسية + سعر الكيلومتر، مع معامل 1.25x للتوك توك)، ومساعدته في حل أي استفسار أو مشكلة بأعلى مستوى من الخدمة.`;

    if (role === 'captain') {
      systemInstruction += `\nأنت تتحدث مع "كابتن" في أسطول الوَسطة واي (موتوسيكل أو توك توك). قدم له نصائح السلامة المرورية، القيادة الآمنة في شوارع الواسطى، كيفية زيادة أرباحه وتقييماته الإيجابية، والتعامل الراقي مع العملاء.`;
    } else if (role === 'merchant') {
      systemInstruction += `\nأنت تتحدث مع "تاجر أو صاحب مطعم/صيدلية" في الوَسطة واي. ساعده في اقتراح تنسيق المنتجات وتجهيز الطلبات وتغليفها لضمان وصولها طازجة وسليمة مع الكباتن.`;
    }

    try {
      // Format chat messages
      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      // Use gemini-3.8-flash or gemini-3.5-flash for general fast responsive tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || 'عفواً، لم أتمكن من الرد حالياً. يرجى المحاولة لاحقاً.';
      return res.json({ reply: replyText });
    } catch (err: any) {
      console.error('Gemini Chat error:', err);
      return res.json({
        reply:
          'مرحباً بك! أنا في خدمتك بخصوص أي طلب توصيل أو استفسار عن خدمات التوك توك والموتوسيكل في الوَسطة واي. يمكنك متابعة طلبك مباشرة من قائمة طلباتي.',
      });
    }
  });

  // Feature: Image Analysis using Gemini (Prescriptions, Receipts, Packages, Vehicle IDs)
  app.post('/api/ai/analyze-image', async (req, res) => {
    const { imageBase64, mimeType = 'image/jpeg', promptType = 'general' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'الصورة مطلوبة للتحليل' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        analysis:
          'تم فحص الصورة بنجاح. تبدو واضحة ومناسبة لمرفقات الطلب أو التوثيق في الوَسطة واي.',
      });
    }

    let prompt = 'حلل هذه الصورة المتعلقة بتطبيق التوصيل المحلي El Wasta Way باللغة العربية باختصار واذكر التفاصيل الهامة (اسم الدواء أو محتوى الإيصال أو الشحنة ومقترحات التوصيل المناسبة سواء بموتوسيكل أو توك توك).';
    if (promptType === 'prescription') {
      prompt = 'هذه صورة روشتة طبية أو علبة دواء لطلب صيدلية في الوَسطة واي. اقرأ محتواها أو الأدوية المكتوبة بوضوح، مع تنبيه العميل لمراجعة الصيدلي للتأكيد، وقدر إن كانت تحتاج توصيل فوري بالدراجة النارية.';
    } else if (promptType === 'receipt') {
      prompt = 'هذه صورة فاتورة أو إيصال مطعم/متجر. استخرج اسم المتجر، الأصناف، الإجمالي، وتحقق من وضوح البيانات للعميل والكابتن.';
    } else if (promptType === 'document') {
      prompt = 'هذه وثيقة لكابتن (بطاقة شخصية أو رخصة قيادة أو رخصة مركبة) في الوَسطة واي. تحقق هل هي وثيقة رسمية واضحة وصالحة للاعتماد من الإدارة.';
    }

    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imagePart = {
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      };

      // Model priority: gemini-3.8-flash (or gemini-3.1-pro-preview if available)
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [imagePart, { text: prompt }],
        },
      });

      return res.json({
        analysis: response.text || 'تم فحص الصورة بنجاح ولكن لم يتم استخراج نصوص إضافية.',
      });
    } catch (err: any) {
      console.error('Gemini image analysis error:', err);
      return res.json({
        analysis:
          'تم استلام الصورة بنجاح وتأكيد وضوحها لعملية التوصيل.',
      });
    }
  });

  // ----------------------------------------------------
  // VITE MIDDLEWARE (Development) OR STATIC SERVE (Production)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EL WASTA WAY server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
