// models/care_wh_delivery_items.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_delivery_items = sequelize.define('care_wh_delivery_items', {
    id:                  { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    delivery_id:         { type: DataTypes.INTEGER,    allowNull: false },
    po_item_id:          { type: DataTypes.INTEGER,    allowNull: false },
    product_id:          { type: DataTypes.INTEGER,    allowNull: false },
    quantity_delivered:  { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 },
    batch_number:        { type: DataTypes.STRING(100),allowNull: true },
    lot_number:          { type: DataTypes.STRING(100),allowNull: true },
    expiry_date:         { type: DataTypes.DATEONLY,   allowNull: false },
    manufacture_date:    { type: DataTypes.DATEONLY,   allowNull: true },
    qc_status:           { type: DataTypes.STRING(20),  allowNull: false, defaultValue: 'pending' },
    stock_id:            { type: DataTypes.INTEGER,     allowNull: true },
  }, { tableName: 'care_wh_delivery_items', timestamps: false });
  care_wh_delivery_items.associate = (models) => {
    care_wh_delivery_items.belongsTo(models.care_wh_deliveries, { foreignKey: 'delivery_id', as: 'delivery' });
    care_wh_delivery_items.belongsTo(models.care_wh_po_items, { foreignKey: 'po_item_id', as: 'poItem' });
    care_wh_delivery_items.belongsTo(models.care_wh_products, { foreignKey: 'product_id', as: 'product' });
    care_wh_delivery_items.hasMany(models.care_wh_quality_checks, { foreignKey: 'delivery_item_id', as: 'qcChecks' });
    care_wh_delivery_items.belongsTo(models.care_wh_stock, { foreignKey: 'stock_id', as: 'stock', constraints: false });
  };
  return care_wh_delivery_items;
};


