// models/care_wh_pharmacy_order_items.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_pharmacy_order_items = sequelize.define('care_wh_pharmacy_order_items', {
    id:                 { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    order_id:           { type: DataTypes.INTEGER,     allowNull: false },
    product_id:         { type: DataTypes.INTEGER,     allowNull: false },
    quantity_requested: { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
    quantity_issued:    { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
    batch_number:       { type: DataTypes.STRING(100), allowNull: true },
    expiry_date:        { type: DataTypes.DATEONLY,    allowNull: true },
    status:             { type: DataTypes.STRING(20),  allowNull: false, defaultValue: 'pending' },
    notes:              { type: DataTypes.TEXT,        allowNull: true },
  }, { tableName: 'care_wh_pharmacy_order_items', timestamps: false });
  care_wh_pharmacy_order_items.associate = (models) => {
    care_wh_pharmacy_order_items.belongsTo(models.care_wh_pharmacy_orders, { foreignKey: 'order_id', as: 'order' });
    care_wh_pharmacy_order_items.belongsTo(models.care_wh_products, { foreignKey: 'product_id', as: 'product' });
  };
  return care_wh_pharmacy_order_items;
};
