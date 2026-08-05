module.exports = {
  development: {
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "startup_support_crm",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: console.log,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 60000,
      evict: 120000,
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  },
};
