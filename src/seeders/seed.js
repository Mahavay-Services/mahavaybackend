require('dotenv').config();
const { sequelize, User, Service } = require('../models');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    await sequelize.sync({ force: true });
    console.log('Tables created');

    const adminPassword = await bcrypt.hash('Admin@123', 12);
    
    const users = await User.bulkCreate([
      {
        full_name: 'Super Admin',
        email: 'admin@satyacrm.com',
        phone: '9999999999',
        password_hash: adminPassword,
        role: 'super_admin',
        employee_id: 'ADM0001',
        department: 'Administration',
        position: 'System Administrator',
        join_date: new Date(),
        is_active: true
      },
      {
        full_name: 'Rahul Sharma',
        email: 'rahul@satyacrm.com',
        phone: '9876543210',
        password_hash: adminPassword,
        role: 'sales',
        employee_id: 'SAL0001',
        department: 'Sales',
        position: 'Business Development Manager',
        join_date: new Date(),
        is_active: true
      },
      {
        full_name: 'Priya Singh',
        email: 'priya@satyacrm.com',
        phone: '9876543211',
        password_hash: adminPassword,
        role: 'sales',
        employee_id: 'SAL0002',
        department: 'Sales',
        position: 'Business Development Manager',
        join_date: new Date(),
        is_active: true
      },
      {
        full_name: 'Amit Kumar',
        email: 'amit@satyacrm.com',
        phone: '9876543212',
        password_hash: adminPassword,
        role: 'accounts',
        employee_id: 'ACC0001',
        department: 'Accounts',
        position: 'Accounts Executive',
        join_date: new Date(),
        is_active: true
      },
      {
        full_name: 'Neha Gupta',
        email: 'neha@satyacrm.com',
        phone: '9876543213',
        password_hash: adminPassword,
        role: 'legal',
        employee_id: 'LEG0001',
        department: 'Legal',
        position: 'Legal Executive',
        join_date: new Date(),
        is_active: true
      },
      {
        full_name: 'Vikram Patel',
        email: 'vikram@satyacrm.com',
        phone: '9876543214',
        password_hash: adminPassword,
        role: 'ops_manager',
        employee_id: 'OPS0001',
        department: 'Operations',
        position: 'Operations Manager',
        join_date: new Date(),
        is_active: true
      },
      {
        full_name: 'Sanjay Verma',
        email: 'sanjay@satyacrm.com',
        phone: '9876543215',
        password_hash: adminPassword,
        role: 'ops_member',
        employee_id: 'OPS0002',
        department: 'Operations',
        position: 'Operations Executive',
        join_date: new Date(),
        is_active: true
      }
    ], { individualHooks: false });

    console.log(`Created ${users.length} users`);

    const services = await Service.bulkCreate([
      {
        service_name: 'Private Limited Company Registration',
        service_code: 'PVT-REG',
        category: 'Company Registration',
        description: 'Complete private limited company registration with MCA',
        default_price: 15000.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'LLP Registration',
        service_code: 'LLP-REG',
        category: 'Company Registration',
        description: 'Limited Liability Partnership registration',
        default_price: 12000.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'One Person Company Registration',
        service_code: 'OPC-REG',
        category: 'Company Registration',
        description: 'OPC registration for single entrepreneurs',
        default_price: 10000.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'GST Registration',
        service_code: 'GST-REG',
        category: 'Tax & Compliance',
        description: 'GST registration and GSTIN allocation',
        default_price: 3000.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'GST Return Filing',
        service_code: 'GST-RET',
        category: 'Tax & Compliance',
        description: 'Monthly/Quarterly GST return filing',
        default_price: 1500.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'Income Tax Return Filing',
        service_code: 'ITR-FILE',
        category: 'Tax & Compliance',
        description: 'Annual income tax return filing',
        default_price: 2500.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'Trademark Registration',
        service_code: 'TM-REG',
        category: 'Intellectual Property',
        description: 'Trademark application and registration',
        default_price: 8000.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'MSME/Udyam Registration',
        service_code: 'MSME-REG',
        category: 'Registrations',
        description: 'MSME/Udyam certificate registration',
        default_price: 1500.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'Import Export Code',
        service_code: 'IEC-REG',
        category: 'Registrations',
        description: 'IEC code registration for import/export',
        default_price: 5000.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'Annual Compliance Package',
        service_code: 'ANN-COMP',
        category: 'Compliance',
        description: 'Complete annual compliance for private limited',
        default_price: 25000.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'Accounting & Bookkeeping',
        service_code: 'ACC-BOOK',
        category: 'Accounting',
        description: 'Monthly accounting and bookkeeping services',
        default_price: 5000.00,
        gst_percentage: 18.00,
        is_active: true
      },
      {
        service_name: 'Payroll Processing',
        service_code: 'PAY-PROC',
        category: 'HR & Payroll',
        description: 'Monthly payroll processing and compliance',
        default_price: 3000.00,
        gst_percentage: 18.00,
        is_active: true
      }
    ]);

    console.log(`Created ${services.length} services`);

    console.log('\n✓ Database seeded successfully!');
    console.log('\nDefault Login Credentials:');
    console.log('Email: admin@satyacrm.com');
    console.log('Password: Admin@123');
    console.log('\nAll users have password: Admin@123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
