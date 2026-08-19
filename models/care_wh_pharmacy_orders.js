
// models/care_wh_pharmacy_orders.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_pharmacy_orders = sequelize.define('care_wh_pharmacy_orders', {
    order_id:      { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    order_number:  { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    pharmacy_unit_id: { type: DataTypes.INTEGER, allowNull: true },
    requested_by:  { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    requested_at:  { type: DataTypes.DATE,       allowNull: false },
    status:        { type: DataTypes.STRING(25), allowNull: false, defaultValue: 'pending' },
    approved_by:   { type: DataTypes.STRING(60), allowNull: true },
    approved_at:   { type: DataTypes.DATE,       allowNull: true },
    collected_by:  { type: DataTypes.STRING(60), allowNull: true },
    collected_at:  { type: DataTypes.DATE,       allowNull: true },
    notes:         { type: DataTypes.TEXT,       allowNull: true },
  }, {
    tableName: 'care_wh_pharmacy_orders',
    timestamps: false,
    indexes: [
      { name: 'idx_orders_unit', fields: ['pharmacy_unit_id'] },
    ],
  });
  care_wh_pharmacy_orders.associate = (models) => {
    care_wh_pharmacy_orders.hasMany(models.care_wh_pharmacy_order_items, { foreignKey: 'order_id', as: 'items' });
  };
  return care_wh_pharmacy_orders;
};


