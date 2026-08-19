// models/care_wh_rfq.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_rfq = sequelize.define('care_wh_rfq', {
    rfq_id:      { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    rfq_number:  { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    status:      { type: DataTypes.STRING(25), allowNull: false, defaultValue: 'draft' },
    expiry_date: { type: DataTypes.DATEONLY,   allowNull: true },
    created_by:  { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    approved_by: { type: DataTypes.STRING(60), allowNull: true },
    approved_at: { type: DataTypes.DATE,       allowNull: true },
    sent_at:     { type: DataTypes.DATE,       allowNull: true },
    notes:       { type: DataTypes.TEXT,       allowNull: true },
    create_time: { type: DataTypes.DATE,       allowNull: false, defaultValue: DataTypes.NOW },
    modify_time: { type: DataTypes.DATE,       allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'care_wh_rfq', timestamps: false });

  care_wh_rfq.associate = (models) => {
    care_wh_rfq.hasMany(models.care_wh_rfq_items,            { foreignKey: 'rfq_id', as: 'items' });
    care_wh_rfq.hasMany(models.care_wh_rfq_supplier_quotes,  { foreignKey: 'rfq_id', as: 'quotes' });
    care_wh_rfq.hasMany(models.care_wh_purchase_orders,      { foreignKey: 'rfq_id', as: 'purchaseOrders' });
  };
  return care_wh_rfq;
};
