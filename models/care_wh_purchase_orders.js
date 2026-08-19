// models/care_wh_purchase_orders.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_purchase_orders = sequelize.define('care_wh_purchase_orders', {
    po_id:                  { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
    po_number:              { type: DataTypes.STRING(30),    allowNull: false, defaultValue: '' },
    rfq_id:                 { type: DataTypes.INTEGER,       allowNull: true  },
    supplier_id:            { type: DataTypes.INTEGER,       allowNull: false },
    status:                 { type: DataTypes.STRING(25),    allowNull: false, defaultValue: 'draft' },
    is_paid:                { type: DataTypes.TINYINT,       allowNull: false, defaultValue: 0 },
    paid_amount:            { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0.00 },
    paid_at:                { type: DataTypes.DATE,          allowNull: true },
    created_by:             { type: DataTypes.STRING(60),    allowNull: false, defaultValue: '' },
    director_approved_by:   { type: DataTypes.STRING(60),    allowNull: true },
    director_approved_at:   { type: DataTypes.DATE,          allowNull: true },
    finance_approved_by:    { type: DataTypes.STRING(60),    allowNull: true },
    finance_approved_at:    { type: DataTypes.DATE,          allowNull: true },
    manager_approved_by:    { type: DataTypes.STRING(60),    allowNull: true },
    manager_approved_at:    { type: DataTypes.DATE,          allowNull: true },
    sent_at:                { type: DataTypes.DATE,          allowNull: true },
    expected_delivery_date: { type: DataTypes.DATEONLY,      allowNull: true },
    total_amount:           { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0.00 },
    notes:                  { type: DataTypes.TEXT,          allowNull: true },
    create_time:            { type: DataTypes.DATE,          allowNull: false, defaultValue: DataTypes.NOW },
    modify_time:            { type: DataTypes.DATE,          allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'care_wh_purchase_orders', timestamps: false });

  care_wh_purchase_orders.associate = (models) => {
    care_wh_purchase_orders.belongsTo(models.care_wh_suppliers,     { foreignKey: 'supplier_id', as: 'supplier' });
    care_wh_purchase_orders.belongsTo(models.care_wh_rfq,           { foreignKey: 'rfq_id',      as: 'rfq', constraints: false });
    care_wh_purchase_orders.hasMany(models.care_wh_po_items,        { foreignKey: 'po_id',       as: 'items' });
    care_wh_purchase_orders.hasMany(models.care_wh_deliveries,      { foreignKey: 'po_id',       as: 'deliveries' });
    care_wh_purchase_orders.hasMany(models.care_wh_reimbursement_requests, { foreignKey: 'po_id', as: 'reimbursements' });
  };
  return care_wh_purchase_orders;
};
