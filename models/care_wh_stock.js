// models/care_wh_stock.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_stock = sequelize.define('care_wh_stock', {
    stock_id:     { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    product_id:   { type: DataTypes.INTEGER,     allowNull: false },
    location_id:  { type: DataTypes.INTEGER,     allowNull: true  },
    batch_number: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    lot_number:   { type: DataTypes.STRING(100), allowNull: true },
    expiry_date:  { type: DataTypes.DATEONLY,    allowNull: false },
    quantity:     { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
    shelved_at:   { type: DataTypes.DATE,        allowNull: true },
    shelved_by:   { type: DataTypes.STRING(60),  allowNull: true },
  }, { tableName: 'care_wh_stock', timestamps: false });
  care_wh_stock.associate = (models) => {
    care_wh_stock.belongsTo(models.care_wh_products, { foreignKey: 'product_id', as: 'product' });
    care_wh_stock.belongsTo(models.care_wh_locations, { foreignKey: 'location_id', as: 'location' });
  };
  return care_wh_stock;
};


